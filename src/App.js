import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════
   SUAREZ — Life & Business Management App
   Connected to Supabase
   ═══════════════════════════════════════════════════════════ */

const supabase = createClient(
  "https://bkezvsjhaepgvsvfywhk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZXp2c2poYWVwZ3ZzdmZ5d2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODI3NzEsImV4cCI6MjA4OTg1ODc3MX0.jGhMvXHUHfLnD2ka53pjnQ7XE_qMhj2GoLLfR58vmL0"
);

/* ─── HELPERS ───────────────────────────────────────────── */

const fmtUserName = (email) => {
  if (!email) return "—";
  if (!email.includes("@")) return email;
  const local = email.split("@")[0];
  return local.split(/[._-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtCurrency = (v) => {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
};

const fmtCurrencyExact = (v) => {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

const QUARTERS = {
  Q1: { label: "Q1 · Jan – Mar", months: ["January", "February", "March"] },
  Q2: { label: "Q2 · Apr – Jun", months: ["April", "May", "June"] },
  Q3: { label: "Q3 · Jul – Sep", months: ["July", "August", "September"] },
  Q4: { label: "Q4 · Oct – Dec", months: ["October", "November", "December"] },
};

const getCurrentQuarter = () => {
  const m = new Date().getMonth();
  if (m < 3) return "Q1";
  if (m < 6) return "Q2";
  if (m < 9) return "Q3";
  return "Q4";
};

/* ─── GLOBAL STYLES ─────────────────────────────────────── */

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; -webkit-text-size-adjust: 100%; }
    body { margin: 0; overscroll-behavior: none; }
    @media screen and (max-width: 768px) {
      input, select, textarea { font-size: 16px !important; }
      .sz-page { padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px)) !important; }
    }
    input::placeholder { color: #8A9B91; }
    .sz-input:focus { border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22,163,74,0.12) !important; outline: none; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(22,163,74,0.15); } 50% { box-shadow: 0 0 40px rgba(22,163,74,0.3); } }
    @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,15px) scale(0.95); } }
    @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-25px,20px) scale(1.08); } 66% { transform: translate(15px,-25px) scale(0.92); } }
  `}</style>
);

/* ─── COMMON COMPONENTS ─────────────────────────────────── */

const SuarezLogo = ({ size = 34 }) => (
  <img src="/Favicon.png" alt="Suarez" style={{ width: size, height: size, borderRadius: size * 0.22, objectFit: "cover", flexShrink: 0 }} />
);

const PageHeader = ({ title, subtitle, isMobile, children }) => (
  <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: isMobile ? "14px 16px" : "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
    <div>
      <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
      {subtitle && <p style={{ fontSize: isMobile ? 11 : 12, color: "#94a3b8", margin: "3px 0 0", fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

const StatCard = ({ label, value, accent }) => (
  <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "14px 14px 0 0" }} />
    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{value}</div>
  </div>
);

const SectionHeader = ({ text }) => (
  <h3 style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
    {text} <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
  </h3>
);

const DashboardCards = ({ isMobile, monthIncome, monthExpenses, totalMonthlyObligations, portfolioValue, assets, accounts, reLoanBalances, scopeFilter }) => {
  const tvCalc = portfolioValue + assets.filter(scopeFilter).reduce((s, a) => s + Number(a.estimated_value || 0), 0);
  const tdCalc = reLoanBalances;
  const netWorth = tvCalc - tdCalc;
  const totalExp = monthExpenses + totalMonthlyObligations;
  const netIncome = monthIncome - totalExp;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        <StatCard label="Monthly Income" value={fmtCurrency(monthIncome)} accent="#16a34a" />
        <StatCard label="Monthly Expenses" value={fmtCurrency(totalExp)} accent="#dc2626" />
        <StatCard label="Total Value" value={fmtCurrency(tvCalc)} accent="#3b82f6" />
        <StatCard label="Total Debt" value={fmtCurrency(tdCalc)} accent="#f97316" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: netWorth >= 0 ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #dc2626, #b91c1c)", borderRadius: "14px 14px 0 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>Net Worth</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: netWorth >= 0 ? "#16a34a" : "#dc2626", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{fmtCurrency(netWorth)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: netIncome >= 0 ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #dc2626, #b91c1c)", borderRadius: "14px 14px 0 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>Net Income</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: netIncome >= 0 ? "#3b82f6" : "#dc2626", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{fmtCurrency(netIncome)}</div>
        </div>
      </div>
    </>
  );
};

const QuarterPicker = ({ selected, onChange }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Object.keys(QUARTERS).map((q) => (
      <button key={q} onClick={() => onChange(q)} style={{
        padding: "6px 14px", borderRadius: 7, border: `1px solid ${selected === q ? "#16a34a" : "#e2e8f0"}`,
        background: selected === q ? "#f0fdf4" : "transparent",
        color: selected === q ? "#16a34a" : "#94a3b8",
        fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", cursor: "pointer", transition: "all 0.15s",
      }}>{q}</button>
    ))}
  </div>
);

const GreenButton = ({ children, onClick, small, disabled, style: extraStyle }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? "#94a3b8" : "linear-gradient(135deg, #16a34a, #15803d)", border: "none",
    borderRadius: small ? 8 : 10, padding: small ? "9px 18px" : "12px 28px",
    color: "#fff", fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 6,
    boxShadow: disabled ? "none" : "0 2px 10px rgba(22,163,74,0.35)", whiteSpace: "nowrap", ...extraStyle,
  }}>{children}</button>
);

const VisibilityBadge = ({ visibility }) => {
  const isBiz = visibility === "business";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace",
      padding: "3px 8px", borderRadius: 6,
      background: isBiz ? "#f0fdf4" : "#faf5ff", color: isBiz ? "#16a34a" : "#7c3aed",
      border: `1px solid ${isBiz ? "#bbf7d0" : "#e9d5ff"}`,
    }}>{isBiz ? "BUSINESS" : "PERSONAL"}</span>
  );
};

const Spinner = ({ size = 36 }) => (
  <div style={{ width: size, height: size, border: `3px solid #e2e8f0`, borderTop: `3px solid #16a34a`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
);

/* ─── ICONS ─────────────────────────────────────────────── */

const Icons = {
  plus: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>,
  upload: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  wallet: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"/><path d="M16 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="currentColor"/></svg>,
  chart: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  grid: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  gear: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  check: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={3} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  clock: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  x: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  menu: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  signout: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  file: <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth={1.5}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  trash: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  car: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 0 0-2 2v1h4v-1a2 2 0 0 0-2-2zm14 0a2 2 0 0 0-2 2v1h4v-1a2 2 0 0 0-2-2z"/></svg>,
  edit: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  link: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  dollar: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  trending: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  pieChart: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
  netWorth: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>,
  briefcase: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  book: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  shield: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  home: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  receipt: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  clipboardList: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  calendar: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  star: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  heart: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  command: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><line x1="6.5" y1="5" x2="6.5" y2="8"/><line x1="5" y1="6.5" x2="8" y2="6.5"/></svg>,
  leaf: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 22c-4-4-8-7.5-8-12C4 5.5 7.5 2 12 2s8 3.5 8 8c0 4.5-4 8-8 12z"/><path d="M12 2v10"/><path d="M8 8c2 1 4 2 4 4"/><path d="M16 8c-2 1-4 2-4 4"/></svg>,
  sprout: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 22V12"/><path d="M8 12c0-4 4-8 4-10 0 2 4 6 4 10"/><path d="M5 18c0-3.5 3.1-6.4 7-7"/><path d="M19 18c0-3.5-3.1-6.4-7-7"/></svg>,
};

/* ═══════════════════════════════════════════════════════════
   AUTH SCREEN
   ═══════════════════════════════════════════════════════════ */

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageLoaded, setPageLoaded] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);
  const [hoverGoogle, setHoverGoogle] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => { setTimeout(() => setPageLoaded(true), 100); }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name || undefined } },
    });
    if (error) { setError(error.message); }
    else { setSuccess("Check your email for a confirmation link!"); }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) { setError(error.message); }
    else { setSuccess("Password reset link sent to your email."); }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const switchMode = (m) => { setMode(m); setError(""); setSuccess(""); setEmail(""); setPassword(""); setName(""); };

  const inputStyle = { width: "100%", padding: "13px 16px", fontSize: 15, fontFamily: "'DM Sans', sans-serif", border: "1.5px solid #DCE4DF", borderRadius: 10, outline: "none", transition: "all 0.2s", background: "#fff", color: "#1A2E22", boxSizing: "border-box" };

  const formContent = (
    <div>
      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "#DC2626", fontFamily: "'DM Sans', sans-serif", animation: "fadeUp 0.3s ease" }}>{error}</div>}
      {success && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "#0B3D2C", fontFamily: "'DM Sans', sans-serif", animation: "fadeUp 0.3s ease" }}>{success}</div>}

      {mode === "signup" && (
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A5E52", marginBottom: 6 }}>Full name</label>
          <input className="sz-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Javier Suarez" style={inputStyle} />
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A5E52", marginBottom: 6 }}>Email address</label>
        <input className="sz-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
      </div>

      {mode !== "forgot" && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#4A5E52" }}>Password</label>
            {mode === "login" && <button onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", fontSize: 13, color: "#0B3D2C", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer", padding: 0 }}>Forgot?</button>}
          </div>
          <input className="sz-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && !loading && (mode === "login" ? handleLogin() : handleSignup())} style={inputStyle} />
        </div>
      )}

      <button
        onClick={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot}
        disabled={loading}
        onMouseEnter={() => setHoverBtn(true)} onMouseLeave={() => setHoverBtn(false)}
        style={{
          width: "100%", padding: "14px 20px", marginTop: 24,
          background: loading ? "#0E4D37" : hoverBtn ? "#0E4D37" : "#0B3D2C", color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transform: hoverBtn && !loading ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hoverBtn && !loading ? "0 6px 20px rgba(11,61,44,0.35)" : "0 2px 8px rgba(11,61,44,0.15)",
        }}
      >
        {loading && <svg width={18} height={18} viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}><circle cx={12} cy={12} r={10} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={3} /><path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" /></svg>}
        {mode === "login" ? (loading ? "Signing in..." : "Sign in") : mode === "signup" ? (loading ? "Creating account..." : "Create account") : (loading ? "Sending..." : "Send reset link")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
        <div style={{ flex: 1, height: 1, background: "#E8ECE9" }} />
        <span style={{ fontSize: 11, color: "#8A9B91", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "#E8ECE9" }} />
      </div>

      <button onClick={handleGoogleLogin} onMouseEnter={() => setHoverGoogle(true)} onMouseLeave={() => setHoverGoogle(false)} style={{
        width: "100%", padding: "13px 20px", background: hoverGoogle ? "#F1F5F3" : "#fff",
        border: `1.5px solid ${hoverGoogle ? "#B8C4BC" : "#DCE4DF"}`, borderRadius: 10, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "#1A2E22", transition: "all 0.2s",
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </button>

      <div style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: isMobile ? "rgba(255,255,255,0.5)" : "#8A9B91", fontFamily: "'DM Sans', sans-serif" }}>
        {mode === "login" && <>Don't have an account? <button onClick={() => switchMode("signup")} style={{ background: "none", border: "none", color: isMobile ? "#22C55E" : "#0B3D2C", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: 0 }}>Create account</button></>}
        {mode === "signup" && <>Already have an account? <button onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: isMobile ? "#22C55E" : "#0B3D2C", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: 0 }}>Sign in</button></>}
        {mode === "forgot" && <button onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: isMobile ? "#22C55E" : "#0B3D2C", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: 0 }}>← Back to sign in</button>}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(170deg, #051E15 0%, #0B3D2C 40%, #0E4D37 80%, #0A3425 100%)", backgroundSize: "200% 200%", animation: "gradientShift 12s ease infinite", padding: "0 0 40px" }}>
        <div style={{ position: "relative", zIndex: 1, padding: "48px 28px 0", textAlign: "center", opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? "translateY(0)" : "translateY(16px)", transition: "all 0.7s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
            <SuarezLogo size={32} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#fff" }}>SUAREZ</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 600, color: "#fff", lineHeight: 1.15 }}>Your business & life, <span style={{ color: "#22C55E" }}>one place</span></h1>
        </div>
        <div style={{ position: "relative", zIndex: 1, margin: "28px 20px 0", padding: "28px 24px 32px", background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s ease 0.3s" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, color: "#1A2E22", margin: "0 0 6px" }}>{mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}</h2>
          <p style={{ fontSize: 14, color: "#8A9B91", margin: "0 0 24px" }}>{mode === "login" ? "Sign in to manage your world." : mode === "signup" ? "Get started with Suarez." : "We'll send you a reset link."}</p>
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#F8FAF9", overflow: "hidden" }}>
      <div style={{ flex: "0 0 50%", position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #051E15 0%, #0B3D2C 35%, #0E4D37 70%, #0A3425 100%)", backgroundSize: "200% 200%", animation: "gradientShift 12s ease infinite", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 56px" }}>
        <div style={{ position: "absolute", top: -100, right: -60, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%)", pointerEvents: "none", animation: "float1 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 65%)", pointerEvents: "none", animation: "float2 10s ease-in-out infinite" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 11, opacity: pageLoaded ? 1 : 0, transition: "all 0.6s ease" }}>
          <SuarezLogo />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>SUAREZ</span>
        </div>
        <div style={{ position: "relative", zIndex: 1, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s ease 0.2s" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 600, color: "#fff", lineHeight: 1.12, letterSpacing: "-0.025em" }}>Your business &<br/>personal life,<br/><span style={{ color: "#22C55E" }}>one place</span></h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginTop: 18, maxWidth: 380 }}>Track financials, manage accounts, upload statements, and keep everything organized across business and personal.</p>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>© 2026 Suarez</div>
      </div>
      <div style={{ flex: "0 0 50%", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 56px" }}>
        <div style={{ width: "100%", maxWidth: 420, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? "translateY(0)" : "translateY(16px)", transition: "all 0.7s ease 0.4s" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 600, color: "#1A2E22", margin: "0 0 8px" }}>{mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}</h2>
          <p style={{ fontSize: 15, color: "#8A9B91", margin: "0 0 36px" }}>{mode === "login" ? "Sign in to manage your world." : mode === "signup" ? "Get started with Suarez." : "We'll send you a reset link."}</p>
          {formContent}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE VIEW
   ═══════════════════════════════════════════════════════════ */

function ProfileView({ session, isMobile, onSignOut }) {
  const [profileTab, setProfileTab] = useState("profile");
  const user = session?.user || {};
  const email = user.email || "—";
  const fullName = user.user_metadata?.full_name || "";
  const displayName = fullName || fmtUserName(email);
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const createdAt = fmtDate(user.created_at);
  const provider = user.app_metadata?.provider || "email";

  const Row = ({ icon, label, value, action, actionLabel, danger }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: danger ? "#fef2f2" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
        </div>
      </div>
      {action && <button onClick={action} style={{ background: danger ? "#fef2f2" : "#f8fafc", border: `1px solid ${danger ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: danger ? "#dc2626" : "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{actionLabel}</button>}
    </div>
  );

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Profile & Settings" subtitle="Account information" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px", maxWidth: 640 }}>
        <TabBar tabs={tabs} active={profileTab} onChange={setProfileTab} isMobile={isMobile} />
        {profileTab === "profile" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "24px 20px" : "28px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(135deg, #16a34a, #15803d)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #16a34a, #15803d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 12px rgba(22,163,74,0.3)", flexShrink: 0 }}>{initials}</div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: 0 }}>{displayName}</h2>
                  <p style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif", margin: "2px 0 0" }}>{email}</p>
                  <span style={{ display: "inline-block", marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace", padding: "3px 8px", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>OWNER</span>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "4px 20px" : "4px 28px", marginBottom: 20 }}>
              <Row icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>} label="Email" value={email} />
              <Row icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} label="Sign-in Method" value={provider === "google" ? "Google OAuth" : "Email & Password"} />
              <Row icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} label="Member Since" value={createdAt} />
            </div>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "4px 20px" : "4px 28px" }}>
              <Row icon={Icons.signout} label="Sign Out" value="End your current session" action={onSignOut} actionLabel="Sign Out" danger />
            </div>
          </div>
        )}
        {profileTab === "settings" && <SettingsView isMobile={isMobile} session={session} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW
   ═══════════════════════════════════════════════════════════ */

function OverviewView({ isMobile, session, accounts, uploads, assets, transactions, investments, lifeExpenses, homes, utilityBills, policies, monthlyBills, onNavigate }) {
  const [dashScope, setDashScope] = useState("all");
  const userName = session?.user?.user_metadata?.full_name || fmtUserName(session?.user?.email) || "there";
  const firstName = userName.split(" ")[0];
  const quarter = getCurrentQuarter();
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const thisMonth = now.toISOString().slice(0, 7);

  const scopeFilter = (item) => dashScope === "all" || (item.visibility || "personal") === dashScope;

  const portfolioValue = investments.filter(scopeFilter).reduce((s, i) => {
    if (i.asset_type === "Real Estate" || i.asset_type === "Business Equity") return s + Number(i.current_price || 0);
    return s + Number(i.shares || 0) * Number(i.current_price || 0);
  }, 0);
  const monthTxnIncome = transactions.filter((t) => t.type === "income" && t.date?.startsWith(thisMonth)).filter(scopeFilter).reduce((s, t) => s + Number(t.amount), 0);
  const reMonthlyIncome = investments.filter((i) => i.asset_type === "Real Estate").reduce((s, i) => s + Number(i.monthly_income || 0), 0);
  const bizMonthlyIncome = investments.filter((i) => i.asset_type === "Business Equity").reduce((s, i) => s + Number(i.monthly_income || 0), 0);
  const monthIncome = monthTxnIncome + reMonthlyIncome + bizMonthlyIncome;
  const monthTxnExpenses = transactions.filter((t) => t.type === "expense" && t.date?.startsWith(thisMonth)).filter(scopeFilter).reduce((s, t) => s + Number(t.amount), 0);
  const monthLifeExpenses = (lifeExpenses || []).filter((e) => e.date?.startsWith(thisMonth)).filter(scopeFilter).reduce((s, e) => s + Number(e.amount), 0);
  const monthExpenses = monthTxnExpenses + monthLifeExpenses;

  // Monthly obligations rollup
  const debtPayments = accounts.filter((a) => a.active && Number(a.monthly_payment) > 0).filter(scopeFilter);
  const debtTotal = debtPayments.reduce((s, a) => s + Number(a.monthly_payment), 0);
  const housingPayments = homes.filter((h) => Number(h.monthly_payment) > 0);
  const housingTotal = housingPayments.reduce((s, h) => s + Number(h.monthly_payment), 0);
  const utilityTotal = utilityBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const insuranceTotal = (policies || []).filter((p) => p.active).filter(scopeFilter).reduce((s, p) => s + Number(p.monthly_cost || 0), 0);
  const activeBills = (monthlyBills || []).filter((b) => b.active !== false).filter(scopeFilter);
  const billsTotal = activeBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const reInvestments = investments.filter((i) => i.asset_type === "Real Estate");
  const reDebtService = reInvestments.reduce((s, i) => s + Number(i.monthly_debt_service || 0), 0);
  const reMonthlyExp = reInvestments.reduce((s, i) => s + Number(i.monthly_expenses || 0), 0);
  const bizMonthlyExp = investments.filter((i) => i.asset_type === "Business Equity").reduce((s, i) => s + Number(i.monthly_expenses || 0), 0);
  const reLoanBalances = reInvestments.reduce((s, i) => s + Number(i.loan_balance || 0), 0);
  const totalMonthlyObligations = debtTotal + housingTotal + utilityTotal + insuranceTotal + billsTotal + reDebtService + reMonthlyExp + bizMonthlyExp;

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title={`${greeting}, ${firstName}`} subtitle={`${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${quarter}`} isMobile={isMobile}>
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "personal", "business"].map((s) => (
            <button key={s} onClick={() => setDashScope(s)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${dashScope === s ? "#16a34a" : "#e2e8f0"}`, background: dashScope === s ? "#f0fdf4" : "transparent", color: dashScope === s ? "#16a34a" : "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif" }}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
      </PageHeader>
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <DashboardCards isMobile={isMobile} monthIncome={monthIncome} monthExpenses={monthExpenses} totalMonthlyObligations={totalMonthlyObligations} portfolioValue={portfolioValue} assets={assets} accounts={accounts} reLoanBalances={reLoanBalances} scopeFilter={scopeFilter} />

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20 }}>
          <SectionHeader text="Quick Actions" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Finance", desc: "Money & wealth tracking", nav: "finance", icon: <span style={{ fontSize: 22 }}>💰</span> },
              { label: "Business", desc: "Entities & contacts", nav: "business", icon: <span style={{ fontSize: 22 }}>💼</span> },
              { label: "Life", desc: "Home, family & health", nav: "life", icon: <span style={{ fontSize: 22 }}>🌳</span> },
              { label: "Growth", desc: "Your growth journey", nav: "growth", icon: <span style={{ fontSize: 22 }}>🌱</span> },
            ].map((a, i) => (
              <div key={i} onClick={() => onNavigate(a.nav)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.background = "#f0fdf4"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: "#16a34a" }}>{a.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px" }}>
          <SectionHeader text="Recent Transactions" />
          {transactions.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#64748b", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, margin: "0 0 4px" }}>No transactions yet</p>
              <p style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Start tracking in Financials</p>
            </div>
          ) : transactions.slice(0, 6).map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: t.type === "income" ? "#f0fdf4" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={t.type === "income" ? "#16a34a" : "#dc2626"} strokeWidth={2.5}><polyline points={t.type === "income" ? "7 13 12 8 17 13" : "7 11 12 16 17 11"}/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{t.description}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>{t.category || "—"} · {fmtDate(t.date)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: t.type === "income" ? "#16a34a" : "#dc2626", flexShrink: 0 }}>{t.type === "income" ? "+" : "−"}{fmtCurrencyExact(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   MONEY (Tabbed: Bookkeeping, Spending, Statements, Accounts)
   ═══════════════════════════════════════════════════════════ */

const EXPENSE_CATEGORIES = ["Housing", "Utilities", "Food", "Transport", "Insurance", "Healthcare", "Entertainment", "Education", "Clothing", "Personal", "Debt Payment", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Rental", "Business", "Gift", "Refund", "Other"];
const LIFE_CATEGORIES = ["Food & Dining", "Transport", "Entertainment", "Shopping", "Health", "Travel", "Subscriptions", "Education", "Gifts", "Personal Care", "Pets", "Other"];

const TabBar = ({ tabs, active, onChange, isMobile }) => (
  <div style={{ display: "flex", gap: 2, marginBottom: 20, overflowX: "auto", padding: "0 0 4px" }}>
    {tabs.map((t) => (
      <button key={t.key} onClick={() => onChange(t.key)} style={{
        padding: isMobile ? "8px 14px" : "9px 20px", borderRadius: 8, border: `1.5px solid ${active === t.key ? "#16a34a" : "#e2e8f0"}`,
        background: active === t.key ? "#f0fdf4" : "#fff", color: active === t.key ? "#16a34a" : "#64748b",
        fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
      }}>{t.label}</button>
    ))}
  </div>
);

function MoneyView({ isMobile, activeTab, onTabChange, transactions, accounts, uploads, lifeExpenses, assets, onAddAccount, onToggleAccount, onDeleteAccount, onAddTransaction, onDeleteTransaction, onAddLifeExpense, onDeleteLifeExpense, onUpload, onDeleteUpload, nested }) {
  const tab = activeTab || "bookkeeping";
  const setTab = onTabChange;
  const tabs = [
    { key: "bookkeeping", label: "Bookkeeping" },
    { key: "spending", label: "Spending" },
    { key: "statements", label: "Statements" },
    { key: "accounts", label: "Accounts" },
  ];

  const content = (
    <>
      <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={isMobile} />
      {tab === "bookkeeping" && <BookkeepingTab isMobile={isMobile} transactions={transactions} accounts={accounts} onAdd={onAddTransaction} onDelete={onDeleteTransaction} />}
      {tab === "spending" && <PersonalSpendingTab isMobile={isMobile} lifeExpenses={lifeExpenses} onAdd={onAddLifeExpense} onDelete={onDeleteLifeExpense} />}
        {tab === "statements" && <StatementsTab isMobile={isMobile} transactions={transactions} assets={assets} accounts={accounts} />}
        {tab === "accounts" && <AccountsTab isMobile={isMobile} accounts={accounts} onAdd={onAddAccount} onToggle={onToggleAccount} onDelete={onDeleteAccount} />}
    </>
  );

  if (nested) return content;

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Money" subtitle="Day-to-day finances & bookkeeping" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {content}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEALTH (Tabbed: Portfolio, Net Worth, Assets)
   ═══════════════════════════════════════════════════════════ */

function WealthView({ isMobile, activeTab, onTabChange, investments, assets, accounts, snapshots, uploads, onAddAsset, onUpdateAsset, onDeleteAsset, onAddInvestment, onUpdateInvestment, onDeleteInvestment, onAddSnapshot, onDeleteSnapshot, onUpload, onDeleteUpload, nested }) {
  const tab = activeTab || "networth";
  const setTab = onTabChange;
  const tabs = [
    { key: "networth", label: "💰 Net Worth" },
    { key: "stocks", label: "📈 Stocks" },
    { key: "realestate", label: "🏠 Real Estate" },
    { key: "companies", label: "🏢 Companies" },
    { key: "assets", label: "🚗 Assets" },
    { key: "uploader", label: "📤 Uploader" },
  ];

  const content = (
    <>
      <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={isMobile} />
      {tab === "stocks" && <PortfolioTab isMobile={isMobile} investments={investments.filter((i) => !["Real Estate", "Business Equity"].includes(i.asset_type))} onAdd={onAddInvestment} onUpdate={onUpdateInvestment} onDelete={onDeleteInvestment} />}
      {tab === "realestate" && <RealEstateTab isMobile={isMobile} investments={investments.filter((i) => i.asset_type === "Real Estate")} onAdd={onAddInvestment} onUpdate={onUpdateInvestment} onDelete={onDeleteInvestment} />}
      {tab === "companies" && <CompaniesWealthTab isMobile={isMobile} investments={investments.filter((i) => i.asset_type === "Business Equity")} onAdd={onAddInvestment} onUpdate={onUpdateInvestment} onDelete={onDeleteInvestment} />}
      {tab === "networth" && <NetWorthTab isMobile={isMobile} assets={assets} accounts={accounts} investments={investments} snapshots={snapshots} onAddSnapshot={onAddSnapshot} onDeleteSnapshot={onDeleteSnapshot} />}
      {tab === "assets" && <AssetsTab isMobile={isMobile} assets={assets} accounts={accounts} onAdd={onAddAsset} onUpdate={onUpdateAsset} onDelete={onDeleteAsset} />}
      {tab === "uploader" && <UploaderTab isMobile={isMobile} accounts={accounts} uploads={uploads} onUpload={onUpload} onDeleteUpload={onDeleteUpload} />}
    </>
  );

  if (nested) return content;

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Wealth" subtitle="Investments, net worth & asset tracking" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {content}
      </div>
    </div>
  );
}

/* — Real Estate Tab — */
function RealEstateTab({ isMobile, investments, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { name: "", ticker: "", shares: "", purchase_price: "", current_price: "", date_purchased: "", visibility: "business", monthly_income: "", monthly_expenses: "", loan_balance: "", monthly_debt_service: "", cap_rate: "6.5", ownership_pct: "100", lender: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const mIncome = parseFloat(form.monthly_income) || 0;
    const mExpenses = parseFloat(form.monthly_expenses) || 0;
    const noi = mIncome - mExpenses;
    const capRate = parseFloat(form.cap_rate) || 0;
    const autoValue = capRate > 0 ? Math.round((noi * 12) / (capRate / 100)) : parseFloat(form.current_price) || 0;
    const payload = {
      name: form.name, asset_type: "Real Estate", ticker: form.ticker || null,
      shares: parseFloat(form.shares) || 1, purchase_price: parseFloat(form.purchase_price) || 0,
      current_price: autoValue, date_purchased: form.date_purchased || null, visibility: form.visibility,
      monthly_income: mIncome, monthly_expenses: mExpenses, loan_balance: parseFloat(form.loan_balance) || 0,
      monthly_debt_service: parseFloat(form.monthly_debt_service) || 0, cap_rate: capRate,
      ownership_pct: parseFloat(form.ownership_pct) || 100, lender: form.lender || null,
    };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };
  const startEdit = (inv) => { setForm({ name: inv.name || "", ticker: inv.ticker || "", shares: inv.shares?.toString() || "1", purchase_price: inv.purchase_price?.toString() || "", current_price: inv.current_price?.toString() || "", date_purchased: inv.date_purchased || "", visibility: inv.visibility || "business", monthly_income: inv.monthly_income?.toString() || "", monthly_expenses: inv.monthly_expenses?.toString() || "", loan_balance: inv.loan_balance?.toString() || "", monthly_debt_service: inv.monthly_debt_service?.toString() || "", cap_rate: inv.cap_rate?.toString() || "6.5", ownership_pct: inv.ownership_pct?.toString() || "100", lender: inv.lender || "" }); setEditingId(inv.id); setShowForm(true); };

  const totalValue = investments.reduce((s, i) => s + Number(i.current_price || 0), 0);
  const totalDebt = investments.reduce((s, i) => s + Number(i.loan_balance || 0), 0);
  const totalEquity = totalValue - totalDebt;
  const totalNOI = investments.reduce((s, i) => s + (Number(i.monthly_income || 0) - Number(i.monthly_expenses || 0)), 0);
  const totalDebtService = investments.reduce((s, i) => s + Number(i.monthly_debt_service || 0), 0);

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const lbl = (text) => ({ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 });

  // Live preview calculations
  const previewNOI = (parseFloat(form.monthly_income) || 0) - (parseFloat(form.monthly_expenses) || 0);
  const previewDS = parseFloat(form.monthly_debt_service) || 0;
  const previewDSCR = previewDS > 0 ? (previewNOI / previewDS).toFixed(2) : "—";
  const previewCap = parseFloat(form.cap_rate) || 0;
  const previewValuation = previewCap > 0 && previewNOI > 0 ? Math.round((previewNOI * 12) / (previewCap / 100)) : null;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Portfolio Value" value={fmtCurrency(totalValue)} accent="#16a34a" />
        <StatCard label="Total Debt" value={fmtCurrency(totalDebt)} accent="#dc2626" />
        <StatCard label="Total Equity" value={fmtCurrency(totalEquity)} accent="#3b82f6" />
        <StatCard label="Monthly NOI" value={fmtCurrency(totalNOI)} accent={totalNOI >= 0 ? "#16a34a" : "#dc2626"} />
        <StatCard label="Debt Service" value={fmtCurrency(totalDebtService)} accent="#f59e0b" />
        <StatCard label="Properties" value={investments.length} accent="#7c3aed" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Property</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Property" : "New Investment Property"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl()}>Property Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Idlewild Duplex" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Address</label><input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="e.g. 3422 W Idlewild Ave" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Units / Doors</label><input type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} placeholder="1" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Ownership %</label><input type="number" value={form.ownership_pct} onChange={(e) => setForm({ ...form, ownership_pct: e.target.value })} placeholder="100" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Purchase Price</label><input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Date Acquired</label><input type="date" value={form.date_purchased} onChange={(e) => setForm({ ...form, date_purchased: e.target.value })} style={inputStyle} className="sz-input" /></div>
          </div>
          <SectionHeader text="Income & Expenses (Monthly)" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl()}>Monthly Income</label><input type="number" step="0.01" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Monthly Expenses</label><input type="number" step="0.01" value={form.monthly_expenses} onChange={(e) => setForm({ ...form, monthly_expenses: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ fontSize: 10, color: "#16a34a", fontWeight: 700, textTransform: "uppercase" }}>Monthly NOI</div><div style={{ fontSize: 18, fontWeight: 800, color: previewNOI >= 0 ? "#16a34a" : "#dc2626", fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(previewNOI)}</div></div>
          </div>
          <SectionHeader text="Debt Service" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl()}>Loan Balance</label><input type="number" value={form.loan_balance} onChange={(e) => setForm({ ...form, loan_balance: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Monthly Payment</label><input type="number" step="0.01" value={form.monthly_debt_service} onChange={(e) => setForm({ ...form, monthly_debt_service: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Lender</label><input value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} placeholder="e.g. Navy Federal" style={inputStyle} className="sz-input" /></div>
            <div style={{ background: "#eff6ff", borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700, textTransform: "uppercase" }}>DSCR</div><div style={{ fontSize: 18, fontWeight: 800, color: parseFloat(previewDSCR) >= 1.25 ? "#16a34a" : parseFloat(previewDSCR) >= 1 ? "#f59e0b" : "#dc2626", fontFamily: "'Playfair Display', serif" }}>{previewDSCR}x</div></div>
          </div>
          <SectionHeader text="Valuation" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div><label style={lbl()}>Cap Rate %</label><input type="number" step="0.1" value={form.cap_rate} onChange={(e) => setForm({ ...form, cap_rate: e.target.value })} placeholder="6.5" style={inputStyle} className="sz-input" /></div>
            {previewValuation && <div style={{ background: "#faf5ff", borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase" }}>Auto Valuation</div><div style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed", fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(previewValuation)}</div></div>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : editingId ? "Update" : "Add Property"}</GreenButton>
          </div>
        </div>
      )}
      {investments.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Investment Properties</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Track rental properties with income, expenses, NOI, debt service, DSCR, and valuations.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add First Property</GreenButton>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {investments.map((inv) => {
            const mIncome = Number(inv.monthly_income || 0);
            const mExpenses = Number(inv.monthly_expenses || 0);
            const noi = mIncome - mExpenses;
            const ds = Number(inv.monthly_debt_service || 0);
            const dscr = ds > 0 ? (noi / ds).toFixed(2) : "—";
            const capRate = Number(inv.cap_rate || 0);
            const loanBal = Number(inv.loan_balance || 0);
            const value = Number(inv.current_price || 0);
            const equity = value - loanBal;
            const ownershipPct = Number(inv.ownership_pct || 100);
            return (
              <div key={inv.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 22px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(135deg, #16a34a, #15803d)" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏠</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{inv.name}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
                        {inv.ticker && <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{inv.ticker}</span>}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontFamily: "'DM Mono', monospace" }}>{ownershipPct}% OWNED</span>
                        {Number(inv.shares || 0) > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>{inv.shares} units</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(inv)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 10, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>{Icons.edit} Edit</button>
                    <button onClick={() => { if (window.confirm("Delete?")) onDelete(inv.id); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center" }}>{Icons.trash}</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Valuation</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#16a34a" }}>{fmtCurrency(value)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Loan Balance</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#dc2626" }}>{fmtCurrency(loanBal)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Equity</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#3b82f6" }}>{fmtCurrency(equity)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Purchased</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(inv.purchase_price)}</div></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: 10, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Mo. Income</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#16a34a" }}>{fmtCurrency(mIncome)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Mo. Expenses</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{fmtCurrency(mExpenses)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>NOI</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: noi >= 0 ? "#16a34a" : "#dc2626" }}>{fmtCurrency(noi)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Debt Service</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#f59e0b" }}>{fmtCurrency(ds)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>DSCR</div><div style={{ fontSize: 14, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: parseFloat(dscr) >= 1.25 ? "#16a34a" : parseFloat(dscr) >= 1 ? "#f59e0b" : "#dc2626" }}>{dscr}x</div></div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b", flexWrap: "wrap" }}>
                  {inv.lender && <span>Lender: <strong style={{ color: "#0f172a" }}>{inv.lender}</strong></span>}
                  {capRate > 0 && <span>Cap Rate: <strong style={{ color: "#7c3aed" }}>{capRate}%</strong></span>}
                  {inv.date_purchased && <span>Acquired: <strong>{fmtDate(inv.date_purchased)}</strong></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* — Companies / Equity Tab — */
function CompaniesWealthTab({ isMobile, investments, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", shares: "", purchase_price: "", current_price: "", date_purchased: "", visibility: "business", ticker: "", monthly_income: "", monthly_expenses: "" });
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({ name: "", shares: "", purchase_price: "", current_price: "", date_purchased: "", visibility: "business", ticker: "", monthly_income: "", monthly_expenses: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name, asset_type: "Business Equity", ticker: form.ticker || null, shares: form.shares ? parseFloat(form.shares) : 0, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : 0, current_price: form.current_price ? parseFloat(form.current_price) : 0, date_purchased: form.date_purchased || null, visibility: form.visibility, monthly_income: parseFloat(form.monthly_income) || 0, monthly_expenses: parseFloat(form.monthly_expenses) || 0 };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };
  const startEdit = (inv) => { setForm({ name: inv.name || "", shares: inv.shares?.toString() || "", purchase_price: inv.purchase_price?.toString() || "", current_price: inv.current_price?.toString() || "", date_purchased: inv.date_purchased || "", visibility: inv.visibility || "business", ticker: inv.ticker || "", monthly_income: inv.monthly_income?.toString() || "", monthly_expenses: inv.monthly_expenses?.toString() || "" }); setEditingId(inv.id); setShowForm(true); };

  const totalValue = investments.reduce((s, i) => s + Number(i.current_price || 0), 0);
  const totalCost = investments.reduce((s, i) => s + Number(i.purchase_price || 0), 0);
  const totalBizIncome = investments.reduce((s, i) => s + Number(i.monthly_income || 0), 0);
  const totalBizExpenses = investments.reduce((s, i) => s + Number(i.monthly_expenses || 0), 0);
  const totalBizNet = totalBizIncome - totalBizExpenses;

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Companies" value={investments.length} accent="#7c3aed" />
        <StatCard label="Total Valuation" value={fmtCurrency(totalValue)} accent="#16a34a" />
        <StatCard label="Mo. Income" value={fmtCurrency(totalBizIncome)} accent="#16a34a" />
        <StatCard label="Mo. Expenses" value={fmtCurrency(totalBizExpenses)} accent="#dc2626" />
        <StatCard label="Mo. Net" value={fmtCurrency(totalBizNet)} accent={totalBizNet >= 0 ? "#3b82f6" : "#dc2626"} />
        <StatCard label="Total Invested" value={fmtCurrency(totalCost)} accent="#94a3b8" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Company</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Company" : "New Company Equity"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Company Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Suarez Global LLC" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Ownership / Equity %</label><input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="e.g. 100% or 50/50" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Shares / Units</label><input type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Capital Invested</label><input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Current Valuation</label><input type="number" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date Acquired</label><input type="date" value={form.date_purchased} onChange={(e) => setForm({ ...form, date_purchased: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Monthly Income</label><input type="number" step="0.01" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Monthly Expenses</label><input type="number" step="0.01" value={form.monthly_expenses} onChange={(e) => setForm({ ...form, monthly_expenses: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : editingId ? "Update" : "Add Company"}</GreenButton>
          </div>
        </div>
      )}
      {investments.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Company Equity</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Track ownership stakes, partnerships, and business equity.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add First Company</GreenButton>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {investments.map((inv) => {
            const val = Number(inv.current_price || 0);
            const cost = Number(inv.purchase_price || 0);
            const gain = val - cost;
            return (
              <div key={inv.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "#faf5ff", border: "1px solid #e9d5ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏢</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{inv.name}</div>
                    {inv.ticker && <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{inv.ticker}</div>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Invested</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(cost)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Valuation</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#7c3aed" }}>{fmtCurrency(val)}</div></div>
                </div>
                {(Number(inv.monthly_income) > 0 || Number(inv.monthly_expenses) > 0) && (() => { const mI = Number(inv.monthly_income || 0); const mE = Number(inv.monthly_expenses || 0); const net = mI - mE; return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}>
                    <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Mo. Income</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#16a34a" }}>{fmtCurrency(mI)}</div></div>
                    <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Mo. Expenses</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{fmtCurrency(mE)}</div></div>
                    <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Mo. Net</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: net >= 0 ? "#16a34a" : "#dc2626" }}>{fmtCurrency(net)}</div></div>
                  </div>
                ); })()}
                {inv.date_purchased && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Since {fmtDate(inv.date_purchased)}</div>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(inv)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 10, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>{Icons.edit} Edit</button>
                  <button onClick={() => { if (window.confirm("Delete?")) onDelete(inv.id); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center" }}>{Icons.trash}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
/* — Bookkeeping Tab — */
function BookkeepingTab({ isMobile, transactions, accounts, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", type: "expense", category: "", account_id: "", date: new Date().toISOString().split("T")[0], visibility: "personal" });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterVis, setFilterVis] = useState("all");

  const resetForm = () => { setForm({ description: "", amount: "", type: "expense", category: "", account_id: "", date: new Date().toISOString().split("T")[0], visibility: "personal" }); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    await onAdd({ description: form.description, amount: parseFloat(form.amount), type: form.type, category: form.category || null, account_id: form.account_id || null, date: form.date, visibility: form.visibility });
    resetForm(); setSaving(false);
  };

  const filtered = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterVis !== "all" && t.visibility !== filterVis) return false;
    if (filterMonth && t.date && !t.date.startsWith(filterMonth)) return false;
    return true;
  });

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Income" value={fmtCurrency(totalIncome)} accent="#16a34a" />
        <StatCard label="Expenses" value={fmtCurrency(totalExpenses)} accent="#dc2626" />
        <StatCard label="Net Flow" value={fmtCurrency(totalIncome - totalExpenses)} accent={totalIncome - totalExpenses >= 0 ? "#3b82f6" : "#f59e0b"} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {["all", "income", "expense"].map((t) => (
          <button key={t} onClick={() => setFilterType(t)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${filterType === t ? "#16a34a" : "#e2e8f0"}`, background: filterType === t ? "#f0fdf4" : "transparent", color: filterType === t ? "#16a34a" : "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
        ))}
        <span style={{ color: "#e2e8f0" }}>|</span>
        {["all", "personal", "business"].map((v) => (
          <button key={v} onClick={() => setFilterVis(v)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${filterVis === v ? "#7c3aed" : "#e2e8f0"}`, background: filterVis === v ? "#faf5ff" : "transparent", color: filterVis === v ? "#7c3aed" : "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{v}</button>
        ))}
        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 11 }} />
        <GreenButton small onClick={() => setShowForm(!showForm)}>{Icons.plus} Add</GreenButton>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Description *</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Grocery run" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Amount *</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: "" })} style={{ ...inputStyle, cursor: "pointer" }}><option value="expense">Expense</option><option value="income">Income</option></select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Select...</option>{(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Account</label><select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">None</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Visibility</label><select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="personal">Personal</option><option value="business">Business</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.description.trim() || !form.amount}>{saving ? "..." : "Add"}</GreenButton>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Ledger · {filtered.length} transactions</div>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No transactions found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Date</th>
                <th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Description</th>
                <th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Category</th>
                <th style={{ textAlign: "center", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Scope</th>
                <th style={{ textAlign: "right", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Amount</th>
                <th style={{ width: 36 }}></th>
              </tr></thead>
              <tbody>{filtered.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "8px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtDate(t.date)}</td>
                  <td style={{ padding: "8px 14px", fontWeight: 600, color: "#0f172a" }}>{t.description}</td>
                  <td style={{ padding: "8px 14px", color: "#64748b" }}>{t.category || "—"}</td>
                  <td style={{ padding: "8px 14px", textAlign: "center" }}><VisibilityBadge visibility={t.visibility || "personal"} /></td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono', monospace", color: t.type === "income" ? "#16a34a" : "#dc2626" }}>{t.type === "income" ? "+" : "−"}{fmtCurrencyExact(t.amount)}</td>
                  <td style={{ padding: "8px 14px" }}><button onClick={() => { if (window.confirm("Delete?")) onDelete(t.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* — Personal Spending Tab — */
function PersonalSpendingTab({ isMobile, lifeExpenses, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "Food & Dining", date: new Date().toISOString().split("T")[0], recurring: false });
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const resetForm = () => { setForm({ description: "", amount: "", category: "Food & Dining", date: new Date().toISOString().split("T")[0], recurring: false }); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    await onAdd({ description: form.description, amount: parseFloat(form.amount), category: form.category, date: form.date, recurring: form.recurring });
    resetForm(); setSaving(false);
  };

  const filtered = lifeExpenses.filter((e) => e.date?.startsWith(filterMonth));
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = {};
  filtered.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount); });

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono', monospace" }} />
        <StatCard label="Month Total" value={fmtCurrency(total)} accent="#dc2626" />
        <div style={{ flex: 1 }} />
        <GreenButton small onClick={() => setShowForm(!showForm)}>{Icons.plus} Add</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Description *</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Chipotle" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Amount *</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{LIFE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}><label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> Recurring</label></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.description.trim() || !form.amount}>{saving ? "..." : "Add"}</GreenButton>
          </div>
        </div>
      )}
      {Object.keys(byCategory).length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
          <SectionHeader text="Category Breakdown" />
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
            const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
            return (<div key={cat} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: 600 }}>{cat}</span><span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{fmtCurrencyExact(amt)} ({pct}%)</span></div><div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: 3 }} /></div></div>);
          })}
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Expenses · {filtered.length}</div>
        {filtered.length === 0 ? (<div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No expenses this month</div>) : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}><th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Date</th><th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Description</th><th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Category</th><th style={{ textAlign: "right", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Amount</th><th style={{ width: 36 }}></th></tr></thead>
            <tbody>{filtered.map((e) => (<tr key={e.id} style={{ borderBottom: "1px solid #f8fafc" }}><td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", color: "#64748b", fontSize: 11 }}>{fmtDate(e.date)}</td><td style={{ padding: "8px 14px", fontWeight: 600, color: "#0f172a" }}>{e.description}{e.recurring && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#eff6ff", color: "#3b82f6", fontWeight: 700 }}>↻</span>}</td><td style={{ padding: "8px 14px", color: "#64748b" }}>{e.category}</td><td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>−{fmtCurrencyExact(e.amount)}</td><td style={{ padding: "8px 14px" }}><button onClick={() => { if (window.confirm("Delete?")) onDelete(e.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></td></tr>))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

/* — Statements Tab — */
function StatementsTab({ isMobile, transactions, assets, accounts }) {
  const [view, setView] = useState("income");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const periodTxns = transactions.filter((t) => t.date && t.date.startsWith(period));
  const income = periodTxns.filter((t) => t.type === "income");
  const expenses = periodTxns.filter((t) => t.type === "expense");
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const netIncome = totalIncome - totalExpenses;

  const groupByCategory = (txns) => { const g = {}; txns.forEach((t) => { const c = t.category || "Uncategorized"; g[c] = (g[c] || 0) + Number(t.amount); }); return Object.entries(g).sort((a, b) => b[1] - a[1]); };
  const totalAssets = assets.reduce((s, a) => s + Number(a.estimated_value || 0), 0);

  const lineStyle = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, fontFamily: "'DM Sans', sans-serif" };
  const totalLineStyle = { ...lineStyle, borderBottom: "2px solid #e2e8f0", fontWeight: 700 };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {[{ k: "income", l: "Income Statement" }, { k: "balance", l: "Balance Sheet" }, { k: "cashflow", l: "Cash Flow" }].map(({ k, l }) => (
          <button key={k} onClick={() => setView(k)} style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${view === k ? "#16a34a" : "#e2e8f0"}`, background: view === k ? "#f0fdf4" : "transparent", color: view === k ? "#16a34a" : "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono', monospace" }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "24px 28px" }}>
        {view === "income" && (<>
          <SectionHeader text="Revenue" />
          {groupByCategory(income).length === 0 ? <div style={{ ...lineStyle, color: "#94a3b8" }}>No income this period</div> : groupByCategory(income).map(([cat, amt]) => (<div key={cat} style={lineStyle}><span style={{ color: "#475569" }}>{cat}</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#16a34a" }}>{fmtCurrencyExact(amt)}</span></div>))}
          <div style={totalLineStyle}><span>Total Revenue</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#16a34a" }}>{fmtCurrencyExact(totalIncome)}</span></div>
          <div style={{ height: 16 }} />
          <SectionHeader text="Expenses" />
          {groupByCategory(expenses).length === 0 ? <div style={{ ...lineStyle, color: "#94a3b8" }}>No expenses this period</div> : groupByCategory(expenses).map(([cat, amt]) => (<div key={cat} style={lineStyle}><span style={{ color: "#475569" }}>{cat}</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{fmtCurrencyExact(amt)}</span></div>))}
          <div style={totalLineStyle}><span>Total Expenses</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{fmtCurrencyExact(totalExpenses)}</span></div>
          <div style={{ ...totalLineStyle, borderBottom: "3px double #0f172a", padding: "14px 0", marginTop: 16 }}><span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Net Income</span><span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: netIncome >= 0 ? "#16a34a" : "#dc2626" }}>{fmtCurrencyExact(netIncome)}</span></div>
        </>)}
        {view === "balance" && (<>
          <SectionHeader text="Assets" />
          {assets.length === 0 ? <div style={{ ...lineStyle, color: "#94a3b8" }}>No assets recorded</div> : assets.map((a) => (<div key={a.id} style={lineStyle}><span style={{ color: "#475569" }}>{a.name}</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(a.estimated_value)}</span></div>))}
          <div style={totalLineStyle}><span>Total Assets</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(totalAssets)}</span></div>
          <div style={{ height: 16 }} />
          <SectionHeader text="Liabilities" />
          {accounts.filter((a) => ["Loan", "Credit Card"].includes(a.type)).map((a) => (<div key={a.id} style={lineStyle}><span style={{ color: "#475569" }}>{a.name}</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>—</span></div>))}
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 12 }}>Add loan balances in Net Worth Tracker for full picture.</p>
        </>)}
        {view === "cashflow" && (<>
          <SectionHeader text="Cash Flow Summary" />
          <div style={lineStyle}><span style={{ color: "#475569" }}>Total Income</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#16a34a" }}>{fmtCurrencyExact(totalIncome)}</span></div>
          <div style={lineStyle}><span style={{ color: "#475569" }}>Total Expenses</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{fmtCurrencyExact(totalExpenses)}</span></div>
          <div style={{ ...totalLineStyle, borderBottom: "3px double #0f172a", padding: "14px 0", marginTop: 8 }}><span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Net Cash Flow</span><span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: netIncome >= 0 ? "#16a34a" : "#dc2626" }}>{fmtCurrencyExact(netIncome)}</span></div>
          <div style={{ height: 16 }} />
          <SectionHeader text="Expense Breakdown" />
          {groupByCategory(expenses).map(([cat, amt]) => { const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0; return (<div key={cat} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: 600 }}>{cat}</span><span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{fmtCurrencyExact(amt)} ({pct}%)</span></div><div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(135deg, #16a34a, #15803d)", borderRadius: 3 }} /></div></div>); })}
        </>)}
      </div>
    </>
  );
}

/* — Uploader Tab — */
function UploaderTab({ isMobile, accounts, uploads, onUpload, onDeleteUpload }) {
  const quarter = getCurrentQuarter();
  const [selectedQ, setSelectedQ] = useState(quarter);
  const [uploading, setUploading] = useState(null);
  const activeAccounts = accounts.filter((a) => a.active);

  const handleFileSelect = async (acct, month, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(`${acct.id}-${month}`);
    await onUpload(acct, month, selectedQ, file);
    setUploading(null);
    e.target.value = "";
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}><QuarterPicker selected={selectedQ} onChange={setSelectedQ} /></div>
      {activeAccounts.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#94a3b8" }}>Add accounts first to start uploading statements.</p>
        </div>
      ) : activeAccounts.map((acct) => (
        <div key={acct.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{acct.name}</span>
              <VisibilityBadge visibility={acct.visibility} />
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{acct.type}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: 14 }}>
            {QUARTERS[selectedQ].months.map((m) => {
              const existing = uploads.find((u) => u.account_id === acct.id && u.month === m && u.quarter === selectedQ);
              const isUploading = uploading === `${acct.id}-${m}`;
              return (
                <div key={m} style={{ padding: 14, borderRadius: 10, border: `1.5px ${existing ? "solid" : "dashed"} ${existing ? "#bbf7d0" : "#e2e8f0"}`, background: existing ? "#f0fdf4" : "#f8fafc", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>{m}</div>
                  {existing ? (<>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#dcfce7", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>{Icons.check}</div>
                    <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>{existing.filename}</div>
                    {existing.file_url && <a href={existing.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 4, fontSize: 9, color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>View File ↗</a>}
                    <div><button onClick={() => onDeleteUpload(existing.id, existing.file_path)} style={{ marginTop: 4, padding: "2px 8px", borderRadius: 5, border: "1px solid #fca5a5", background: "#fef2f2", fontSize: 9, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>Remove</button></div>
                  </>) : (
                    <label style={{ display: "inline-block", marginTop: 2, padding: "5px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", fontSize: 11, fontWeight: 600, color: isUploading ? "#94a3b8" : "#16a34a", cursor: isUploading ? "not-allowed" : "pointer" }}>
                      {isUploading ? "Uploading..." : "📎 Upload File"}
                      <input type="file" accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.doc,.docx" style={{ display: "none" }} onChange={(e) => handleFileSelect(acct, m, e)} disabled={isUploading} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/* — Financial Overview Tab (was Dashboard) — */
function FinOverviewTab({ isMobile, accounts, uploads }) {
  const quarter = getCurrentQuarter();
  const [selectedQ, setSelectedQ] = useState(quarter);
  const activeAccounts = accounts.filter((a) => a.active);
  const qUploads = uploads.filter((u) => u.quarter === selectedQ);
  const totalSlots = activeAccounts.length * 3;
  const pct = totalSlots > 0 ? Math.round((qUploads.length / totalSlots) * 100) : 0;

  return (
    <>
      <div style={{ marginBottom: 16 }}><QuarterPicker selected={selectedQ} onChange={setSelectedQ} /></div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Accounts" value={activeAccounts.length} accent="#16a34a" />
        <StatCard label={`${selectedQ} Completion`} value={`${pct}%`} accent="#3b82f6" />
        <StatCard label="Uploaded" value={`${qUploads.length} / ${totalSlots}`} accent="#7c3aed" />
        <StatCard label="Remaining" value={totalSlots - qUploads.length} accent="#f59e0b" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{selectedQ} Upload Matrix</div>
          <div style={{ padding: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <thead><tr><th style={{ textAlign: "left", padding: "8px 10px", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>Account</th>{QUARTERS[selectedQ].months.map((m) => (<th key={m} style={{ textAlign: "center", padding: "8px 10px", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>{m.slice(0, 3)}</th>))}</tr></thead>
              <tbody>{activeAccounts.length === 0 ? (<tr><td colSpan={4} style={{ padding: "32px 10px", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>Add accounts to see the matrix</td></tr>) : activeAccounts.map((acct) => (<tr key={acct.id}><td style={{ padding: "10px", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f8fafc", whiteSpace: "nowrap" }}>{acct.name}</td>{QUARTERS[selectedQ].months.map((m) => { const has = qUploads.some((u) => u.account_id === acct.id && u.month === m); return (<td key={m} style={{ padding: "10px", textAlign: "center", borderBottom: "1px solid #f8fafc" }}>{has ? <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f0fdf4", border: "1.5px solid #16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{Icons.check}</div> : <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f8fafc", border: "1.5px dashed #e2e8f0", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{Icons.clock}</div>}</td>); })}</tr>))}</tbody>
            </table>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Recent Uploads</div>
          <div style={{ padding: "10px 18px" }}>
            {qUploads.length === 0 ? (<div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No uploads for {selectedQ}</div>) : qUploads.map((u) => { const acct = accounts.find((a) => a.id === u.account_id); return (<div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}><div style={{ width: 28, height: 28, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icons.check}</div><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{u.filename || `${u.month} statement`}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{acct?.name} · {u.month}</div></div></div>); })}
          </div>
        </div>
      </div>
    </>
  );
}

/* — Accounts Tab (table view) — */
function AccountsTab({ isMobile, accounts, onAdd, onToggle, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Checking", institution: "", visibility: "business", monthly_payment: "" });
  const [saving, setSaving] = useState(false);
  const types = ["Checking", "Savings", "Credit Card", "Loan", "Investment", "Business", "Other"];

  const handleSubmit = async () => { if (!form.name.trim()) return; setSaving(true); await onAdd({ ...form, monthly_payment: form.monthly_payment ? parseFloat(form.monthly_payment) : 0 }); setForm({ name: "", type: "Checking", institution: "", visibility: "business", monthly_payment: "" }); setShowForm(false); setSaving(false); };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
        <GreenButton small onClick={() => setShowForm(!showForm)}>{Icons.plus} Add</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Checking" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Institution</label><input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. Chase" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Visibility</label><select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="business">Business</option><option value="personal">Personal</option></select></div>
            {["Loan", "Credit Card"].includes(form.type) && <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Monthly Payment</label><input type="number" step="0.01" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : "Add"}</GreenButton>
          </div>
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {accounts.length === 0 ? (<div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No accounts yet</div>) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Account</th>
                <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Institution</th>
                <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Type</th>
                <th style={{ textAlign: "center", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Scope</th>
                <th style={{ textAlign: "right", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Mo. Payment</th>
                <th style={{ textAlign: "center", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Status</th>
                <th style={{ width: 60 }}></th>
              </tr></thead>
              <tbody>{accounts.map((acct) => (
                <tr key={acct.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>{acct.name}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>{acct.institution || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{acct.type}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontWeight: 600, color: Number(acct.monthly_payment) > 0 ? "#dc2626" : "#cbd5e1" }}>{Number(acct.monthly_payment) > 0 ? fmtCurrencyExact(acct.monthly_payment) : "—"}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}><VisibilityBadge visibility={acct.visibility} /></td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}><button onClick={() => onToggle(acct.id, !acct.active)} style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #e2e8f0", background: acct.active ? "#f0fdf4" : "#f8fafc", fontSize: 10, fontWeight: 600, color: acct.active ? "#16a34a" : "#94a3b8", cursor: "pointer" }}>{acct.active ? "● Active" : "○ Off"}</button></td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}><button onClick={() => { if (window.confirm("Delete?")) onDelete(acct.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* — Assets Tab — */
function AssetsTab({ isMobile, assets, accounts, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", type: "Vehicle", year: "", make: "", model: "", estimated_value: "", loan_account_id: "", visibility: "personal", description: "" });
  const [saving, setSaving] = useState(false);
  const assetTypes = ["Vehicle", "Property", "Electronics", "Jewelry", "Other"];
  const loanAccounts = accounts.filter((a) => a.type === "Loan");

  const resetForm = () => { setForm({ name: "", type: "Vehicle", year: "", make: "", model: "", estimated_value: "", loan_account_id: "", visibility: "personal", description: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return; setSaving(true);
    const payload = { name: form.name, type: form.type, year: form.year ? parseInt(form.year) : null, make: form.make || null, model: form.model || null, estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null, loan_account_id: form.loan_account_id || null, visibility: form.visibility, description: form.description || null };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };
  const startEdit = (a) => { setForm({ name: a.name || "", type: a.type || "Vehicle", year: a.year?.toString() || "", make: a.make || "", model: a.model || "", estimated_value: a.estimated_value?.toString() || "", loan_account_id: a.loan_account_id || "", visibility: a.visibility || "personal", description: a.description || "" }); setEditingId(a.id); setShowForm(true); };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Asset" : "New Asset"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2023 Tesla Model Y" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{assetTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Est. Value</label><input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            {form.type === "Vehicle" && <><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Year</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} style={inputStyle} className="sz-input" /></div><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Make</label><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} style={inputStyle} className="sz-input" /></div><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={inputStyle} className="sz-input" /></div></>}
            {loanAccounts.length > 0 && <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Linked Loan</label><select value={form.loan_account_id} onChange={(e) => setForm({ ...form, loan_account_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">None</option>{loanAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Visibility</label><select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="personal">Personal</option><option value="business">Business</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : editingId ? "Update" : "Add"}</GreenButton>
          </div>
        </div>
      )}
      {assets.length === 0 && !showForm ? (<div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No assets yet</div>) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {assets.map((asset) => {
            const linkedLoan = accounts.find((a) => a.id === asset.loan_account_id);
            return (
              <div key={asset.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(135deg, #16a34a, #15803d)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", flexShrink: 0 }}>{Icons.car}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{asset.name}</div><div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{asset.type}</span><VisibilityBadge visibility={asset.visibility} /></div></div>
                </div>
                {asset.type === "Vehicle" && (asset.year || asset.make) && <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b", marginBottom: 6 }}>{asset.year && <span>{asset.year}</span>}{asset.make && <span>{asset.make} {asset.model || ""}</span>}</div>}
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>{fmtCurrency(asset.estimated_value)}</div>
                {linkedLoan && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 6 }}>{Icons.link} {linkedLoan.name}</div>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(asset)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 10, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>{Icons.edit} Edit</button>
                  <button onClick={() => { if (window.confirm("Delete?")) onDelete(asset.id); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center" }}>{Icons.trash}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* — Portfolio Tab — */
function PortfolioTab({ isMobile, investments, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", ticker: "", asset_type: "Stock", shares: "", purchase_price: "", current_price: "", date_purchased: "", visibility: "personal" });
  const [saving, setSaving] = useState(false);
  const [forecastYears, setForecastYears] = useState(5);
  const [forecastRate, setForecastRate] = useState(8);
  const assetTypes = ["Stock", "ETF", "Bond", "Crypto", "Mutual Fund", "Real Estate", "Business Equity", "Other"];

  const resetForm = () => { setForm({ name: "", ticker: "", asset_type: "Stock", shares: "", purchase_price: "", current_price: "", date_purchased: "", visibility: "personal" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => { if (!form.name.trim()) return; setSaving(true); const payload = { name: form.name, ticker: form.ticker || null, asset_type: form.asset_type, shares: form.shares ? parseFloat(form.shares) : 0, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : 0, current_price: form.current_price ? parseFloat(form.current_price) : 0, date_purchased: form.date_purchased || null, visibility: form.visibility }; if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); } resetForm(); setSaving(false); };
  const startEdit = (inv) => { setForm({ name: inv.name || "", ticker: inv.ticker || "", asset_type: inv.asset_type || "Stock", shares: inv.shares?.toString() || "", purchase_price: inv.purchase_price?.toString() || "", current_price: inv.current_price?.toString() || "", date_purchased: inv.date_purchased || "", visibility: inv.visibility || "personal" }); setEditingId(inv.id); setShowForm(true); };

  const totalCost = investments.reduce((s, i) => s + Number(i.shares || 0) * Number(i.purchase_price || 0), 0);
  const totalValue = investments.reduce((s, i) => s + Number(i.shares || 0) * Number(i.current_price || 0), 0);
  const totalGain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(1) : "0.0";
  const forecastData = []; for (let y = 0; y <= forecastYears; y++) { forecastData.push({ year: new Date().getFullYear() + y, value: totalValue * Math.pow(1 + forecastRate / 100, y) }); }

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Cost Basis" value={fmtCurrency(totalCost)} accent="#94a3b8" />
        <StatCard label="Current Value" value={fmtCurrency(totalValue)} accent="#3b82f6" />
        <StatCard label="Gain/Loss" value={`${totalGain >= 0 ? "+" : ""}${fmtCurrency(totalGain)}`} accent={totalGain >= 0 ? "#16a34a" : "#dc2626"} />
        <StatCard label="Return" value={`${totalGain >= 0 ? "+" : ""}${gainPct}%`} accent={totalGain >= 0 ? "#16a34a" : "#dc2626"} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Apple" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Ticker</label><input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="AAPL" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Shares</label><input type="number" step="0.01" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Buy Price</label><input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Current Price</label><input type="number" step="0.01" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{assetTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : editingId ? "Update" : "Add"}</GreenButton>
          </div>
        </div>
      )}
      {investments.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Holdings</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}><th style={{ textAlign: "left", padding: "8px 12px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Name</th><th style={{ textAlign: "center", padding: "8px 12px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Ticker</th><th style={{ textAlign: "right", padding: "8px 12px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Shares</th><th style={{ textAlign: "right", padding: "8px 12px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Price</th><th style={{ textAlign: "right", padding: "8px 12px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Value</th><th style={{ textAlign: "right", padding: "8px 12px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>G/L</th><th style={{ width: 50 }}></th></tr></thead>
              <tbody>{investments.map((inv) => { const val = Number(inv.shares || 0) * Number(inv.current_price || 0); const cost = Number(inv.shares || 0) * Number(inv.purchase_price || 0); const gain = val - cost; return (<tr key={inv.id} style={{ borderBottom: "1px solid #f8fafc" }}><td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f172a" }}>{inv.name}</td><td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "'DM Mono', monospace", color: "#64748b" }}>{inv.ticker || "—"}</td><td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace" }}>{Number(inv.shares || 0).toLocaleString()}</td><td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace" }}>{fmtCurrencyExact(inv.current_price)}</td><td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(val)}</td><td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono', monospace", color: gain >= 0 ? "#16a34a" : "#dc2626" }}>{gain >= 0 ? "+" : ""}{fmtCurrency(gain)}</td><td style={{ padding: "8px 12px", display: "flex", gap: 3 }}><button onClick={() => startEdit(inv)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#64748b" }}>{Icons.edit}</button><button onClick={() => { if (window.confirm("Delete?")) onDelete(inv.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></td></tr>); })}</tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px" }}>
        <SectionHeader text="Growth Projection" />
        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 3 }}>Years</label><input type="number" min={1} max={30} value={forecastYears} onChange={(e) => setForecastYears(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))} style={{ ...inputStyle, width: 70, padding: "5px 8px", fontSize: 12 }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 3 }}>Return %</label><input type="number" step="0.5" value={forecastRate} onChange={(e) => setForecastRate(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: 70, padding: "5px 8px", fontSize: 12 }} /></div>
        </div>
        {totalValue === 0 ? (<div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Add investments to see projections</div>) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120, padding: "0 4px" }}>
            {forecastData.map((d, i) => { const maxVal = forecastData[forecastData.length - 1].value; const barH = Math.max(10, Math.round((d.value / maxVal) * 100)); return (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ fontSize: 8, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>{fmtCurrency(d.value)}</div><div style={{ width: "100%", height: barH, borderRadius: 3, background: i === 0 ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #16a34a, #15803d)" }} /><div style={{ fontSize: 8, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{d.year}</div></div>); })}
          </div>
        )}
      </div>
    </>
  );
}

/* — Net Worth Tab — */
function NetWorthTab({ isMobile, assets, accounts, investments, snapshots, onAddSnapshot, onDeleteSnapshot }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ snapshot_date: new Date().toISOString().split("T")[0], total_assets: "", total_liabilities: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const physicalAssetTotal = assets.reduce((s, a) => s + Number(a.estimated_value || 0), 0);
  const investmentTotal = (investments || []).reduce((s, i) => {
    if (i.asset_type === "Real Estate" || i.asset_type === "Business Equity") return s + Number(i.current_price || 0);
    return s + Number(i.shares || 0) * Number(i.current_price || 0);
  }, 0);
  const assetTotal = physicalAssetTotal + investmentTotal;
  const handleSubmit = async () => { const ta = parseFloat(form.total_assets) || 0; const tl = parseFloat(form.total_liabilities) || 0; setSaving(true); await onAddSnapshot({ snapshot_date: form.snapshot_date, total_assets: ta, total_liabilities: tl, net_worth: ta - tl, notes: form.notes || null }); setForm({ snapshot_date: new Date().toISOString().split("T")[0], total_assets: "", total_liabilities: "", notes: "" }); setShowForm(false); setSaving(false); };

  const latestNW = snapshots.length > 0 ? snapshots[0] : null;
  const prevNW = snapshots.length > 1 ? snapshots[1] : null;
  const nwChange = latestNW && prevNW ? Number(latestNW.net_worth) - Number(prevNW.net_worth) : null;
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total Assets (Live)" value={fmtCurrency(assetTotal)} accent="#16a34a" />
        <StatCard label="Latest NW" value={latestNW ? fmtCurrency(latestNW.net_worth) : "—"} accent="#3b82f6" />
        <StatCard label="Assets (Snapshot)" value={latestNW ? fmtCurrency(latestNW.total_assets) : "—"} accent="#7c3aed" />
        <StatCard label="Change" value={nwChange != null ? `${nwChange >= 0 ? "+" : ""}${fmtCurrency(nwChange)}` : "—"} accent={nwChange >= 0 ? "#16a34a" : "#f59e0b"} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => setShowForm(!showForm)}>{Icons.plus} Snapshot</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Enter total assets and liabilities as of a date to track trends over time.</p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.snapshot_date} onChange={(e) => setForm({ ...form, snapshot_date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Total Assets</label><input type="number" value={form.total_assets} onChange={(e) => setForm({ ...form, total_assets: e.target.value })} placeholder="250000" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Total Liabilities</label><input type="number" value={form.total_liabilities} onChange={(e) => setForm({ ...form, total_liabilities: e.target.value })} placeholder="80000" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving}>{saving ? "..." : "Save"}</GreenButton>
          </div>
        </div>
      )}
      {snapshots.length > 0 && (
        <>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
            <SectionHeader text="Trend" />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 100, padding: "0 4px" }}>
              {snapshots.slice().reverse().map((s) => { const maxNW = Math.max(...snapshots.map((sn) => Math.abs(Number(sn.net_worth))), 1); const barH = Math.max(8, Math.round((Math.abs(Number(s.net_worth)) / maxNW) * 80)); return (<div key={s.id} style={{ flex: 1, minWidth: 24, maxWidth: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ fontSize: 8, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{fmtDate(s.snapshot_date).split(",")[0]}</div><div style={{ width: "100%", height: barH, borderRadius: 3, background: Number(s.net_worth) >= 0 ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #dc2626, #b91c1c)" }} /><div style={{ fontSize: 8, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(s.net_worth)}</div></div>); })}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}><th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Date</th><th style={{ textAlign: "right", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Assets</th><th style={{ textAlign: "right", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Liabilities</th><th style={{ textAlign: "right", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Net Worth</th><th style={{ width: 36 }}></th></tr></thead>
                <tbody>{snapshots.map((s) => (<tr key={s.id} style={{ borderBottom: "1px solid #f8fafc" }}><td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", color: "#64748b" }}>{fmtDate(s.snapshot_date)}</td><td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#16a34a" }}>{fmtCurrency(s.total_assets)}</td><td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{fmtCurrency(s.total_liabilities)}</td><td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#0f172a" }}>{fmtCurrency(s.net_worth)}</td><td style={{ padding: "8px 14px" }}><button onClick={() => { if (window.confirm("Delete?")) onDeleteSnapshot(s.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {snapshots.length === 0 && <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Add your first snapshot to start tracking</div>}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUSINESSES
   ═══════════════════════════════════════════════════════════ */

function BusinessesView({ isMobile, businesses, transactions, onAdd, onUpdate, onDelete, asTab }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", entity_type: "LLC", ein: "", state_of_formation: "", date_formed: "", industry: "", description: "" });
  const [saving, setSaving] = useState(false);

  const entityTypes = ["LLC", "S-Corp", "C-Corp", "Sole Proprietorship", "Partnership", "Non-Profit", "Other"];

  const resetForm = () => {
    setForm({ name: "", entity_type: "LLC", ein: "", state_of_formation: "", date_formed: "", industry: "", description: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      entity_type: form.entity_type,
      ein: form.ein || null,
      state_of_formation: form.state_of_formation || null,
      date_formed: form.date_formed || null,
      industry: form.industry || null,
      description: form.description || null,
    };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onAdd(payload);
    }
    resetForm();
    setSaving(false);
  };

  const startEdit = (biz) => {
    setForm({
      name: biz.name || "", entity_type: biz.entity_type || "LLC", ein: biz.ein || "",
      state_of_formation: biz.state_of_formation || "", date_formed: biz.date_formed || "",
      industry: biz.industry || "", description: biz.description || "",
    });
    setEditingId(biz.id);
    setShowForm(true);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>{!asTab && <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}><PageHeader title="Businesses" subtitle={`${businesses.length} entit${businesses.length !== 1 ? "ies" : "y"} managed`} isMobile={isMobile}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} {isMobile ? "Add" : "Add Business"}</GreenButton></PageHeader></div>}
      <div style={{ padding: asTab ? 0 : (isMobile ? "16px 12px" : "24px 32px") }}>
        {asTab && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Business</GreenButton></div>}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text={editingId ? "Edit Business" : "New Business"} />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Business Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Suarez Holdings LLC" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Entity Type</label>
                <select value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>EIN</label>
                <input value={form.ein} onChange={(e) => setForm({ ...form, ein: e.target.value })} placeholder="XX-XXXXXXX" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>State of Formation</label>
                <input value={form.state_of_formation} onChange={(e) => setForm({ ...form, state_of_formation: e.target.value })} placeholder="e.g. Texas" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Date Formed</label>
                <input type="date" value={form.date_formed} onChange={(e) => setForm({ ...form, date_formed: e.target.value })} style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Industry</label>
                <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Real Estate" style={inputStyle} className="sz-input" />
              </div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" style={inputStyle} className="sz-input" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : editingId ? "Update" : "Add Business"}</GreenButton>
            </div>
          </div>
        )}

        {businesses.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#16a34a" }}>{Icons.briefcase}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>No Businesses Yet</h3>
            <p style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>Add your business entities to manage them here.</p>
            <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add Your First Business</GreenButton>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Business</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Type</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>EIN</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>State</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Industry</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Status</th>
                  <th style={{ width: 80 }}></th>
                </tr></thead>
                <tbody>{businesses.map((biz) => (
                  <tr key={biz.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "10px 14px" }}><div style={{ fontWeight: 600, color: "#0f172a" }}>{biz.name}</div>{biz.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{biz.description}</div>}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{biz.entity_type}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{biz.ein || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{biz.state_of_formation || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{biz.industry || "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace", padding: "3px 8px", borderRadius: 6, background: biz.active ? "#f0fdf4" : "#f8fafc", color: biz.active ? "#16a34a" : "#94a3b8", border: `1px solid ${biz.active ? "#bbf7d0" : "#e2e8f0"}` }}>{biz.active ? "ACTIVE" : "INACTIVE"}</span></td>
                    <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", gap: 4, justifyContent: "center" }}><button onClick={() => startEdit(biz)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#64748b" }}>{Icons.edit}</button><button onClick={() => { if (window.confirm("Delete " + biz.name + "?")) onDelete(biz.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTACTS
   ═══════════════════════════════════════════════════════════ */

function ContactsView({ isMobile, companies, onAdd, onUpdate, onDelete, asTab }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", contact_name: "", phone: "", email: "", website: "", address: "", notes: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const categories = ["Vendor", "Client", "Contractor", "Supplier", "Partner", "Service Provider", "Government", "Other"];

  const resetForm = () => { setForm({ name: "", category: "", contact_name: "", phone: "", email: "", website: "", address: "", notes: "", tags: "" }); setEditingId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name, category: form.category || null, contact_name: form.contact_name || null, phone: form.phone || null, email: form.email || null, website: form.website || null, address: form.address || null, notes: form.notes || null, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };

  const startEdit = (co) => { setForm({ name: co.name || "", category: co.category || "", contact_name: co.contact_name || "", phone: co.phone || "", email: co.email || "", website: co.website || "", address: co.address || "", notes: co.notes || "", tags: (co.tags || []).join(", ") }); setEditingId(co.id); setShowForm(true); };

  const filtered = companies.filter((c) => { if (!search) return true; const q = search.toLowerCase(); return c.name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q) || (c.tags || []).some((t) => t.toLowerCase().includes(q)); });

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>{!asTab && <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}><PageHeader title="Contacts" subtitle={`${companies.length} contact${companies.length !== 1 ? "s" : ""} saved`} isMobile={isMobile}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} {isMobile ? "Add" : "Add Contact"}</GreenButton></PageHeader></div>}
      <div style={{ padding: asTab ? 0 : (isMobile ? "16px 12px" : "24px 32px") }}>
        {asTab && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Contact</GreenButton></div>}
        <div style={{ marginBottom: 16 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts, categories, or tags..." style={{ ...inputStyle, maxWidth: 400 }} className="sz-input" />
        </div>
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text={editingId ? "Edit Contact" : "New Contact"} />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Home Depot" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Select...</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Contact Name</label><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Primary contact" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@example.com" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Website</label><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." style={inputStyle} className="sz-input" /></div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Tags (comma-separated)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. supplies, construction" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" style={inputStyle} className="sz-input" /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : editingId ? "Update" : "Add Contact"}</GreenButton>
            </div>
          </div>
        )}
        {filtered.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#16a34a" }}>{Icons.book}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>{search ? "No Results" : "No Contacts Yet"}</h3>
            <p style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>{search ? "Try a different search term." : "Build your directory of vendors, clients, and partners."}</p>
            {!search && <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add Your First Contact</GreenButton>}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Name</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Category</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Contact</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Tags</th>
                  <th style={{ width: 70 }}></th>
                </tr></thead>
                <tbody>{filtered.map((co) => (
                  <tr key={co.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "12px 16px" }}><div style={{ fontWeight: 600, color: "#0f172a" }}>{co.name}</div>{co.email && <div style={{ fontSize: 11, color: "#64748b" }}>{co.email}</div>}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{co.category || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>{co.contact_name && <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 500 }}>{co.contact_name}</div>}{co.phone && <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{co.phone}</div>}</td>
                    <td style={{ padding: "12px 16px" }}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(co.tags || []).map((tag, i) => (<span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontFamily: "'DM Mono', monospace" }}>{tag}</span>))}</div></td>
                    <td style={{ padding: "12px 16px" }}><div style={{ display: "flex", gap: 4, justifyContent: "center" }}><button onClick={() => startEdit(co)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#64748b" }}>{Icons.edit}</button><button onClick={() => { if (window.confirm("Delete this contact?")) onDelete(co.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   INSURANCE
   ═══════════════════════════════════════════════════════════ */

function InsuranceView({ isMobile, policies, onAdd, onUpdate, onDelete, asTab }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", policy_type: "Auto", provider: "", policy_number: "", monthly_cost: "", annual_cost: "", coverage_amount: "", deductible: "", renewal_date: "", start_date: "", notes: "", visibility: "personal" });
  const [saving, setSaving] = useState(false);

  const policyTypes = ["Auto", "Home", "Health", "Life", "Umbrella", "Business", "Renters", "Disability", "Dental", "Vision", "Other"];

  const resetForm = () => {
    setForm({ name: "", policy_type: "Auto", provider: "", policy_number: "", monthly_cost: "", annual_cost: "", coverage_amount: "", deductible: "", renewal_date: "", start_date: "", notes: "", visibility: "personal" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      policy_type: form.policy_type,
      provider: form.provider || null,
      policy_number: form.policy_number || null,
      monthly_cost: form.monthly_cost ? parseFloat(form.monthly_cost) : null,
      annual_cost: form.annual_cost ? parseFloat(form.annual_cost) : null,
      coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
      deductible: form.deductible ? parseFloat(form.deductible) : null,
      renewal_date: form.renewal_date || null,
      start_date: form.start_date || null,
      notes: form.notes || null,
      visibility: form.visibility,
    };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onAdd(payload);
    }
    resetForm();
    setSaving(false);
  };

  const startEdit = (pol) => {
    setForm({
      name: pol.name || "", policy_type: pol.policy_type || "Auto", provider: pol.provider || "",
      policy_number: pol.policy_number || "", monthly_cost: pol.monthly_cost?.toString() || "",
      annual_cost: pol.annual_cost?.toString() || "", coverage_amount: pol.coverage_amount?.toString() || "",
      deductible: pol.deductible?.toString() || "", renewal_date: pol.renewal_date || "",
      start_date: pol.start_date || "", notes: pol.notes || "", visibility: pol.visibility || "personal",
    });
    setEditingId(pol.id);
    setShowForm(true);
  };

  const totalMonthly = policies.filter((p) => p.active).reduce((s, p) => s + Number(p.monthly_cost || 0), 0);
  const totalAnnual = policies.filter((p) => p.active).reduce((s, p) => s + Number(p.annual_cost || 0), 0);
  const upcoming = policies.filter((p) => {
    if (!p.renewal_date || !p.active) return false;
    const d = new Date(p.renewal_date);
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  });

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>{!asTab && <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}><PageHeader title="Insurance" subtitle={`${policies.length} polic${policies.length !== 1 ? "ies" : "y"} tracked`} isMobile={isMobile}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} {isMobile ? "Add" : "Add Policy"}</GreenButton></PageHeader></div>}
      <div style={{ padding: asTab ? 0 : (isMobile ? "16px 12px" : "24px 32px") }}>
        {asTab && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Policy</GreenButton></div>}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Active Policies" value={policies.filter((p) => p.active).length} accent="#16a34a" />
          <StatCard label="Monthly Cost" value={fmtCurrency(totalMonthly)} accent="#3b82f6" />
          <StatCard label="Annual Cost" value={fmtCurrency(totalAnnual)} accent="#7c3aed" />
          <StatCard label="Renewals Soon" value={upcoming.length} accent={upcoming.length > 0 ? "#f59e0b" : "#94a3b8"} />
        </div>

        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text={editingId ? "Edit Policy" : "New Policy"} />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Policy Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. USAA Auto Insurance" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Type</label>
                <select value={form.policy_type} onChange={(e) => setForm({ ...form, policy_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {policyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Provider</label>
                <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. USAA" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Policy Number</label>
                <input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} placeholder="Policy #" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Monthly Cost</label>
                <input type="number" step="0.01" value={form.monthly_cost} onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Annual Cost</label>
                <input type="number" step="0.01" value={form.annual_cost} onChange={(e) => setForm({ ...form, annual_cost: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Coverage Amount</label>
                <input type="number" value={form.coverage_amount} onChange={(e) => setForm({ ...form, coverage_amount: e.target.value })} placeholder="e.g. 500000" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Deductible</label>
                <input type="number" value={form.deductible} onChange={(e) => setForm({ ...form, deductible: e.target.value })} placeholder="e.g. 1000" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Renewal Date</label>
                <input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Visibility</label>
                <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : editingId ? "Update" : "Add Policy"}</GreenButton>
            </div>
          </div>
        )}

        {policies.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#16a34a" }}>{Icons.shield}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>No Policies Yet</h3>
            <p style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>Track your insurance policies, costs, and renewal dates.</p>
            <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add Your First Policy</GreenButton>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
            {policies.map((pol) => {
              const isRenewingSoon = pol.renewal_date && pol.active && (() => { const d = (new Date(pol.renewal_date) - new Date()) / (1000 * 60 * 60 * 24); return d >= 0 && d <= 90; })();
              return (
                <div key={pol.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ position: "relative", padding: "20px 22px 16px" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: pol.active ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "#94a3b8", borderRadius: "16px 16px 0 0" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 }}>{Icons.shield}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{pol.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{pol.policy_type}</span>
                          {pol.provider && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {pol.provider}</span>}
                          <VisibilityBadge visibility={pol.visibility} />
                          {isRenewingSoon && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "#fffbeb", color: "#f59e0b", border: "1px solid #fde68a", fontFamily: "'DM Mono', monospace" }}>RENEWING SOON</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}>
                      <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Monthly</div><div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(pol.monthly_cost)}</div></div>
                      <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Annual</div><div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(pol.annual_cost)}</div></div>
                      {pol.coverage_amount && <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Coverage</div><div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(pol.coverage_amount)}</div></div>}
                      {pol.deductible && <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Deductible</div><div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(pol.deductible)}</div></div>}
                    </div>

                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b", fontFamily: "'DM Sans', sans-serif", marginBottom: 10, flexWrap: "wrap" }}>
                      {pol.policy_number && <span>Policy: <strong style={{ fontFamily: "'DM Mono', monospace", color: "#0f172a" }}>{pol.policy_number}</strong></span>}
                      {pol.renewal_date && <span>Renews: <strong style={{ color: "#0f172a" }}>{fmtDate(pol.renewal_date)}</strong></span>}
                    </div>

                    {pol.notes && <p style={{ fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif", marginBottom: 10, lineHeight: 1.5 }}>{pol.notes}</p>}

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => startEdit(pol)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 11, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>{Icons.edit} Edit</button>
                      <button onClick={() => onUpdate(pol.id, { active: !pol.active })} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: pol.active ? "#f0fdf4" : "#f8fafc", fontSize: 11, fontWeight: 600, color: pol.active ? "#16a34a" : "#94a3b8", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{pol.active ? "● Active" : "○ Inactive"}</button>
                      <button onClick={() => { if (window.confirm("Delete this policy?")) onDelete(pol.id); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.trash}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   BUSINESS (Tabbed wrapper: Entities, Contacts, Insurance)
   ═══════════════════════════════════════════════════════════ */

function BusinessView({ isMobile, activeTab, onTabChange, businesses, transactions, companies, policies, onAddBusiness, onUpdateBusiness, onDeleteBusiness, onAddCompany, onUpdateCompany, onDeleteCompany, onAddPolicy, onUpdatePolicy, onDeletePolicy }) {
  const tab = activeTab || "entities";
  const setTab = onTabChange;
  const tabs = [
    { key: "entities", label: "Entities" },
    { key: "contacts", label: "Contacts" },
    { key: "insurance", label: "Insurance" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Business" subtitle="Entities, contacts & insurance" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={isMobile} />
        {tab === "entities" && <BusinessEntitiesTab isMobile={isMobile} businesses={businesses} transactions={transactions} onAdd={onAddBusiness} onUpdate={onUpdateBusiness} onDelete={onDeleteBusiness} />}
        {tab === "contacts" && <ContactsContentTab isMobile={isMobile} companies={companies} onAdd={onAddCompany} onUpdate={onUpdateCompany} onDelete={onDeleteCompany} />}
        {tab === "insurance" && <InsuranceContentTab isMobile={isMobile} policies={policies} onAdd={onAddPolicy} onUpdate={onUpdatePolicy} onDelete={onDeletePolicy} />}
      </div>
    </div>
  );
}

/* Thin tab wrappers that render existing views without PageHeader */
function BusinessEntitiesTab(props) {
  return <BusinessesView {...props} asTab />;
}
function ContactsContentTab(props) {
  return <ContactsView {...props} asTab />;
}
function InsuranceContentTab(props) {
  return <InsuranceView {...props} asTab />;
}
/* ═══════════════════════════════════════════════════════════
   HOME TRACKER (Tabbed: Homes, Utilities)
   ═══════════════════════════════════════════════════════════ */

const UTILITY_TYPES = ["Electric", "Water", "Gas", "Internet", "Phone", "Sewer", "Trash", "Lawn Care", "Pest Control", "HOA", "Other"];
const MONTHS_LIST = ["January","February","March","April","May","June","July","August","September","October","November","December"];


function HomesTab({ isMobile, homes, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", home_type: "Primary", purchase_date: "", purchase_price: "", current_value: "", notes: "", ownership_type: "own", monthly_payment: "" });
  const [saving, setSaving] = useState(false);
  const homeTypes = ["Primary", "Rental", "Vacation", "Investment", "Other"];

  const resetForm = () => { setForm({ name: "", address: "", home_type: "Primary", purchase_date: "", purchase_price: "", current_value: "", notes: "", ownership_type: "own", monthly_payment: "" }); setEditingId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name, address: form.address || null, home_type: form.home_type, purchase_date: form.purchase_date || null, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null, current_value: form.current_value ? parseFloat(form.current_value) : null, notes: form.notes || null, ownership_type: form.ownership_type, monthly_payment: form.monthly_payment ? parseFloat(form.monthly_payment) : 0 };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };

  const startEdit = (h) => { setForm({ name: h.name || "", address: h.address || "", home_type: h.home_type || "Primary", purchase_date: h.purchase_date || "", purchase_price: h.purchase_price?.toString() || "", current_value: h.current_value?.toString() || "", notes: h.notes || "", ownership_type: h.ownership_type || "own", monthly_payment: h.monthly_payment?.toString() || "" }); setEditingId(h.id); setShowForm(true); };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Home</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Home" : "New Home"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main House" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.home_type} onChange={(e) => setForm({ ...form, home_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{homeTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Purchase Price</label><input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Current Value</label><input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Own or Rent</label><select value={form.ownership_type} onChange={(e) => setForm({ ...form, ownership_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="own">Own (Mortgage)</option><option value="rent">Rent</option></select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{form.ownership_type === "rent" ? "Monthly Rent" : "Mortgage Payment"}</label><input type="number" step="0.01" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : editingId ? "Update" : "Add"}</GreenButton>
          </div>
        </div>
      )}
      {homes.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#16a34a" }}>{Icons.home}</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Homes Yet</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Add your properties to start tracking.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add Home</GreenButton>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {homes.map((h) => (
            <div key={h.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(135deg, #16a34a, #15803d)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>{Icons.home}</div>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{h.name}</div><span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{h.home_type}</span></div>
              </div>
              {h.address && <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{h.address}</p>}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {h.purchase_price && <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Purchased</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(h.purchase_price)}</div></div>}
                {h.current_value && <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Value</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#16a34a" }}>{fmtCurrency(h.current_value)}</div></div>}
                <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{h.ownership_type === "rent" ? "Monthly Rent" : "Mortgage"}</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#dc2626" }}>{Number(h.monthly_payment) > 0 ? fmtCurrency(h.monthly_payment) : "—"}</div></div>
              </div>
              <span style={{ display: "inline-block", marginTop: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: h.ownership_type === "rent" ? "#faf5ff" : "#f0fdf4", color: h.ownership_type === "rent" ? "#7c3aed" : "#16a34a", border: "1px solid " + (h.ownership_type === "rent" ? "#e9d5ff" : "#bbf7d0"), fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h.ownership_type === "rent" ? "RENTING" : "OWNER"}</span>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button onClick={() => startEdit(h)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 11, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>{Icons.edit} Edit</button>
                <button onClick={() => { if (window.confirm("Delete?")) onDelete(h.id); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center" }}>{Icons.trash}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function UtilitiesTab({ isMobile, homes, utilityBills, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [chartMode, setChartMode] = useState("donut");
  const [form, setForm] = useState({ utility_type: "Electric", provider: "", amount: "", home_id: "" });
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({ utility_type: "Electric", provider: "", amount: "", home_id: homes[0]?.id || "" }); setEditingId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.amount) return;
    setSaving(true);
    const payload = { utility_type: form.utility_type, provider: form.provider || null, amount: parseFloat(form.amount), home_id: form.home_id || null, month: "Budget", year: new Date().getFullYear() };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };

  const startEdit = (b) => { setForm({ utility_type: b.utility_type || "Electric", provider: b.provider || "", amount: b.amount?.toString() || "", home_id: b.home_id || "" }); setEditingId(b.id); setShowForm(true); };

  const totalMonthly = utilityBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const byType = {};
  utilityBills.forEach((b) => { byType[b.utility_type] = (byType[b.utility_type] || 0) + Number(b.amount); });

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Monthly Budget" value={fmtCurrency(totalMonthly)} accent="#16a34a" />
        <StatCard label="Utilities Tracked" value={utilityBills.length} accent="#3b82f6" />
        <StatCard label="Annual Estimate" value={fmtCurrency(totalMonthly * 12)} accent="#7c3aed" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Utility</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Utility" : "New Utility"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.utility_type} onChange={(e) => setForm({ ...form, utility_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{UTILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Avg Monthly Cost *</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Provider</label><input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Duke Energy" style={inputStyle} className="sz-input" /></div>
            {homes.length > 0 && <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Home</label><select value={form.home_id} onChange={(e) => setForm({ ...form, home_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">None</option>{homes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.amount}>{saving ? "..." : editingId ? "Update" : "Add Utility"}</GreenButton>
          </div>
        </div>
      )}
      {Object.keys(byType).length > 0 && (() => {
        const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
        const colors = ["#16a34a", "#3b82f6", "#7c3aed", "#f59e0b", "#dc2626", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6"];
        // Donut chart math
        const size = isMobile ? 180 : 200;
        const cx = size / 2, cy = size / 2, r = size * 0.35, strokeW = size * 0.18;
        let cumPct = 0;
        const segments = entries.map(([type, amt], i) => {
          const pct = totalMonthly > 0 ? amt / totalMonthly : 0;
          const dashArray = `${pct * 2 * Math.PI * r} ${(1 - pct) * 2 * Math.PI * r}`;
          const dashOffset = -cumPct * 2 * Math.PI * r;
          cumPct += pct;
          return { type, amt, pct, color: colors[i % colors.length], dashArray, dashOffset };
        });
        return (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionHeader text="Budget Breakdown" />
              <div style={{ display: "flex", gap: 4 }}>
                {["donut", "bars"].map((m) => (
                  <button key={m} onClick={() => setChartMode(m)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${chartMode === m ? "#16a34a" : "#e2e8f0"}`, background: chartMode === m ? "#f0fdf4" : "transparent", color: chartMode === m ? "#16a34a" : "#94a3b8", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{m === "donut" ? "🍩" : "📊"}</button>
                ))}
              </div>
            </div>
            {chartMode === "donut" ? (
              <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? 16 : 32, flexDirection: isMobile ? "column" : "row" }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
                  {segments.map((seg, i) => (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={strokeW} strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset} strokeLinecap="butt" />
                  ))}
                  <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", fill: "#0f172a", transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>{fmtCurrency(totalMonthly)}</text>
                  <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8", fontFamily: "'DM Sans', sans-serif", transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>per month</text>
                </svg>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, width: isMobile ? "100%" : "auto" }}>
                  {segments.map((seg, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#475569", fontWeight: 600, flex: 1 }}>{seg.type}</span>
                      <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtCurrencyExact(seg.amt)}</span>
                      <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace", minWidth: 32, textAlign: "right" }}>{Math.round(seg.pct * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {entries.map(([type, amt], i) => { const pct = totalMonthly > 0 ? Math.round((amt / totalMonthly) * 100) : 0; return (<div key={type} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: 600 }}>{type}</span><span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{fmtCurrencyExact(amt)}/mo ({pct}%)</span></div><div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: colors[i % colors.length], borderRadius: 3 }} /></div></div>); })}
              </>
            )}
          </div>
        );
      })()}
      {utilityBills.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💡</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Utilities Budgeted</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>List your recurring utilities with average monthly costs — electric, water, internet, etc.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add First Utility</GreenButton>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {utilityBills.map((b) => { const home = homes.find((h) => h.id === b.home_id); return (
            <div key={b.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{b.utility_type}{b.provider && <span style={{ color: "#64748b", fontWeight: 400 }}> — {b.provider}</span>}</div>
                {home && <div style={{ fontSize: 11, color: "#94a3b8" }}>{home.name}</div>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626", flexShrink: 0 }}>{fmtCurrencyExact(b.amount)}<span style={{ fontSize: 10, fontWeight: 400, color: "#94a3b8" }}>/mo</span></div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => startEdit(b)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#64748b" }}>{Icons.edit}</button>
                <button onClick={() => { if (window.confirm("Delete?")) onDelete(b.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
              </div>
            </div>
          ); })}
        </div>
      )}
    </>
  );
}
/* ═══════════════════════════════════════════════════════════
   PLANNER / TRACKER
   ═══════════════════════════════════════════════════════════ */

function PlannerView({ isMobile, tasks, onAdd, onUpdate, onDelete, asTab }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", priority: "medium", category: "" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const resetForm = () => { setForm({ title: "", description: "", due_date: "", priority: "medium", category: "" }); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onAdd({ title: form.title, description: form.description || null, due_date: form.due_date || null, priority: form.priority, category: form.category || null, status: "todo" });
    resetForm(); setSaving(false);
  };

  const cycleStatus = (task) => {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    onUpdate(task.id, { status: next });
  };

  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()).length;

  const priorityColor = (p) => p === "high" ? "#dc2626" : p === "medium" ? "#f59e0b" : "#16a34a";
  const statusLabel = (s) => s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Done";
  const statusIcon = (s) => s === "done" ? "✅" : s === "in_progress" ? "🔄" : "⬜";

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>{!asTab && <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}><PageHeader title="Planner" subtitle="Tasks & goals" isMobile={isMobile}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} {isMobile ? "Add" : "Add Task"}</GreenButton></PageHeader></div>}
      <div style={{ padding: asTab ? 0 : (isMobile ? "16px 12px" : "24px 32px") }}>
        {asTab && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Task</GreenButton></div>}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="To Do" value={todoCount} accent="#94a3b8" />
          <StatCard label="In Progress" value={inProgressCount} accent="#3b82f6" />
          <StatCard label="Done" value={doneCount} accent="#16a34a" />
          <StatCard label="Overdue" value={overdue} accent={overdue > 0 ? "#dc2626" : "#94a3b8"} />
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {["all", "todo", "in_progress", "done"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "6px 14px", borderRadius: 7, border: `1px solid ${filter === s ? "#16a34a" : "#e2e8f0"}`,
              background: filter === s ? "#f0fdf4" : "transparent", color: filter === s ? "#16a34a" : "#94a3b8",
              fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            }}>{s === "all" ? "All" : statusLabel(s)}</button>
          ))}
        </div>

        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text="New Task" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Due Date</label><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Work, Personal" style={inputStyle} className="sz-input" /></div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" style={inputStyle} className="sz-input" /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? "Saving..." : "Add Task"}</GreenButton>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{filter === "all" ? "No tasks yet — add one above" : `No ${statusLabel(filter).toLowerCase()} tasks`}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((task) => {
              const isOverdue = task.status !== "done" && task.due_date && new Date(task.due_date) < new Date();
              return (
                <div key={task.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${isOverdue ? "#fca5a5" : "#e2e8f0"}`, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <button onClick={() => cycleStatus(task)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 0, marginTop: 1, flexShrink: 0 }}>{statusIcon(task.status)}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: task.status === "done" ? "#94a3b8" : "#0f172a", fontFamily: "'DM Sans', sans-serif", textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${priorityColor(task.priority)}15`, color: priorityColor(task.priority), border: `1px solid ${priorityColor(task.priority)}30`, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{task.priority}</span>
                      {task.category && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>{task.category}</span>}
                      {task.due_date && <span style={{ fontSize: 11, color: isOverdue ? "#dc2626" : "#64748b", fontFamily: "'DM Mono', monospace", fontWeight: isOverdue ? 700 : 400 }}>{fmtDate(task.due_date)}{isOverdue && " · Overdue"}</span>}
                    </div>
                    {task.description && <p style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>{task.description}</p>}
                  </div>
                  <button onClick={() => { if (window.confirm("Delete?")) onDelete(task.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>{Icons.trash}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CALENDAR
   ═══════════════════════════════════════════════════════════ */

function CalendarView({ isMobile, events, onAdd, onDelete, asTab }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", event_date: new Date().toISOString().split("T")[0], start_time: "", end_time: "", category: "", description: "", color: "#16a34a" });
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const resetForm = () => { setForm({ title: "", event_date: selectedDate || today, start_time: "", end_time: "", category: "", description: "", color: "#16a34a" }); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onAdd({ title: form.title, event_date: form.event_date, start_time: form.start_time || null, end_time: form.end_time || null, category: form.category || null, description: form.description || null, color: form.color });
    resetForm(); setSaving(false);
  };

  const getEventsForDate = (dateStr) => events.filter((e) => e.event_date === dateStr);
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const monthEvents = events.filter((e) => e.event_date?.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));

  const colorOptions = ["#16a34a", "#3b82f6", "#7c3aed", "#dc2626", "#f59e0b", "#ec4899"];
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <>{!asTab && <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}><PageHeader title="Calendar" subtitle={`${monthEvents.length} event${monthEvents.length !== 1 ? "s" : ""} this month`} isMobile={isMobile}><GreenButton small onClick={() => { setSelectedDate(today); setForm({ ...form, event_date: today }); setShowForm(!showForm); }}>{Icons.plus} Event</GreenButton></PageHeader></div>}
      <div style={{ padding: asTab ? 0 : (isMobile ? "16px 12px" : "24px 32px") }}>
        {asTab && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><GreenButton small onClick={() => { setSelectedDate(today); setForm({ ...form, event_date: today }); setShowForm(!showForm); }}>{Icons.plus} Add Event</GreenButton></div>}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748b", padding: "4px 8px" }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif" }}>{monthName}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748b", padding: "4px 8px" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "8px 12px 0" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "6px 0", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 12px 12px", gap: 2 }}>
            {days.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = getEventsForDate(dateStr);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              return (
                <button key={i} onClick={() => { setSelectedDate(dateStr); setForm((f) => ({ ...f, event_date: dateStr })); }} style={{
                  background: isSelected ? "#16a34a" : isToday ? "#f0fdf4" : "transparent",
                  border: isToday && !isSelected ? "1.5px solid #16a34a" : "1.5px solid transparent",
                  borderRadius: 10, padding: "8px 4px", cursor: "pointer", minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? "#fff" : isToday ? "#16a34a" : "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div style={{ display: "flex", gap: 2 }}>
                      {dayEvents.slice(0, 3).map((ev, j) => (
                        <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : (ev.color || "#16a34a") }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text="New Event" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event name" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Date</label><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Finance, Personal" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Start Time</label><input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>End Time</label><input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Color</label><div style={{ display: "flex", gap: 6 }}>{colorOptions.map((c) => (<button key={c} onClick={() => setForm({ ...form, color: c })} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: form.color === c ? "3px solid #0f172a" : "3px solid transparent", cursor: "pointer", transition: "all 0.15s" }} />))}</div></div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" style={inputStyle} className="sz-input" /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? "Saving..." : "Add Event"}</GreenButton>
            </div>
          </div>
        )}

        {selectedDate && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px", marginBottom: 16 }}>
            <SectionHeader text={`Events · ${fmtDate(selectedDate)}`} />
            {selectedEvents.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No events on this day</div>
            ) : selectedEvents.map((ev) => (
              <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 4, borderRadius: 2, background: ev.color || "#16a34a", alignSelf: "stretch", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{ev.title}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "#64748b", flexWrap: "wrap" }}>
                    {ev.start_time && <span>{ev.start_time}{ev.end_time && ` – ${ev.end_time}`}</span>}
                    {ev.category && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#f0fdf4", color: "#16a34a" }}>{ev.category}</span>}
                  </div>
                  {ev.description && <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>{ev.description}</p>}
                </div>
                <button onClick={() => { if (window.confirm("Delete?")) onDelete(ev.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
              </div>
            ))}
          </div>
        )}

        {(() => {
          const upcoming = events.filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
          if (upcoming.length === 0) return null;
          return (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px" }}>
              <SectionHeader text={`Upcoming Events · ${upcoming.length}`} />
              {upcoming.map((ev) => (
                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: 4, borderRadius: 2, background: ev.color || "#16a34a", alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ minWidth: 48, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{new Date(ev.event_date + "T12:00").getDate()}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{new Date(ev.event_date + "T12:00").toLocaleDateString("en-US", { month: "short" })}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {ev.start_time && <span>{ev.start_time}{ev.end_time && ` – ${ev.end_time}`} · </span>}
                      {ev.event_date === today ? <span style={{ color: "#16a34a", fontWeight: 700 }}>Today</span> : fmtDate(ev.event_date)}
                    </div>
                  </div>
                  {ev.category && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#f0fdf4", color: "#16a34a", flexShrink: 0 }}>{ev.category}</span>}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </>
  );
}


/* — Monthly Bills Tab — */
function MonthlyBillsTab({ isMobile, bills, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", category: "Education", visibility: "personal", active: true, notes: "" });
  const [saving, setSaving] = useState(false);
  const categories = ["Education", "Childcare", "Food & Groceries", "Gas & Fuel", "Subscriptions", "Memberships", "Transportation", "Phone Plans", "Storage", "Donations", "Alimony/Support", "Other"];

  const resetForm = () => { setForm({ name: "", amount: "", category: "Education", visibility: "personal", active: true, notes: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    const payload = { name: form.name, amount: parseFloat(form.amount), category: form.category, visibility: form.visibility, active: form.active, notes: form.notes || null };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };
  const startEdit = (b) => { setForm({ name: b.name || "", amount: b.amount?.toString() || "", category: b.category || "Other", visibility: b.visibility || "personal", active: b.active !== false, notes: b.notes || "" }); setEditingId(b.id); setShowForm(true); };

  const activeBills = bills.filter((b) => b.active !== false);
  const totalMonthly = activeBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const byCategory = {};
  activeBills.forEach((b) => { byCategory[b.category || "Other"] = (byCategory[b.category || "Other"] || 0) + Number(b.amount || 0); });

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        <StatCard label="Monthly Total" value={fmtCurrency(totalMonthly)} accent="#dc2626" />
        <StatCard label="Active Bills" value={activeBills.length} accent="#3b82f6" />
        <StatCard label="Categories" value={Object.keys(byCategory).length} accent="#7c3aed" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Bill</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Monthly Bill" : "New Monthly Bill"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kids Tuition — Academy Prep" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Amount *</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Visibility</label><select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="personal">Personal</option><option value="business">Business</option></select></div>
            <div style={{ gridColumn: isMobile ? "1" : "2 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional details" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.amount}>{saving ? "..." : editingId ? "Update" : "Add Bill"}</GreenButton>
          </div>
        </div>
      )}
      {Object.keys(byCategory).length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
          <SectionHeader text="Category Breakdown" />
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => { const pct = totalMonthly > 0 ? Math.round((amt / totalMonthly) * 100) : 0; return (<div key={cat} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: 600 }}>{cat}</span><span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{fmtCurrencyExact(amt)} ({pct}%)</span></div><div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", borderRadius: 3 }} /></div></div>); })}
        </div>
      )}
      {bills.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Monthly Bills</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Track recurring expenses like tuition, subscriptions, memberships, and more.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add First Bill</GreenButton>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {bills.map((b) => (
            <div key={b.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${b.active !== false ? "#e2e8f0" : "#f1f5f9"}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, opacity: b.active !== false ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{b.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>{b.category}</span>
                  <VisibilityBadge visibility={b.visibility || "personal"} />
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626", flexShrink: 0 }}>{fmtCurrencyExact(b.amount)}<span style={{ fontSize: 10, fontWeight: 400, color: "#94a3b8" }}>/mo</span></div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => onUpdate(b.id, { active: !b.active })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2 }}>{b.active !== false ? "✅" : "⬜"}</button>
                <button onClick={() => startEdit(b)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#64748b" }}>{Icons.edit}</button>
                <button onClick={() => { if (window.confirm("Delete?")) onDelete(b.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   HOME & LIFE (Tabbed: Properties, Utilities, Calendar, Planner)
   ═══════════════════════════════════════════════════════════ */

function HomeLifeView({ isMobile, activeTab, onTabChange, homes, utilityBills, calendarEvents, plannerTasks, monthlyBills, onAddHome, onUpdateHome, onDeleteHome, onAddBill, onUpdateBill, onDeleteBill, onAddEvent, onDeleteEvent, onAddTask, onUpdateTask, onDeleteTask, onAddMonthlyBill, onUpdateMonthlyBill, onDeleteMonthlyBill, nested }) {
  const tab = activeTab || "homes";
  const setTab = onTabChange;
  const tabs = [
    { key: "homes", label: "Properties" },
    { key: "utilities", label: "Utilities" },
    { key: "bills", label: "Monthly Bills" },
    { key: "calendar", label: "Calendar" },
    { key: "planner", label: "Planner" },
  ];

  const content = (
    <>
      <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={isMobile} />
      {tab === "homes" && <HomesTab isMobile={isMobile} homes={homes} onAdd={onAddHome} onUpdate={onUpdateHome} onDelete={onDeleteHome} />}
      {tab === "utilities" && <UtilitiesTab isMobile={isMobile} homes={homes} utilityBills={utilityBills} onAdd={onAddBill} onUpdate={onUpdateBill} onDelete={onDeleteBill} />}
      {tab === "bills" && <MonthlyBillsTab isMobile={isMobile} bills={monthlyBills} onAdd={onAddMonthlyBill} onUpdate={onUpdateMonthlyBill} onDelete={onDeleteMonthlyBill} />}
      {tab === "calendar" && <CalendarView isMobile={isMobile} events={calendarEvents} onAdd={onAddEvent} onDelete={onDeleteEvent} asTab />}
      {tab === "planner" && <PlannerView isMobile={isMobile} tasks={plannerTasks} onAdd={onAddTask} onUpdate={onUpdateTask} onDelete={onDeleteTask} asTab />}
    </>
  );

  if (nested) return content;

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Home & Life" subtitle="Properties, utilities & planning" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>{content}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FAMILY (Tabbed: Members, Grades, Life Events, Prayer Wall)
   ═══════════════════════════════════════════════════════════ */

function FamilyView({ isMobile, activeTab, onTabChange, kids, grades, milestones, prayers, onAddKid, onUpdateKid, onDeleteKid, onAddGrade, onDeleteGrade, onAddMilestone, onDeleteMilestone, onAddPrayer, onUpdatePrayer, onDeletePrayer, nested }) {
  const tab = activeTab || "members";
  const setTab = onTabChange;

  const content = (
    <>
      <TabBar tabs={[{ key: "members", label: "Members" }, { key: "grades", label: "Grades" }, { key: "events", label: "Life Events" }, { key: "prayer", label: "Prayer Wall" }]} active={tab} onChange={setTab} isMobile={isMobile} />
      {tab === "members" && <FamilyMembersTab isMobile={isMobile} kids={kids} onAdd={onAddKid} onUpdate={onUpdateKid} onDelete={onDeleteKid} />}
      {tab === "grades" && <GradesTab isMobile={isMobile} kids={kids} grades={grades} onAdd={onAddGrade} onDelete={onDeleteGrade} />}
      {tab === "events" && <LifeEventsTab isMobile={isMobile} kids={kids} milestones={milestones} onAdd={onAddMilestone} onDelete={onDeleteMilestone} />}
      {tab === "prayer" && <PrayerWallTab isMobile={isMobile} prayers={prayers} onAdd={onAddPrayer} onUpdate={onUpdatePrayer} onDelete={onDeletePrayer} />}
    </>
  );

  if (nested) return content;

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Family" subtitle="Members, milestones & prayer wall" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>{content}</div>
    </div>
  );
}

/* — Family Members Tab (replaces old Kids-only tab) — */
function FamilyMembersTab({ isMobile, kids, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", date_of_birth: "", school: "", grade_level: "", notes: "", role: "Child" });
  const [saving, setSaving] = useState(false);

  const roles = ["Parent", "Child", "Spouse", "Grandparent", "Other"];
  const resetForm = () => { setForm({ name: "", date_of_birth: "", school: "", grade_level: "", notes: "", role: "Child" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name, role: form.role, date_of_birth: form.date_of_birth || null, school: form.school || null, grade_level: form.grade_level || null, notes: form.notes || null };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };
  const startEdit = (kid) => { setForm({ name: kid.name || "", role: kid.role || "Child", date_of_birth: kid.date_of_birth || "", school: kid.school || "", grade_level: kid.grade_level || "", notes: kid.notes || "" }); setEditingId(kid.id); setShowForm(true); };

  const getAge = (dob) => { if (!dob) return null; const d = new Date(dob); const now = new Date(); let age = now.getFullYear() - d.getFullYear(); if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--; return age; };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const roleColor = (role) => {
    switch(role) {
      case "Parent": case "Spouse": return { bg: "linear-gradient(135deg, #16a34a, #15803d)", border: "#bbf7d0" };
      case "Child": return { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "#bfdbfe" };
      case "Grandparent": return { bg: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "#e9d5ff" };
      default: return { bg: "linear-gradient(135deg, #f59e0b, #d97706)", border: "#fde68a" };
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Member</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Family Member" : "New Family Member"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} style={inputStyle} className="sz-input" /></div>
            {form.role === "Child" && <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>School</label><input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="School name" style={inputStyle} className="sz-input" /></div>}
            {form.role === "Child" && <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Grade Level</label><input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="e.g. 5th Grade" style={inputStyle} className="sz-input" /></div>}
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : editingId ? "Update" : "Add Member"}</GreenButton>
          </div>
        </div>
      )}
      {kids.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#16a34a" }}>{Icons.users}</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Family Members</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Add your family members — parents, children, everyone.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add First Member</GreenButton>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {kids.map((kid) => {
            const age = getAge(kid.date_of_birth);
            const rc = roleColor(kid.role || "Child");
            return (
              <div key={kid.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: rc.bg }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{kid.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{kid.name}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${rc.border}40`, color: "#475569", border: `1px solid ${rc.border}`, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{kid.role || "Child"}</span>
                      {age != null && <span style={{ fontSize: 11, color: "#64748b" }}>Age {age}</span>}
                      {kid.grade_level && <span style={{ fontSize: 11, color: "#64748b" }}>· {kid.grade_level}</span>}
                      {kid.school && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {kid.school}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(kid)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#64748b" }}>{Icons.edit}</button>
                    <button onClick={() => { if (window.confirm("Remove " + kid.name + "?")) onDelete(kid.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                  </div>
                </div>
                {kid.notes && <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.4 }}>{kid.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
/* — Grades Tab — */
function GradesTab({ isMobile, kids, grades, onAdd, onDelete }) {
  const [selectedKid, setSelectedKid] = useState(kids[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const curYear = new Date().getFullYear();
  const [form, setForm] = useState({ subject: "", grade: "", term: "", year: curYear, notes: "" });
  const [saving, setSaving] = useState(false);

  const subjects = ["Math", "Science", "English", "History", "Reading", "Writing", "Art", "Music", "PE", "Spanish", "Other"];
  const gradeOptions = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
  const terms = ["Q1", "Q2", "Q3", "Q4", "Semester 1", "Semester 2", "Final"];
  const gradeColor = (g) => { if (!g) return "#94a3b8"; const l = g.charAt(0); if (l === "A") return "#16a34a"; if (l === "B") return "#3b82f6"; if (l === "C") return "#f59e0b"; if (l === "D") return "#f97316"; return "#dc2626"; };

  const resetForm = () => { setForm({ subject: "", grade: "", term: "", year: curYear, notes: "" }); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.subject || !form.grade || !selectedKid) return;
    setSaving(true);
    await onAdd({ kid_id: selectedKid, subject: form.subject, grade: form.grade, term: form.term || null, year: form.year, notes: form.notes || null });
    resetForm(); setSaving(false);
  };

  const kidGrades = grades.filter((g) => g.kid_id === selectedKid);
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  if (kids.length === 0) return <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Add kids first in the Kids tab</div>;

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {kids.map((k) => (
          <button key={k.id} onClick={() => setSelectedKid(k.id)} style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${selectedKid === k.id ? "#3b82f6" : "#e2e8f0"}`, background: selectedKid === k.id ? "#eff6ff" : "#fff", color: selectedKid === k.id ? "#3b82f6" : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{k.name}</button>
        ))}
        <div style={{ flex: 1 }} />
        <GreenButton small onClick={() => setShowForm(!showForm)}>{Icons.plus} Add Grade</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}><option value="">Subject...</option>{subjects.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}><option value="">Grade...</option>{gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}</select>
            <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}><option value="">Term...</option>{terms.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || curYear })} style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.subject || !form.grade}>{saving ? "..." : "Add"}</GreenButton>
          </div>
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Grades · {kidGrades.length}</div>
        {kidGrades.length === 0 ? (<div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No grades for this kid yet</div>) : (
          <div style={{ padding: "4px 18px" }}>
            {kidGrades.map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
                <div><span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{g.subject}</span>{g.term && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{g.term} {g.year}</span>}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: gradeColor(g.grade), fontFamily: "'Playfair Display', serif" }}>{g.grade}</span>
                  <button onClick={() => { if (window.confirm("Delete?")) onDelete(g.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* — Life Events Tab — */
function LifeEventsTab({ isMobile, kids, milestones, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ kid_id: "", title: "", date: new Date().toISOString().split("T")[0], description: "" });
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({ kid_id: "", title: "", date: new Date().toISOString().split("T")[0], description: "" }); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onAdd({ kid_id: form.kid_id || null, title: form.title, date: form.date || null, description: form.description || null });
    resetForm(); setSaving(false);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Event</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. First day of school" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            {kids.length > 0 && <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Kid (optional)</label><select value={form.kid_id} onChange={(e) => setForm({ ...form, kid_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Family-wide</option>{kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></div>}
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? "..." : "Add"}</GreenButton>
          </div>
        </div>
      )}
      {milestones.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No life events recorded yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {milestones.map((m) => {
            const kid = kids.find((k) => k.id === m.kid_id);
            return (
              <div key={m.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#16a34a", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{m.title}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 11, color: "#94a3b8" }}>
                    {m.date && <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmtDate(m.date)}</span>}
                    {kid && <span style={{ padding: "1px 8px", borderRadius: 5, background: "#eff6ff", color: "#3b82f6", fontWeight: 600, fontSize: 10 }}>{kid.name}</span>}
                  </div>
                  {m.description && <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>{m.description}</p>}
                </div>
                <button onClick={() => { if (window.confirm("Delete?")) onDelete(m.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* — Prayer Wall Tab — */
function PrayerWallTab({ isMobile, prayers, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "General" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("active");

  const categories = ["General", "Health", "Family", "Work", "Finances", "Relationships", "Gratitude", "Other"];

  const resetForm = () => { setForm({ title: "", description: "", category: "General" }); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onAdd({ title: form.title, description: form.description || null, category: form.category });
    resetForm(); setSaving(false);
  };

  const filtered = prayers.filter((p) => filter === "all" ? true : filter === "active" ? !p.answered : p.answered);
  const answeredCount = prayers.filter((p) => p.answered).length;

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Active Prayers" value={prayers.length - answeredCount} accent="#7c3aed" />
        <StatCard label="Answered" value={answeredCount} accent="#16a34a" />
        <StatCard label="Total" value={prayers.length} accent="#3b82f6" />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {["active", "answered", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${filter === f ? "#7c3aed" : "#e2e8f0"}`, background: filter === f ? "#faf5ff" : "transparent", color: filter === f ? "#7c3aed" : "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
        ))}
        <div style={{ flex: 1 }} />
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Prayer</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #7c3aed", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Prayer *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What are you praying for?" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Details</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim()} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>{saving ? "..." : "Add Prayer"}</GreenButton>
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🙏</div>
          <p style={{ fontSize: 13, color: "#94a3b8" }}>{filter === "answered" ? "No answered prayers yet" : "No active prayers — add one above"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${p.answered ? "#bbf7d0" : "#e9d5ff"}`, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: p.answered ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #7c3aed, #6d28d9)" }} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <button onClick={() => onUpdate(p.id, { answered: !p.answered, answered_date: !p.answered ? new Date().toISOString().split("T")[0] : null })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 0, marginTop: 0, flexShrink: 0 }}>{p.answered ? "✅" : "🙏"}</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: p.answered ? "#94a3b8" : "#0f172a", textDecoration: p.answered ? "line-through" : "none" }}>{p.title}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>{p.category}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{fmtDate(p.created_at)}</span>
                    {p.answered && p.answered_date && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>Answered {fmtDate(p.answered_date)}</span>}
                  </div>
                  {p.description && <p style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>{p.description}</p>}
                </div>
                <button onClick={() => { if (window.confirm("Delete?")) onDelete(p.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>{Icons.trash}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   HEALTH (Tabbed: Check-in, Supplements, Meal Planning, Blood Work)
   ═══════════════════════════════════════════════════════════ */

const MemberPicker = ({ members, selected, onChange, onAddMember, isMobile, currentEmail }) => {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Spouse");
  const [saving, setSaving] = useState(false);
  const roles = ["Self", "Spouse", "Child", "Parent", "Other"];
  const handleAdd = async () => { if (!newName.trim()) return; setSaving(true); await onAddMember({ name: newName, role: newRole, email: newEmail || null }); setNewName(""); setNewEmail(""); setNewRole("Spouse"); setAdding(false); setSaving(false); };

  const currentMember = members.find((m) => m.id === selected);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {members.map((m) => {
          const isMe = m.email === currentEmail;
          return (
            <button key={m.id} onClick={() => onChange(m.id)} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${selected === m.id ? "#16a34a" : "#e2e8f0"}`, background: selected === m.id ? "#f0fdf4" : "#fff", color: selected === m.id ? "#16a34a" : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: selected === m.id ? "#16a34a" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: selected === m.id ? "#fff" : "#94a3b8" }}>{m.name.charAt(0)}</div>
              {m.name}
              {isMe && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#eff6ff", color: "#3b82f6", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>YOU</span>}
            </button>
          );
        })}
        <button onClick={() => setAdding(!adding)} style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px dashed #bbf7d0", background: "transparent", color: "#16a34a", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
      </div>
      {currentMember && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>Viewing data for <strong style={{ color: "#0f172a" }}>{currentMember.name}</strong>{currentMember.email && <span> · {currentMember.email}</span>}</p>}
      {adding && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" style={{ padding: "7px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", width: 130, fontFamily: "'DM Sans', sans-serif" }} className="sz-input" />
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email (to link login)" style={{ padding: "7px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", width: 190, fontFamily: "'DM Sans', sans-serif" }} className="sz-input" />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ padding: "7px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 7, cursor: "pointer" }}>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          <GreenButton small onClick={handleAdd} disabled={saving || !newName.trim()}>{saving ? "..." : "Add"}</GreenButton>
          <button onClick={() => setAdding(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>Cancel</button>
        </div>
      )}
    </div>
  );
};


function HealthView({ isMobile, activeTab, onTabChange, session, familyMembers, checkins, supplements, meals, bloodWork, scorecards, doseLogs, bodyLogs, onAddMember, onAddCheckin, onDeleteCheckin, onAddSupplement, onUpdateSupplement, onDeleteSupplement, onAddMeal, onDeleteMeal, onAddBloodWork, onDeleteBloodWork, onAddScorecard, onDeleteScorecard, onAddDoseLog, onDeleteDoseLog, onAddBodyLog, onDeleteBodyLog, nested }) {
  const tab = activeTab || "scorecard";
  const setTab = onTabChange;
  const currentEmail = session?.user?.email || "";

  // Silently use the current user's family member
  const myMember = familyMembers.find((m) => m.email === currentEmail) || familyMembers[0];
  const selectedMember = myMember?.id || null;

  // Auto-create a family_member for the logged-in user if none exists with their email
  const [hasCreated, setHasCreated] = useState(false);
  useEffect(() => {
    if (nested || hasCreated) return;
    if (!familyMembers.some((m) => m.email === currentEmail) && currentEmail) {
      setHasCreated(true);
      const userName = session?.user?.user_metadata?.full_name || fmtUserName(currentEmail);
      onAddMember({ name: userName, role: "Self", email: currentEmail });
    }
  }, [familyMembers.length, currentEmail, nested, hasCreated]);

  const content = (
    <>
      {familyMembers.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💪</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>Setting Up Health Tracking</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>We're creating your profile automatically — refresh in a moment.</p>
        </div>
      ) : (
        <>
          <TabBar tabs={[{ key: "scorecard", label: "⭐ Scorecard" }, { key: "dosing", label: "💉 Dosing" }, { key: "body", label: "🏋️ Body" }, { key: "supplements", label: "💊 Supplements" }, { key: "meals", label: "🍽️ Meals" }, { key: "bloodwork", label: "🩸 Blood Work" }]} active={tab} onChange={setTab} isMobile={isMobile} />
          {tab === "dosing" && <DosingTab isMobile={isMobile} memberId={selectedMember} supplements={supplements.filter((s) => s.member_id === selectedMember && s.active)} doseLogs={doseLogs.filter((d) => d.member_id === selectedMember)} onAddLog={onAddDoseLog} onDeleteLog={onDeleteDoseLog} />}
          {tab === "body" && <BodyPerformanceTab isMobile={isMobile} memberId={selectedMember} bodyLogs={bodyLogs.filter((b) => b.member_id === selectedMember)} onAdd={onAddBodyLog} onDelete={onDeleteBodyLog} />}
          {tab === "checkin" && <HealthCheckinTab isMobile={isMobile} memberId={selectedMember} checkins={checkins.filter((c) => c.member_id === selectedMember)} onAdd={onAddCheckin} onDelete={onDeleteCheckin} />}
          {tab === "supplements" && <SupplementsTab isMobile={isMobile} memberId={selectedMember} familyMembers={familyMembers} supplements={supplements.filter((s) => s.member_id === selectedMember)} onAdd={onAddSupplement} onUpdate={onUpdateSupplement} onDelete={onDeleteSupplement} />}
          {tab === "meals" && <MealPlanningTab isMobile={isMobile} memberId={selectedMember} meals={meals.filter((m) => m.member_id === selectedMember)} onAdd={onAddMeal} onDelete={onDeleteMeal} />}
          {tab === "bloodwork" && <BloodWorkTab isMobile={isMobile} memberId={selectedMember} bloodWork={bloodWork.filter((b) => b.member_id === selectedMember)} onAdd={onAddBloodWork} onDelete={onDeleteBloodWork} />}
          {tab === "scorecard" && <ScorecardTab isMobile={isMobile} memberId={selectedMember} scorecards={scorecards.filter((s) => s.member_id === selectedMember || !s.member_id)} onAdd={onAddScorecard} onDelete={onDeleteScorecard} />}
        </>
      )}
    </>
  );

  if (nested) return content;

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Health" subtitle="Wellness tracking for the whole family" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>{content}</div>
    </div>
  );
}


/* — Dosing Schedule Tab — */
function DosingTab({ isMobile, memberId, supplements, doseLogs, onAddLog, onDeleteLog }) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [showAddItem, setShowAddItem] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDosage, setCustomDosage] = useState("");
  const [saving, setSaving] = useState(false);

  const dayLogs = doseLogs.filter((d) => d.date === selectedDate);

  const isDue = (supp) => {
    const freq = supp.frequency;
    if (freq === "Daily" || freq === "Twice Daily") return true;
    if (freq === "As Needed") return true;
    if (freq === "Weekly") {
      const dow = new Date(selectedDate + "T12:00").getDay();
      return dow === 1; // Monday default for weekly
    }
    if (freq === "Every Other Day") {
      const start = new Date("2026-01-01");
      const sel = new Date(selectedDate + "T12:00");
      const diff = Math.floor((sel - start) / (1000 * 60 * 60 * 24));
      return diff % 2 === 0;
    }
    return true;
  };

  const dueSupplements = supplements.filter(isDue);

  const isLogged = (suppId, timeSlot) => dayLogs.some((l) => l.supplement_id === suppId && (l.time_slot || "dose") === timeSlot);

  const toggleDose = async (supp, timeSlot) => {
    const existing = dayLogs.find((l) => l.supplement_id === supp.id && (l.time_slot || "dose") === timeSlot);
    if (existing) {
      await onDeleteLog(existing.id);
    } else {
      setSaving(true);
      await onAddLog({ member_id: memberId, supplement_id: supp.id, supplement_name: supp.name, dosage: supp.dosage, date: selectedDate, time_slot: timeSlot, time_taken: new Date().toISOString() });
      setSaving(false);
    }
  };

  const addCustomDose = async () => {
    if (!customName.trim()) return;
    setSaving(true);
    await onAddLog({ member_id: memberId, supplement_id: null, supplement_name: customName, dosage: customDosage || null, date: selectedDate, time_slot: "dose", time_taken: new Date().toISOString() });
    setCustomName(""); setCustomDosage(""); setShowAddItem(false); setSaving(false);
  };

  const totalDue = dueSupplements.reduce((s, sup) => s + (sup.frequency === "Twice Daily" ? 2 : 1), 0);
  const totalLogged = dueSupplements.reduce((s, sup) => {
    if (sup.frequency === "Twice Daily") return s + (isLogged(sup.id, "morning") ? 1 : 0) + (isLogged(sup.id, "evening") ? 1 : 0);
    return s + (isLogged(sup.id, "dose") ? 1 : 0);
  }, 0);
  const completionPct = totalDue > 0 ? Math.round((totalLogged / totalDue) * 100) : 0;

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'DM Mono', monospace" }} />
        {selectedDate === today && <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", padding: "4px 10px", borderRadius: 6, background: "#f0fdf4" }}>Today</span>}
        <div style={{ flex: 1 }} />
        <GreenButton small onClick={() => setShowAddItem(!showAddItem)}>{Icons.plus} Custom Dose</GreenButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <StatCard label="Completion" value={`${completionPct}%`} accent={completionPct === 100 ? "#16a34a" : completionPct >= 50 ? "#f59e0b" : "#dc2626"} />
        <StatCard label="Logged" value={`${totalLogged}/${totalDue}`} accent="#3b82f6" />
        <StatCard label="Scheduled" value={dueSupplements.length} accent="#7c3aed" />
      </div>
      {showAddItem && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #16a34a", padding: "14px 18px", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", animation: "fadeUp 0.2s ease" }}>
          <div style={{ flex: 1, minWidth: 120 }}><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Name</label><input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Peptide injection" style={inputStyle} className="sz-input" /></div>
          <div style={{ width: 100 }}><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Dosage</label><input value={customDosage} onChange={(e) => setCustomDosage(e.target.value)} placeholder="e.g. 1ml" style={inputStyle} className="sz-input" /></div>
          <GreenButton small onClick={addCustomDose} disabled={saving || !customName.trim()}>{saving ? "..." : "Log"}</GreenButton>
        </div>
      )}
      {dueSupplements.length === 0 && dayLogs.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💉</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Doses Scheduled</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Add supplements in the 💊 Supplements tab, or log a custom dose above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {dueSupplements.map((supp) => {
            const slots = supp.frequency === "Twice Daily" ? [{ key: "morning", label: "AM" }, { key: "evening", label: "PM" }] : [{ key: "dose", label: supp.time_of_day || "Dose" }];
            return (
              <div key={supp.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💊</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{supp.name}{supp.dosage && <span style={{ color: "#64748b", fontWeight: 400 }}> · {supp.dosage}</span>}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{supp.frequency}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {slots.map((slot) => {
                      const done = isLogged(supp.id, slot.key);
                      return (
                        <button key={slot.key} onClick={() => toggleDose(supp, slot.key)} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${done ? "#16a34a" : "#e2e8f0"}`, background: done ? "#f0fdf4" : "#fff", color: done ? "#16a34a" : "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          {done ? "✓" : "○"} {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {dayLogs.filter((l) => !l.supplement_id).map((l) => (
            <div key={l.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #bbf7d0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💉</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{l.supplement_name}{l.dosage && <span style={{ color: "#64748b", fontWeight: 400 }}> · {l.dosage}</span>}</div>
                <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Logged {new Date(l.time_taken).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
              </div>
              <button onClick={() => { if (window.confirm("Remove?")) onDeleteLog(l.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* — Body & Performance Tab — */
function BodyPerformanceTab({ isMobile, memberId, bodyLogs, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const emptyForm = { date: new Date().toISOString().split("T")[0], weight: "", body_fat: "", vascularity: 5, energy: 5, sleep_quality: 5, mental_sharpness: 5, mood: 5, workout_type: "", workout_rating: 5, notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm(emptyForm); setShowForm(false); };
  const handleSubmit = async () => {
    setSaving(true);
    await onAdd({ member_id: memberId, date: form.date, weight: form.weight ? parseFloat(form.weight) : null, body_fat: form.body_fat ? parseFloat(form.body_fat) : null, vascularity: form.vascularity, energy: form.energy, sleep_quality: form.sleep_quality, mental_sharpness: form.mental_sharpness, mood: form.mood, workout_type: form.workout_type || null, workout_rating: form.workout_rating, notes: form.notes || null });
    resetForm(); setSaving(false);
  };

  const latest = bodyLogs[0];
  const prev = bodyLogs[1];
  const weightChange = latest?.weight && prev?.weight ? (Number(latest.weight) - Number(prev.weight)).toFixed(1) : null;
  const scoreColor = (s) => s >= 8 ? "#16a34a" : s >= 6 ? "#3b82f6" : s >= 4 ? "#f59e0b" : "#dc2626";
  const workoutTypes = ["Weights", "Cardio", "HIIT", "Yoga", "Sports", "Walking", "Calisthenics", "Rest Day", "Other"];

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const SliderField = ({ label, emoji, value, onChange }) => (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{emoji} {label}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(value), fontFamily: "'Playfair Display', serif" }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(parseInt(e.target.value))} style={{ width: "100%", accentColor: scoreColor(value) }} />
    </div>
  );

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
        <StatCard label="Weight" value={latest?.weight ? `${latest.weight} lbs` : "—"} accent="#16a34a" />
        <StatCard label="Body Fat" value={latest?.body_fat ? `${latest.body_fat}%` : "—"} accent="#3b82f6" />
        <StatCard label="Energy" value={latest ? `${latest.energy}/10` : "—"} accent="#f59e0b" />
        <StatCard label="Sharpness" value={latest ? `${latest.mental_sharpness}/10` : "—"} accent="#7c3aed" />
        {weightChange && <StatCard label="Weight Δ" value={`${Number(weightChange) > 0 ? "+" : ""}${weightChange} lbs`} accent={Number(weightChange) <= 0 ? "#16a34a" : "#f59e0b"} />}
        <StatCard label="Check-ins" value={bodyLogs.length} accent="#94a3b8" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Log Check-in</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text="Body & Performance Check-in" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Weight (lbs)</label><input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 185" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Body Fat %</label><input type="number" step="0.1" value={form.body_fat} onChange={(e) => setForm({ ...form, body_fat: e.target.value })} placeholder="e.g. 12.5" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Workout Type</label><select value={form.workout_type} onChange={(e) => setForm({ ...form, workout_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Select...</option>{workoutTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <SectionHeader text="Performance Ratings" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <SliderField label="Vascularity" emoji="💪" value={form.vascularity} onChange={(v) => setForm({ ...form, vascularity: v })} />
            <SliderField label="Energy" emoji="⚡" value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} />
            <SliderField label="Sleep Quality" emoji="😴" value={form.sleep_quality} onChange={(v) => setForm({ ...form, sleep_quality: v })} />
            <SliderField label="Mental Sharpness" emoji="🧠" value={form.mental_sharpness} onChange={(v) => setForm({ ...form, mental_sharpness: v })} />
            <SliderField label="Mood" emoji="😎" value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} />
            <SliderField label="Workout" emoji="🏋️" value={form.workout_rating} onChange={(v) => setForm({ ...form, workout_rating: v })} />
          </div>
          <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How are you feeling? Any observations?" style={inputStyle} className="sz-input" /></div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving}>{saving ? "..." : "Log Check-in"}</GreenButton>
          </div>
        </div>
      )}
      {bodyLogs.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏋️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>Track Peak Performance</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Log weight, body fat, vascularity, energy, sleep, mental sharpness, and mood.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} First Check-in</GreenButton>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {bodyLogs.map((log) => {
            const avg = Math.round((Number(log.vascularity || 0) + Number(log.energy || 0) + Number(log.sleep_quality || 0) + Number(log.mental_sharpness || 0) + Number(log.mood || 0) + Number(log.workout_rating || 0)) / 6);
            return (
              <div key={log.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${scoreColor(avg)}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(avg), fontFamily: "'Playfair Display', serif" }}>{avg}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{fmtDate(log.date)}{log.workout_type && <span style={{ color: "#64748b", fontWeight: 400 }}> · {log.workout_type}</span>}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3, fontSize: 11, color: "#64748b" }}>
                      {log.weight && <span>⚖️ {log.weight} lbs</span>}
                      {log.body_fat && <span>📊 {log.body_fat}%</span>}
                    </div>
                  </div>
                  <button onClick={() => { if (window.confirm("Delete?")) onDelete(log.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>{Icons.trash}</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                  {[{ l: "💪", v: log.vascularity }, { l: "⚡", v: log.energy }, { l: "😴", v: log.sleep_quality }, { l: "🧠", v: log.mental_sharpness }, { l: "😎", v: log.mood }, { l: "🏋️", v: log.workout_rating }].map((m, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "4px 0" }}>
                      <div style={{ fontSize: 12 }}>{m.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor(m.v), fontFamily: "'DM Mono', monospace" }}>{m.v}</div>
                    </div>
                  ))}
                </div>
                {log.notes && <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{log.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* — Check-in Tab — */
function HealthCheckinTab({ isMobile, memberId, checkins, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], workout_rating: 5, workout_type: "", energy_level: 5, sleep_hours: "", weight: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const workoutTypes = ["Weights", "Cardio", "HIIT", "Yoga", "Sports", "Walking", "Rest Day", "Other"];

  const resetForm = () => { setForm({ date: new Date().toISOString().split("T")[0], workout_rating: 5, workout_type: "", energy_level: 5, sleep_hours: "", weight: "", notes: "" }); setShowForm(false); };
  const handleSubmit = async () => { setSaving(true); await onAdd({ member_id: memberId, date: form.date, workout_rating: form.workout_rating, workout_type: form.workout_type || null, energy_level: form.energy_level, sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null, weight: form.weight ? parseFloat(form.weight) : null, notes: form.notes || null }); resetForm(); setSaving(false); };

  const latest = checkins[0];
  const avgWorkout = checkins.length > 0 ? (checkins.reduce((s, c) => s + Number(c.workout_rating || 0), 0) / checkins.length).toFixed(1) : "—";
  const scoreColor = (s) => s >= 8 ? "#16a34a" : s >= 6 ? "#3b82f6" : s >= 4 ? "#f59e0b" : "#dc2626";

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Avg Workout" value={avgWorkout !== "—" ? `${avgWorkout}/10` : "—"} accent="#dc2626" />
        <StatCard label="Check-ins" value={checkins.length} accent="#3b82f6" />
        <StatCard label="Latest Energy" value={latest ? `${latest.energy_level}/10` : "—"} accent="#f59e0b" />
        <StatCard label="Latest Weight" value={latest?.weight ? `${latest.weight} lbs` : "—"} accent="#16a34a" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Check-in</GreenButton></div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Workout Type</label><select value={form.workout_type} onChange={(e) => setForm({ ...form, workout_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Select...</option>{workoutTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>💪 Workout Rating</span><span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(form.workout_rating), fontFamily: "'Playfair Display', serif" }}>{form.workout_rating}</span></div>
              <input type="range" min={1} max={10} value={form.workout_rating} onChange={(e) => setForm({ ...form, workout_rating: parseInt(e.target.value) })} style={{ width: "100%", accentColor: scoreColor(form.workout_rating) }} />
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>⚡ Energy Level</span><span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(form.energy_level), fontFamily: "'Playfair Display', serif" }}>{form.energy_level}</span></div>
              <input type="range" min={1} max={10} value={form.energy_level} onChange={(e) => setForm({ ...form, energy_level: parseInt(e.target.value) })} style={{ width: "100%", accentColor: scoreColor(form.energy_level) }} />
            </div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Sleep (hours)</label><input type="number" step="0.5" value={form.sleep_hours} onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })} placeholder="e.g. 7.5" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Weight (lbs)</label><input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 185" style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How did you feel?" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving}>{saving ? "..." : "Log Check-in"}</GreenButton>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checkins.length === 0 ? (<div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No check-ins yet</div>) : checkins.map((c) => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${scoreColor(c.workout_rating)}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(c.workout_rating), fontFamily: "'Playfair Display', serif" }}>{c.workout_rating}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{c.workout_type || "Workout"} · <span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtDate(c.date)}</span></div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#64748b" }}>
                <span>⚡ {c.energy_level}/10</span>
                {c.sleep_hours && <span>😴 {c.sleep_hours}h</span>}
                {c.weight && <span>⚖️ {c.weight} lbs</span>}
              </div>
              {c.notes && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{c.notes}</p>}
            </div>
            <button onClick={() => { if (window.confirm("Delete?")) onDelete(c.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* — Supplements Tab — */
function SupplementsTab({ isMobile, memberId, familyMembers, supplements, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dosage: "", frequency: "Daily", time_of_day: "Morning", notes: "" });
  const [saving, setSaving] = useState(false);
  const frequencies = ["Daily", "Twice Daily", "Weekly", "As Needed"];
  const times = ["Morning", "Afternoon", "Evening", "Night", "With Meals"];

  const resetForm = () => { setForm({ name: "", dosage: "", frequency: "Daily", time_of_day: "Morning", notes: "" }); setShowForm(false); };
  const handleSubmit = async () => { if (!form.name.trim()) return; setSaving(true); await onAdd({ member_id: memberId, name: form.name, dosage: form.dosage || null, frequency: form.frequency, time_of_day: form.time_of_day, notes: form.notes || null }); resetForm(); setSaving(false); };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const active = supplements.filter((s) => s.active);
  const inactive = supplements.filter((s) => !s.active);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{active.length} active · {inactive.length} inactive</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Supplement *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vitamin D3" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Dosage</label><input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 5000 IU" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Frequency</label><select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{frequencies.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Time of Day</label><select value={form.time_of_day} onChange={(e) => setForm({ ...form, time_of_day: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{times.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : "Add"}</GreenButton>
          </div>
        </div>
      )}
      {supplements.length === 0 ? (<div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No supplements tracked</div>) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {supplements.map((s) => (
            <div key={s.id} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${s.active ? "#e2e8f0" : "#f1f5f9"}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, opacity: s.active ? 1 : 0.6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.active ? "#f0fdf4" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{s.name}{s.dosage && <span style={{ color: "#64748b", fontWeight: 400 }}> · {s.dosage}</span>}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.frequency} · {s.time_of_day}</div>
              </div>
              <select value={s.member_id || ""} onChange={(e) => onUpdate(s.id, { member_id: e.target.value })} style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", fontSize: 10, fontWeight: 600, color: "#64748b", cursor: "pointer", background: "#f8fafc", maxWidth: 80 }}>{(familyMembers || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <button onClick={() => onUpdate(s.id, { active: !s.active })} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: s.active ? "#f0fdf4" : "#f8fafc", fontSize: 10, fontWeight: 600, color: s.active ? "#16a34a" : "#94a3b8", cursor: "pointer" }}>{s.active ? "Active" : "Paused"}</button>
              <button onClick={() => { if (window.confirm("Delete?")) onDelete(s.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* — Meal Planning Tab — */
function MealPlanningTab({ isMobile, memberId, meals, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], meal_type: "Lunch", food_name: "", calories: "", protein: "", carbs: "", fat: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-Workout", "Post-Workout"];

  const resetForm = () => { setForm({ date: filterDate, meal_type: "Lunch", food_name: "", calories: "", protein: "", carbs: "", fat: "", notes: "" }); setShowForm(false); };
  const handleSubmit = async () => { if (!form.food_name.trim()) return; setSaving(true); await onAdd({ member_id: memberId, date: form.date, meal_type: form.meal_type, food_name: form.food_name, calories: form.calories ? parseInt(form.calories) : null, protein: form.protein ? parseFloat(form.protein) : null, carbs: form.carbs ? parseFloat(form.carbs) : null, fat: form.fat ? parseFloat(form.fat) : null, notes: form.notes || null }); resetForm(); setSaving(false); };

  const dayMeals = meals.filter((m) => m.date === filterDate);
  const totalCal = dayMeals.reduce((s, m) => s + Number(m.calories || 0), 0);
  const totalProtein = dayMeals.reduce((s, m) => s + Number(m.protein || 0), 0);

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono', monospace" }} />
        <StatCard label="Calories" value={totalCal || "—"} accent="#f59e0b" />
        <StatCard label="Protein" value={totalProtein ? `${totalProtein.toFixed(0)}g` : "—"} accent="#dc2626" />
        <div style={{ flex: 1 }} />
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Food</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Food *</label><input value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} placeholder="e.g. Grilled Chicken" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Meal</label><select value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{mealTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Calories</label><input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder="kcal" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Protein (g)</label><input type="number" step="0.1" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Carbs (g)</label><input type="number" step="0.1" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.food_name.trim()}>{saving ? "..." : "Add"}</GreenButton>
          </div>
        </div>
      )}
      {mealTypes.map((type) => {
        const typeMeals = dayMeals.filter((m) => m.meal_type === type);
        if (typeMeals.length === 0) return null;
        return (
          <div key={type} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontWeight: 700, color: "#0f172a", background: "#f8fafc" }}>{type}</div>
            {typeMeals.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #f8fafc" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{m.food_name}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 2, fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>
                    {m.calories && <span>{m.calories} cal</span>}
                    {m.protein && <span>{m.protein}g P</span>}
                    {m.carbs && <span>{m.carbs}g C</span>}
                    {m.fat && <span>{m.fat}g F</span>}
                  </div>
                </div>
                <button onClick={() => { if (window.confirm("Delete?")) onDelete(m.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
              </div>
            ))}
          </div>
        );
      })}
      {dayMeals.length === 0 && <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No meals logged for this day</div>}
    </>
  );
}

/* — Blood Work Tab — */
function BloodWorkTab({ isMobile, memberId, bloodWork, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], lab_name: "", filename: "", file_type: "PDF", notes: "" });
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({ date: new Date().toISOString().split("T")[0], lab_name: "", filename: "", file_type: "PDF", notes: "" }); setShowForm(false); };
  const handleSubmit = async () => { if (!form.filename.trim()) return; setSaving(true); await onAdd({ member_id: memberId, date: form.date, lab_name: form.lab_name || null, filename: form.filename, file_type: form.file_type, notes: form.notes || null }); resetForm(); setSaving(false); };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{bloodWork.length} record{bloodWork.length !== 1 ? "s" : ""}</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Upload</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>File Name *</label><input value={form.filename} onChange={(e) => setForm({ ...form, filename: e.target.value })} placeholder="e.g. bloodwork_march2026.pdf" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>File Type</label><select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="PDF">PDF</option><option value="Excel">Excel</option><option value="Image">Image</option><option value="Other">Other</option></select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Lab / Provider</label><input value={form.lab_name} onChange={(e) => setForm({ ...form, lab_name: e.target.value })} placeholder="e.g. Quest Diagnostics" style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "2 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.filename.trim()}>{saving ? "..." : "Log"}</GreenButton>
          </div>
        </div>
      )}
      {bloodWork.length === 0 ? (<div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No blood work uploaded</div>) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {bloodWork.map((b) => (
            <div key={b.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🩸</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{b.filename}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 11, color: "#64748b" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmtDate(b.date)}</span>
                  {b.lab_name && <span>· {b.lab_name}</span>}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: "#64748b" }}>{b.file_type}</span>
                </div>
                {b.notes && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{b.notes}</p>}
              </div>
              <button onClick={() => { if (window.confirm("Delete?")) onDelete(b.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LIFE SCORECARD (Grade It)
   ═══════════════════════════════════════════════════════════ */

function ScorecardTab({ isMobile, memberId, scorecards, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const curMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const [form, setForm] = useState({ period: curMonth, health_score: 5, spirit_score: 5, finance_score: 5, health_notes: "", spirit_notes: "", finance_notes: "", overall_notes: "" });
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({ period: curMonth, health_score: 5, spirit_score: 5, finance_score: 5, health_notes: "", spirit_notes: "", finance_notes: "", overall_notes: "" }); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.period.trim()) return;
    setSaving(true);
    await onAdd({ period: form.period, health_score: form.health_score, spirit_score: form.spirit_score, finance_score: form.finance_score, health_notes: form.health_notes || null, spirit_notes: form.spirit_notes || null, finance_notes: form.finance_notes || null, overall_notes: form.overall_notes || null, member_id: memberId || null });
    resetForm(); setSaving(false);
  };

  const scoreColor = (s) => {
    if (s >= 8) return "#16a34a";
    if (s >= 6) return "#3b82f6";
    if (s >= 4) return "#f59e0b";
    return "#dc2626";
  };

  const scoreGrade = (s) => {
    if (s >= 9) return "A";
    if (s >= 8) return "B+";
    if (s >= 7) return "B";
    if (s >= 6) return "C+";
    if (s >= 5) return "C";
    if (s >= 4) return "D";
    return "F";
  };

  const avgScore = (sc) => ((Number(sc.health_score) + Number(sc.spirit_score) + Number(sc.finance_score)) / 3).toFixed(1);

  const latest = scorecards.length > 0 ? scorecards[0] : null;
  const latestAvg = latest ? avgScore(latest) : null;

  const ScoreSlider = ({ label, emoji, value, onChange, notes, onNotesChange }) => (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{emoji} {label}</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(value), fontFamily: "'Playfair Display', serif" }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(parseInt(e.target.value))} style={{ width: "100%", accentColor: scoreColor(value) }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginBottom: 8 }}><span>1</span><span>10</span></div>
      <input value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder={`${label} notes...`} style={{ width: "100%", padding: "8px 12px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" }} className="sz-input" />
    </div>
  );

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Grade It</GreenButton>
      </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Latest Overall" value={latestAvg ? `${latestAvg} / 10` : "—"} accent={latestAvg >= 7 ? "#16a34a" : latestAvg >= 5 ? "#f59e0b" : "#dc2626"} />
          <StatCard label="Health" value={latest ? `${latest.health_score}/10` : "—"} accent="#dc2626" />
          <StatCard label="Spirit & Faith" value={latest ? `${latest.spirit_score}/10` : "—"} accent="#7c3aed" />
          <StatCard label="Finance" value={latest ? `${latest.finance_score}/10` : "—"} accent="#16a34a" />
        </div>

        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text="New Scorecard" />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Period</label>
              <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. March 2026" style={inputStyle} className="sz-input" />
            </div>
            <ScoreSlider label="Health" emoji="💪" value={form.health_score} onChange={(v) => setForm({ ...form, health_score: v })} notes={form.health_notes} onNotesChange={(v) => setForm({ ...form, health_notes: v })} />
            <ScoreSlider label="Spirit & Faith" emoji="🙏" value={form.spirit_score} onChange={(v) => setForm({ ...form, spirit_score: v })} notes={form.spirit_notes} onNotesChange={(v) => setForm({ ...form, spirit_notes: v })} />
            <ScoreSlider label="Finance" emoji="💰" value={form.finance_score} onChange={(v) => setForm({ ...form, finance_score: v })} notes={form.finance_notes} onNotesChange={(v) => setForm({ ...form, finance_notes: v })} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Overall Notes</label>
              <input value={form.overall_notes} onChange={(e) => setForm({ ...form, overall_notes: e.target.value })} placeholder="How are you doing overall?" style={inputStyle} className="sz-input" />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save Scorecard"}</GreenButton>
            </div>
          </div>
        )}

        {scorecards.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#16a34a" }}>{Icons.star}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>No Scorecards Yet</h3>
            <p style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>Grade yourself across Health, Spirit, and Finance.</p>
            <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Create Your First Scorecard</GreenButton>
          </div>
        ) : (
          <>
            {scorecards.length > 1 && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20 }}>
                <SectionHeader text="Trend" />
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
                  {scorecards.slice().reverse().map((sc, i) => {
                    const avg = parseFloat(avgScore(sc));
                    const barH = Math.max(12, Math.round((avg / 10) * 100));
                    return (
                      <div key={sc.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, maxWidth: 60 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: scoreColor(avg), fontFamily: "'DM Mono', monospace" }}>{avg}</div>
                        <div style={{ width: "100%", height: barH, borderRadius: 4, background: `linear-gradient(135deg, ${scoreColor(avg)}, ${scoreColor(avg)}dd)`, transition: "height 0.3s" }} />
                        <div style={{ fontSize: 8, color: "#94a3b8", fontFamily: "'DM Mono', monospace", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{sc.period}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {scorecards.map((sc) => {
                const avg = avgScore(sc);
                return (
                  <div key={sc.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 22px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(135deg, ${scoreColor(parseFloat(avg))}, ${scoreColor(parseFloat(avg))}cc)` }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif" }}>{sc.period}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Overall: <strong style={{ color: scoreColor(parseFloat(avg)), fontSize: 13 }}>{avg}/10 ({scoreGrade(parseFloat(avg))})</strong></div>
                      </div>
                      <button onClick={() => { if (window.confirm("Delete this scorecard?")) onDelete(sc.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      {[{ label: "Health", emoji: "💪", score: sc.health_score, notes: sc.health_notes },
                        { label: "Spirit", emoji: "🙏", score: sc.spirit_score, notes: sc.spirit_notes },
                        { label: "Finance", emoji: "💰", score: sc.finance_score, notes: sc.finance_notes }].map((cat) => (
                        <div key={cat.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                          <div style={{ fontSize: 18 }}>{cat.emoji}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(cat.score), fontFamily: "'Playfair Display', serif", margin: "4px 0" }}>{cat.score}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{cat.label}</div>
                          {cat.notes && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, lineHeight: 1.3 }}>{cat.notes}</div>}
                        </div>
                      ))}
                    </div>
                    {sc.overall_notes && <p style={{ fontSize: 12, color: "#64748b", marginTop: 12, lineHeight: 1.4, fontStyle: "italic" }}>{sc.overall_notes}</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS (Tabbed: Status, Organization, Users)
   ═══════════════════════════════════════════════════════════ */

function SettingsView({ isMobile, session, activeTab, onTabChange }) {
  const tab = activeTab || "status";
  const setTab = onTabChange || (() => {});
  const [orgMembers, setOrgMembers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", org: "family", role: "member" });
  const [inviteSaving, setInviteSaving] = useState(false);

  useEffect(() => {
    const loadOrg = async () => {
      const { data } = await supabase.from("org_members").select("*").order("created_at", { ascending: true });
      if (data) setOrgMembers(data);
    };
    loadOrg();
  }, []);

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) return;
    setInviteSaving(true);
    const { data, error } = await supabase.from("org_members").insert({
      email: inviteForm.email,
      name: inviteForm.name || null,
      organization: inviteForm.org,
      role: inviteForm.role,
      invited_by: session?.user?.id,
      status: "invited",
    }).select().single();
    if (!error && data) setOrgMembers((p) => [...p, data]);
    setInviteForm({ email: "", name: "", org: "family", role: "member" });
    setShowInvite(false);
    setInviteSaving(false);
  };

  const handleRemoveMember = async (id) => {
    const { error } = await supabase.from("org_members").delete().eq("id", id);
    if (!error) setOrgMembers((p) => p.filter((m) => m.id !== id));
  };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const familyMembers = orgMembers.filter((m) => m.organization === "family");
  const teamMembers = orgMembers.filter((m) => m.organization === "team");

  const orgBadge = (org) => {
    const isFam = org === "family";
    return (
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace", padding: "3px 8px", borderRadius: 6, background: isFam ? "#eff6ff" : "#f0fdf4", color: isFam ? "#3b82f6" : "#16a34a", border: `1px solid ${isFam ? "#bfdbfe" : "#bbf7d0"}` }}>
        {isFam ? "SUAREZ FAMILY" : "SUAREZ GLOBAL"}
      </span>
    );
  };

  const statusBadge = (status) => {
    const colors = { active: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" }, invited: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" }, pending: { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" } };
    const c = colors[status] || colors.pending;
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{status}</span>;
  };

  const MemberCard = ({ member }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: member.organization === "family" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #16a34a, #15803d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {(member.name || member.email || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{member.name || fmtUserName(member.email)}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.email}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {orgBadge(member.organization)}
        {statusBadge(member.status || "invited")}
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{member.role}</span>
        <button onClick={() => { if (window.confirm("Remove this member?")) handleRemoveMember(member.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
      </div>
    </div>
  );

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Settings" subtitle="App configuration & organization" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px", maxWidth: 800 }}>
        <TabBar tabs={[{ key: "status", label: "Status" }, { key: "organization", label: "Organization" }]} active={tab} onChange={setTab} isMobile={isMobile} />

        {tab === "status" && (
          <>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20 }}>
              <SectionHeader text="System Status" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>Mode</div>
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#16a34a", fontFamily: "'DM Mono', monospace" }}>✓ Connected to Supabase</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>Auth</div>
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#16a34a", fontFamily: "'DM Mono', monospace" }}>✓ Live Authentication</div>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px" }}>
              <SectionHeader text="Permissions Model" />
              <p style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, margin: 0 }}>
                As the owner, you see everything — both <strong style={{ color: "#7c3aed" }}>personal</strong> and <strong style={{ color: "#16a34a" }}>business</strong> data. Family members see family content, and team members see business content. Some users may have hybrid access.
              </p>
            </div>
          </>
        )}

        {tab === "organization" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard label="Family Members" value={familyMembers.length} accent="#3b82f6" />
              <StatCard label="Team Members" value={teamMembers.length} accent="#16a34a" />
              <StatCard label="Total Users" value={orgMembers.length} accent="#7c3aed" />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <GreenButton small onClick={() => setShowInvite(!showInvite)}>{Icons.plus} Invite Member</GreenButton>
            </div>

            {showInvite && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
                <SectionHeader text="Invite New Member" />
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email *</label><input value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@email.com" style={inputStyle} className="sz-input" /></div>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name</label><input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Full name" style={inputStyle} className="sz-input" /></div>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Organization</label><select value={inviteForm.org} onChange={(e) => setInviteForm({ ...inviteForm, org: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="family">Suarez Family</option><option value="team">Suarez Global (Corporate)</option></select></div>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role</label><select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select></div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowInvite(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
                  <GreenButton small onClick={handleInvite} disabled={inviteSaving || !inviteForm.email.trim()}>{inviteSaving ? "..." : "Send Invite"}</GreenButton>
                </div>
              </div>
            )}

            {familyMembers.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "4px 16px" : "4px 24px", marginBottom: 20 }}>
                <div style={{ padding: "16px 0 4px", fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                  Suarez Family
                </div>
                {familyMembers.map((m) => <MemberCard key={m.id} member={m} />)}
              </div>
            )}

            {teamMembers.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "4px 16px" : "4px 24px", marginBottom: 20 }}>
                <div style={{ padding: "16px 0 4px", fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
                  Suarez Global — Corporate Team
                </div>
                {teamMembers.map((m) => <MemberCard key={m.id} member={m} />)}
              </div>
            )}

            {orgMembers.length === 0 && !showInvite && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#16a34a" }}>{Icons.users}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Members Yet</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>Invite family members to the Suarez Family organization, or add team members to Suarez Global.</p>
                <GreenButton small onClick={() => setShowInvite(true)}>{Icons.plus} Invite First Member</GreenButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FINANCE (Tabbed: Money, Wealth)
   ═══════════════════════════════════════════════════════════ */

function FinanceView(props) {
  const { isMobile, activeTab, onTabChange } = props;
  const tab = activeTab || "money";
  const tabs = [
    { key: "money", label: "Money" },
    { key: "wealth", label: "Wealth" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Finance" subtitle="Day-to-day money & long-term wealth" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={tab} onChange={onTabChange} isMobile={isMobile} />
        {tab === "money" && <MoneyView {...props} nested />}
        {tab === "wealth" && <WealthView {...props} nested />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LIFE (Tabbed: Home, Family, Health)
   ═══════════════════════════════════════════════════════════ */

function LifeConsolidatedView(props) {
  const { isMobile, activeTab, onTabChange } = props;
  const tab = activeTab || "home";
  const tabs = [
    { key: "home", label: "Home" },
    { key: "family", label: "Family" },
    { key: "health", label: "Health" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Life" subtitle="Home, family & health" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={tab} onChange={onTabChange} isMobile={isMobile} />
        {tab === "home" && <HomeLifeView {...props} activeTab={null} nested />}
        {tab === "family" && <FamilyView {...props} activeTab={null} nested />}
        {tab === "health" && <HealthView {...props} activeTab={null} nested />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GROWTH (Tabbed: One, Two)
   ═══════════════════════════════════════════════════════════ */

function GrowthView({ isMobile, activeTab, onTabChange }) {
  const tab = activeTab || "one";
  const tabs = [
    { key: "one", label: "One" },
    { key: "two", label: "Two" },
  ];

  const PlaceholderTab = ({ label }) => (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "40px 20px" : "60px 32px", textAlign: "center", marginTop: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        {Icons.sprout}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>{label}</h3>
      <p style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>This section is coming soon.</p>
    </div>
  );

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Growth" subtitle="Track your growth journey" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={tab} onChange={onTabChange} isMobile={isMobile} />
        {tab === "one" && <PlaceholderTab label="Growth — One" />}
        {tab === "two" && <PlaceholderTab label="Growth — Two" />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */

export default function SuarezApp() {
  const parseHash = () => {
    const hash = window.location.hash.replace("#/", "").split("/");
    return { page: hash[0] || "overview", tab: hash[1] || null };
  };

  const initialHash = parseHash();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeNav, setActiveNav] = useState(initialHash.page || "overview");
  const [activeTab, setActiveTab] = useState(initialHash.tab || null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showProfile, setShowProfile] = useState(initialHash.page === "profile");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [assets, setAssets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [homes, setHomes] = useState([]);
  const [utilityBills, setUtilityBills] = useState([]);
  const [lifeExpenses, setLifeExpenses] = useState([]);
  const [plannerTasks, setPlannerTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [kids, setKids] = useState([]);
  const [kidGrades, setKidGrades] = useState([]);
  const [kidMilestones, setKidMilestones] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [healthCheckins, setHealthCheckins] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [mealEntries, setMealEntries] = useState([]);
  const [bloodWork, setBloodWork] = useState([]);
  const [doseLogs, setDoseLogs] = useState([]);
  const [bodyLogs, setBodyLogs] = useState([]);
  const [monthlyBills, setMonthlyBills] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "viewport"; document.head.appendChild(meta); }
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setDataLoading(true);
    const [acctRes, uploadRes, assetRes, txnRes, invRes, snapRes, bizRes, coRes, polRes, homeRes, utilRes, lifeRes, taskRes, eventRes, kidsRes, gradesRes, milesRes, scoreRes, prayerRes, famRes, checkinRes, suppRes, mealRes, bwRes, mbRes, dlRes, blRes] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: true }),
      supabase.from("statement_uploads").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("assets").select("*").order("created_at", { ascending: true }),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("investments").select("*").order("created_at", { ascending: true }),
      supabase.from("net_worth_snapshots").select("*").order("snapshot_date", { ascending: false }),
      supabase.from("businesses").select("*").order("created_at", { ascending: true }),
      supabase.from("companies").select("*").order("name", { ascending: true }),
      supabase.from("insurance_policies").select("*").order("created_at", { ascending: true }),
      supabase.from("homes").select("*").order("created_at", { ascending: true }),
      supabase.from("utility_bills").select("*").order("created_at", { ascending: false }),
      supabase.from("life_expenses").select("*").order("date", { ascending: false }),
      supabase.from("planner_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("*").order("event_date", { ascending: true }),
      supabase.from("kids").select("*").order("created_at", { ascending: true }),
      supabase.from("kid_grades").select("*").order("created_at", { ascending: false }),
      supabase.from("kid_milestones").select("*").order("date", { ascending: false }),
      supabase.from("life_scorecards").select("*").order("created_at", { ascending: false }),
      supabase.from("prayer_wall").select("*").order("created_at", { ascending: false }),
      supabase.from("family_members").select("*").order("created_at", { ascending: true }),
      supabase.from("health_checkins").select("*").order("date", { ascending: false }),
      supabase.from("supplements").select("*").order("created_at", { ascending: true }),
      supabase.from("meal_entries").select("*").order("date", { ascending: false }),
      supabase.from("blood_work").select("*").order("date", { ascending: false }),
      supabase.from("monthly_bills").select("*").order("created_at", { ascending: true }),
      supabase.from("dose_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("body_logs").select("*").order("date", { ascending: false }),
    ]);
    if (acctRes.data) setAccounts(acctRes.data);
    if (uploadRes.data) setUploads(uploadRes.data);
    if (assetRes.data) setAssets(assetRes.data);
    if (txnRes.data) setTransactions(txnRes.data);
    if (invRes.data) setInvestments(invRes.data);
    if (snapRes.data) setSnapshots(snapRes.data);
    if (bizRes.data) setBusinesses(bizRes.data);
    if (coRes.data) setCompanies(coRes.data);
    if (polRes.data) setPolicies(polRes.data);
    if (homeRes.data) setHomes(homeRes.data);
    if (utilRes.data) setUtilityBills(utilRes.data);
    if (lifeRes.data) setLifeExpenses(lifeRes.data);
    if (taskRes.data) setPlannerTasks(taskRes.data);
    if (eventRes.data) setCalendarEvents(eventRes.data);
    if (kidsRes.data) setKids(kidsRes.data);
    if (gradesRes.data) setKidGrades(gradesRes.data);
    if (milesRes.data) setKidMilestones(milesRes.data);
    if (scoreRes.data) setScorecards(scoreRes.data);
    if (prayerRes.data) setPrayers(prayerRes.data);
    if (famRes.data) setFamilyMembers(famRes.data);
    if (checkinRes.data) setHealthCheckins(checkinRes.data);
    if (suppRes.data) setSupplements(suppRes.data);
    if (mealRes.data) setMealEntries(mealRes.data);
    if (bwRes.data) setBloodWork(bwRes.data);
    if (mbRes.data) setMonthlyBills(mbRes.data);
    if (dlRes.data) setDoseLogs(dlRes.data);
    if (blRes.data) setBodyLogs(blRes.data);
    setDataLoading(false);
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  // === CRUD ===
  const handleAddAccount = async (form) => { const { data, error } = await supabase.from("accounts").insert({ name: form.name, type: form.type, institution: form.institution || null, visibility: form.visibility, monthly_payment: form.monthly_payment || 0, user_id: session.user.id }).select().single(); if (!error && data) setAccounts((p) => [...p, data]); };
  const handleToggleAccount = async (id, active) => { const { error } = await supabase.from("accounts").update({ active }).eq("id", id); if (!error) setAccounts((p) => p.map((a) => a.id === id ? { ...a, active } : a)); };
  const handleUpdateAccount = async (id, form) => { const { data, error } = await supabase.from("accounts").update(form).eq("id", id).select().single(); if (!error && data) setAccounts((p) => p.map((a) => a.id === id ? data : a)); };
  const handleDeleteAccount = async (id) => { const { error } = await supabase.from("accounts").delete().eq("id", id); if (!error) { setAccounts((p) => p.filter((a) => a.id !== id)); setUploads((p) => p.filter((u) => u.account_id !== id)); } };
  const handleUpload = async (acct, month, quarter, file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const filePath = `${session.user.id}/statements/${acct.id}/${quarter}_${month.toLowerCase().slice(0, 3)}_${new Date().getFullYear()}.${ext}`;
    const { error: storageErr } = await supabase.storage.from("uploads").upload(filePath, file, { upsert: true });
    let fileUrl = null;
    if (!storageErr) {
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
      fileUrl = urlData?.publicUrl || null;
    }
    const fn = file.name;
    const { data, error } = await supabase.from("statement_uploads").insert({ account_id: acct.id, month, quarter, year: new Date().getFullYear(), filename: fn, file_type: ext, file_path: filePath, file_url: fileUrl }).select().single();
    if (!error && data) setUploads((p) => [data, ...p]);
  };
  const handleDeleteUpload = async (id, filePath) => {
    if (filePath) await supabase.storage.from("uploads").remove([filePath]);
    const { error } = await supabase.from("statement_uploads").delete().eq("id", id);
    if (!error) setUploads((p) => p.filter((u) => u.id !== id));
  };
  const handleAddAsset = async (form) => { const { data, error } = await supabase.from("assets").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setAssets((p) => [...p, data]); };
  const handleUpdateAsset = async (id, form) => { const { data, error } = await supabase.from("assets").update(form).eq("id", id).select().single(); if (!error && data) setAssets((p) => p.map((a) => a.id === id ? data : a)); };
  const handleDeleteAsset = async (id) => { const { error } = await supabase.from("assets").delete().eq("id", id); if (!error) setAssets((p) => p.filter((a) => a.id !== id)); };
  const handleAddTransaction = async (form) => { const { data, error } = await supabase.from("transactions").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setTransactions((p) => [data, ...p]); };
  const handleDeleteTransaction = async (id) => { const { error } = await supabase.from("transactions").delete().eq("id", id); if (!error) setTransactions((p) => p.filter((t) => t.id !== id)); };
  const handleAddInvestment = async (form) => { const { data, error } = await supabase.from("investments").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setInvestments((p) => [...p, data]); };
  const handleUpdateInvestment = async (id, form) => { const { data, error } = await supabase.from("investments").update(form).eq("id", id).select().single(); if (!error && data) setInvestments((p) => p.map((i) => i.id === id ? data : i)); };
  const handleDeleteInvestment = async (id) => { const { error } = await supabase.from("investments").delete().eq("id", id); if (!error) setInvestments((p) => p.filter((i) => i.id !== id)); };
  const handleAddSnapshot = async (form) => { const { data, error } = await supabase.from("net_worth_snapshots").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setSnapshots((p) => [data, ...p].sort((a, b) => new Date(b.snapshot_date) - new Date(a.snapshot_date))); };
  const handleDeleteSnapshot = async (id) => { const { error } = await supabase.from("net_worth_snapshots").delete().eq("id", id); if (!error) setSnapshots((p) => p.filter((s) => s.id !== id)); };
  const handleAddBusiness = async (form) => { const { data, error } = await supabase.from("businesses").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setBusinesses((p) => [...p, data]); };
  const handleUpdateBusiness = async (id, form) => { const { data, error } = await supabase.from("businesses").update(form).eq("id", id).select().single(); if (!error && data) setBusinesses((p) => p.map((b) => b.id === id ? data : b)); };
  const handleDeleteBusiness = async (id) => { const { error } = await supabase.from("businesses").delete().eq("id", id); if (!error) setBusinesses((p) => p.filter((b) => b.id !== id)); };
  const handleAddCompany = async (form) => { const { data, error } = await supabase.from("companies").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setCompanies((p) => [...p, data]); };
  const handleUpdateCompany = async (id, form) => { const { data, error } = await supabase.from("companies").update(form).eq("id", id).select().single(); if (!error && data) setCompanies((p) => p.map((c) => c.id === id ? data : c)); };
  const handleDeleteCompany = async (id) => { const { error } = await supabase.from("companies").delete().eq("id", id); if (!error) setCompanies((p) => p.filter((c) => c.id !== id)); };
  const handleAddPolicy = async (form) => { const { data, error } = await supabase.from("insurance_policies").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setPolicies((p) => [...p, data]); };
  const handleUpdatePolicy = async (id, form) => { const { data, error } = await supabase.from("insurance_policies").update(form).eq("id", id).select().single(); if (!error && data) setPolicies((p) => p.map((pol) => pol.id === id ? data : pol)); };
  const handleDeletePolicy = async (id) => { const { error } = await supabase.from("insurance_policies").delete().eq("id", id); if (!error) setPolicies((p) => p.filter((pol) => pol.id !== id)); };
  const handleAddHome = async (form) => { const { data, error } = await supabase.from("homes").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setHomes((p) => [...p, data]); };
  const handleUpdateHome = async (id, form) => { const { data, error } = await supabase.from("homes").update(form).eq("id", id).select().single(); if (!error && data) setHomes((p) => p.map((h) => h.id === id ? data : h)); };
  const handleDeleteHome = async (id) => { const { error } = await supabase.from("homes").delete().eq("id", id); if (!error) setHomes((p) => p.filter((h) => h.id !== id)); };
  const handleAddUtilityBill = async (form) => { const { data, error } = await supabase.from("utility_bills").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setUtilityBills((p) => [data, ...p]); };
  const handleUpdateUtilityBill = async (id, form) => { const { data, error } = await supabase.from("utility_bills").update(form).eq("id", id).select().single(); if (!error && data) setUtilityBills((p) => p.map((b) => b.id === id ? data : b)); };
  const handleDeleteUtilityBill = async (id) => { const { error } = await supabase.from("utility_bills").delete().eq("id", id); if (!error) setUtilityBills((p) => p.filter((b) => b.id !== id)); };
  const handleAddLifeExpense = async (form) => { const { data, error } = await supabase.from("life_expenses").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setLifeExpenses((p) => [data, ...p]); };
  const handleDeleteLifeExpense = async (id) => { const { error } = await supabase.from("life_expenses").delete().eq("id", id); if (!error) setLifeExpenses((p) => p.filter((e) => e.id !== id)); };
  const handleAddTask = async (form) => { const { data, error } = await supabase.from("planner_tasks").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setPlannerTasks((p) => [data, ...p]); };
  const handleUpdateTask = async (id, form) => { const { data, error } = await supabase.from("planner_tasks").update(form).eq("id", id).select().single(); if (!error && data) setPlannerTasks((p) => p.map((t) => t.id === id ? data : t)); };
  const handleDeleteTask = async (id) => { const { error } = await supabase.from("planner_tasks").delete().eq("id", id); if (!error) setPlannerTasks((p) => p.filter((t) => t.id !== id)); };
  const handleAddEvent = async (form) => { const { data, error } = await supabase.from("calendar_events").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setCalendarEvents((p) => [...p, data].sort((a, b) => a.event_date?.localeCompare(b.event_date))); };
  const handleDeleteEvent = async (id) => { const { error } = await supabase.from("calendar_events").delete().eq("id", id); if (!error) setCalendarEvents((p) => p.filter((e) => e.id !== id)); };
  const handleAddKid = async (form) => { const { data, error } = await supabase.from("kids").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setKids((p) => [...p, data]); };
  const handleUpdateKid = async (id, form) => { const { data, error } = await supabase.from("kids").update(form).eq("id", id).select().single(); if (!error && data) setKids((p) => p.map((k) => k.id === id ? data : k)); };
  const handleDeleteKid = async (id) => { const { error } = await supabase.from("kids").delete().eq("id", id); if (!error) { setKids((p) => p.filter((k) => k.id !== id)); setKidGrades((p) => p.filter((g) => g.kid_id !== id)); setKidMilestones((p) => p.filter((m) => m.kid_id !== id)); } };
  const handleAddKidGrade = async (form) => { const { data, error } = await supabase.from("kid_grades").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setKidGrades((p) => [data, ...p]); };
  const handleDeleteKidGrade = async (id) => { const { error } = await supabase.from("kid_grades").delete().eq("id", id); if (!error) setKidGrades((p) => p.filter((g) => g.id !== id)); };
  const handleAddKidMilestone = async (form) => { const { data, error } = await supabase.from("kid_milestones").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setKidMilestones((p) => [data, ...p]); };
  const handleDeleteKidMilestone = async (id) => { const { error } = await supabase.from("kid_milestones").delete().eq("id", id); if (!error) setKidMilestones((p) => p.filter((m) => m.id !== id)); };
  const handleAddScorecard = async (form) => { const { data, error } = await supabase.from("life_scorecards").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setScorecards((p) => [data, ...p]); };
  const handleDeleteScorecard = async (id) => { const { error } = await supabase.from("life_scorecards").delete().eq("id", id); if (!error) setScorecards((p) => p.filter((s) => s.id !== id)); };
  const handleAddPrayer = async (form) => { const { data, error } = await supabase.from("prayer_wall").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setPrayers((p) => [data, ...p]); };
  const handleUpdatePrayer = async (id, form) => { const { data, error } = await supabase.from("prayer_wall").update(form).eq("id", id).select().single(); if (!error && data) setPrayers((p) => p.map((pr) => pr.id === id ? data : pr)); };
  const handleDeletePrayer = async (id) => { const { error } = await supabase.from("prayer_wall").delete().eq("id", id); if (!error) setPrayers((p) => p.filter((pr) => pr.id !== id)); };

  // Family Members CRUD
  const handleAddFamilyMember = async (form) => { const { data, error } = await supabase.from("family_members").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setFamilyMembers((p) => [...p, data]); };
  // Health Check-ins CRUD
  const handleAddCheckin = async (form) => { const { data, error } = await supabase.from("health_checkins").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setHealthCheckins((p) => [data, ...p]); };
  const handleDeleteCheckin = async (id) => { const { error } = await supabase.from("health_checkins").delete().eq("id", id); if (!error) setHealthCheckins((p) => p.filter((c) => c.id !== id)); };
  // Supplements CRUD
  const handleAddSupplement = async (form) => { const { data, error } = await supabase.from("supplements").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setSupplements((p) => [...p, data]); };
  const handleUpdateSupplement = async (id, form) => { const { data, error } = await supabase.from("supplements").update(form).eq("id", id).select().single(); if (!error && data) setSupplements((p) => p.map((s) => s.id === id ? data : s)); };
  const handleDeleteSupplement = async (id) => { const { error } = await supabase.from("supplements").delete().eq("id", id); if (!error) setSupplements((p) => p.filter((s) => s.id !== id)); };
  // Meal Entries CRUD
  const handleAddMeal = async (form) => { const { data, error } = await supabase.from("meal_entries").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setMealEntries((p) => [data, ...p]); };
  const handleDeleteMeal = async (id) => { const { error } = await supabase.from("meal_entries").delete().eq("id", id); if (!error) setMealEntries((p) => p.filter((m) => m.id !== id)); };
  // Blood Work CRUD
  // Monthly Bills CRUD
  const handleAddMonthlyBill = async (form) => { const { data, error } = await supabase.from("monthly_bills").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setMonthlyBills((p) => [...p, data]); };
  const handleUpdateMonthlyBill = async (id, form) => { const { data, error } = await supabase.from("monthly_bills").update(form).eq("id", id).select().single(); if (!error && data) setMonthlyBills((p) => p.map((b) => b.id === id ? data : b)); };
  const handleDeleteMonthlyBill = async (id) => { const { error } = await supabase.from("monthly_bills").delete().eq("id", id); if (!error) setMonthlyBills((p) => p.filter((b) => b.id !== id)); };
  // Dose Logs CRUD
  const handleAddDoseLog = async (form) => { const { data, error } = await supabase.from("dose_logs").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setDoseLogs((p) => [data, ...p]); };
  const handleDeleteDoseLog = async (id) => { const { error } = await supabase.from("dose_logs").delete().eq("id", id); if (!error) setDoseLogs((p) => p.filter((d) => d.id !== id)); };
  // Body Logs CRUD
  const handleAddBodyLog = async (form) => { const { data, error } = await supabase.from("body_logs").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setBodyLogs((p) => [data, ...p]); };
  const handleDeleteBodyLog = async (id) => { const { error } = await supabase.from("body_logs").delete().eq("id", id); if (!error) setBodyLogs((p) => p.filter((b) => b.id !== id)); };
  const handleAddBloodWork = async (form) => { const { data, error } = await supabase.from("blood_work").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setBloodWork((p) => [data, ...p]); };
  const handleDeleteBloodWork = async (id) => { const { error } = await supabase.from("blood_work").delete().eq("id", id); if (!error) setBloodWork((p) => p.filter((b) => b.id !== id)); };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null); setAccounts([]); setUploads([]); setAssets([]); setTransactions([]); setInvestments([]); setSnapshots([]);
    setBusinesses([]); setCompanies([]); setPolicies([]); setHomes([]); setUtilityBills([]); setLifeExpenses([]);
    setPlannerTasks([]); setCalendarEvents([]); setKids([]); setKidGrades([]); setKidMilestones([]); setScorecards([]); setPrayers([]);
    setFamilyMembers([]); setHealthCheckins([]); setSupplements([]); setMealEntries([]); setBloodWork([]); setMonthlyBills([]); setDoseLogs([]); setBodyLogs([]);
  };

  const navigate = (page, tab) => {
    const hash = tab ? `#/${page}/${tab}` : `#/${page}`;
    window.location.hash = hash;
    setActiveNav(page);
    setActiveTab(tab || null);
    setShowProfile(page === "profile");
  };

  const handleTabChange = (tab) => {
    window.location.hash = `#/${activeNav}/${tab}`;
    setActiveTab(tab);
  };

  useEffect(() => {
    const onHash = () => {
      const { page, tab } = parseHash();
      if (page === "profile") {
        setShowProfile(true);
      } else {
        setShowProfile(false);
        setActiveNav(page);
        setActiveTab(tab || null);
      }
    };
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = "#/overview";
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (authLoading) return (<><GlobalStyles /><div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", flexDirection: "column", gap: 16 }}><Spinner /><p style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>Loading...</p></div></>);
  if (!session) return (<><GlobalStyles /><AuthScreen /></>);

  const userEmail = session?.user?.email || "";
  const userName = session?.user?.user_metadata?.full_name || fmtUserName(userEmail);
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = [
    { id: "overview", label: "Command Center", icon: <span style={{ fontSize: 18 }}>🌍</span> },
    { id: "life", label: "Life", icon: <span style={{ fontSize: 18 }}>🌳</span> },
    { id: "business", label: "Business", icon: <span style={{ fontSize: 18 }}>💼</span> },
    { id: "finance", label: "Finance", featured: true, icon: <span style={{ fontSize: 18 }}>💰</span> },
    { id: "growth", label: "Growth", icon: <span style={{ fontSize: 18 }}>🌱</span> },
  ];

  const mobileNavItems = [
    { id: "life", label: "Life", icon: <span style={{ fontSize: 18 }}>🌳</span> },
    { id: "business", label: "Business", icon: <span style={{ fontSize: 18 }}>💼</span> },
    { id: "overview", label: "", featured: true, icon: <span style={{ fontSize: 20 }}>🌍</span> },
    { id: "finance", label: "Finance", icon: <span style={{ fontSize: 18 }}>💰</span> },
    { id: "growth", label: "Growth", icon: <span style={{ fontSize: 18 }}>🌱</span> },
  ];

  const renderPage = () => {
    if (dataLoading) return (<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}><Spinner /></div>);
    if (showProfile) return <ProfileView session={session} isMobile={isMobile} onSignOut={handleSignOut} />;
    switch (activeNav) {
      case "overview": return <OverviewView isMobile={isMobile} session={session} accounts={accounts} uploads={uploads} assets={assets} transactions={transactions} investments={investments} lifeExpenses={lifeExpenses} homes={homes} utilityBills={utilityBills} policies={policies} monthlyBills={monthlyBills} onNavigate={navigate} />;
      case "finance": return <FinanceView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} transactions={transactions} accounts={accounts} uploads={uploads} lifeExpenses={lifeExpenses} assets={assets} investments={investments} snapshots={snapshots} onAddAccount={handleAddAccount} onToggleAccount={handleToggleAccount} onDeleteAccount={handleDeleteAccount} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onAddLifeExpense={handleAddLifeExpense} onDeleteLifeExpense={handleDeleteLifeExpense} onUpload={handleUpload} onDeleteUpload={handleDeleteUpload} onAddAsset={handleAddAsset} onUpdateAsset={handleUpdateAsset} onDeleteAsset={handleDeleteAsset} onAddInvestment={handleAddInvestment} onUpdateInvestment={handleUpdateInvestment} onDeleteInvestment={handleDeleteInvestment} onAddSnapshot={handleAddSnapshot} onDeleteSnapshot={handleDeleteSnapshot} />;
      case "business": return <BusinessView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} businesses={businesses} transactions={transactions} companies={companies} policies={policies} onAddBusiness={handleAddBusiness} onUpdateBusiness={handleUpdateBusiness} onDeleteBusiness={handleDeleteBusiness} onAddCompany={handleAddCompany} onUpdateCompany={handleUpdateCompany} onDeleteCompany={handleDeleteCompany} onAddPolicy={handleAddPolicy} onUpdatePolicy={handleUpdatePolicy} onDeletePolicy={handleDeletePolicy} />;
      case "life": return <LifeConsolidatedView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} homes={homes} utilityBills={utilityBills} calendarEvents={calendarEvents} plannerTasks={plannerTasks} monthlyBills={monthlyBills} kids={kids} grades={kidGrades} milestones={kidMilestones} prayers={prayers} session={session} familyMembers={familyMembers} checkins={healthCheckins} supplements={supplements} meals={mealEntries} bloodWork={bloodWork} scorecards={scorecards} doseLogs={doseLogs} bodyLogs={bodyLogs} onAddHome={handleAddHome} onUpdateHome={handleUpdateHome} onDeleteHome={handleDeleteHome} onAddBill={handleAddUtilityBill} onUpdateBill={handleUpdateUtilityBill} onDeleteBill={handleDeleteUtilityBill} onAddEvent={handleAddEvent} onDeleteEvent={handleDeleteEvent} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onAddMonthlyBill={handleAddMonthlyBill} onUpdateMonthlyBill={handleUpdateMonthlyBill} onDeleteMonthlyBill={handleDeleteMonthlyBill} onAddKid={handleAddKid} onUpdateKid={handleUpdateKid} onDeleteKid={handleDeleteKid} onAddGrade={handleAddKidGrade} onDeleteGrade={handleDeleteKidGrade} onAddMilestone={handleAddKidMilestone} onDeleteMilestone={handleDeleteKidMilestone} onAddPrayer={handleAddPrayer} onUpdatePrayer={handleUpdatePrayer} onDeletePrayer={handleDeletePrayer} onAddMember={handleAddFamilyMember} onAddCheckin={handleAddCheckin} onDeleteCheckin={handleDeleteCheckin} onAddSupplement={handleAddSupplement} onUpdateSupplement={handleUpdateSupplement} onDeleteSupplement={handleDeleteSupplement} onAddMeal={handleAddMeal} onDeleteMeal={handleDeleteMeal} onAddBloodWork={handleAddBloodWork} onDeleteBloodWork={handleDeleteBloodWork} onAddScorecard={handleAddScorecard} onDeleteScorecard={handleDeleteScorecard} onAddDoseLog={handleAddDoseLog} onDeleteDoseLog={handleDeleteDoseLog} onAddBodyLog={handleAddBodyLog} onDeleteBodyLog={handleDeleteBodyLog} />;
      case "growth": return <GrowthView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} />;
      default: return null;
    }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", background: "#f8fafc", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
        {!isMobile && (
          <div style={{ width: 60, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 6, flexShrink: 0, overflowY: "auto" }}>
            <SuarezLogo size={36} />
            <div style={{ height: 16 }} />
            {navItems.map((item) => (
              <button key={item.id} onClick={() => navigate(item.id)} title={item.label} style={{
                width: 40, height: 40, borderRadius: 10, border: "none",
                background: activeNav === item.id && !showProfile ? (item.featured ? "linear-gradient(135deg, #16a34a, #15803d)" : "#f0fdf4") : "transparent",
                color: activeNav === item.id && !showProfile ? (item.featured ? "#fff" : "#16a34a") : "#94a3b8",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                boxShadow: activeNav === item.id && item.featured && !showProfile ? "0 2px 8px rgba(22,163,74,0.3)" : "none",
              }}>{item.icon}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => navigate("profile")} title="Profile" style={{
              width: 32, height: 32, borderRadius: "50%",
              background: showProfile ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #3b82f6, #2563eb)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            }}>{initials}</button>
          </div>
        )}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", paddingTop: isMobile ? 56 : 0 }}>
          {renderPage()}
        </div>
        {isMobile && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 4px 6px", paddingBottom: "max(6px, env(safe-area-inset-bottom))", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
            {mobileNavItems.map((item) => {
              const isActive = activeNav === item.id && !showProfile;
              if (item.featured) {
                return (
                  <button key={item.id} onClick={() => navigate(item.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: -18, WebkitTapHighlightColor: "transparent" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: isActive ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(22,163,74,0.3)", color: "#fff", border: "3px solid #fff", transform: isActive ? "scale(1.08)" : "scale(1)", transition: "transform 0.2s" }}>{item.icon}</div>
                  </button>
                );
              }
              return (
                <button key={item.id} onClick={() => navigate(item.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", color: isActive ? "#16a34a" : "#94a3b8", cursor: "pointer", padding: "8px 0", transition: "color 0.2s", WebkitTapHighlightColor: "transparent" }}>
                  {item.icon}
                  <span style={{ fontSize: 9, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {isMobile && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 110, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <button onClick={() => setShowMobileMenu(true)} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f172a" }}>{Icons.menu}</button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><SuarezLogo size={24} /><span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em" }}>SUAREZ</span></div>
            <div style={{ width: 40 }} />
          </div>
        )}
        {isMobile && showMobileMenu && (<div onClick={() => setShowMobileMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", animation: "fadeIn 0.2s ease" }} />)}
        {isMobile && showMobileMenu && (
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 280, background: "#fff", zIndex: 210, display: "flex", flexDirection: "column", animation: "slideInLeft 0.25s cubic-bezier(0.25, 1, 0.5, 1)", boxShadow: "4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><SuarezLogo /><span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em" }}>SUAREZ</span></div>
              <button onClick={() => setShowMobileMenu(false)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>{Icons.x}</button>
            </div>
            <div style={{ flex: 1, padding: "12px 12px", overflow: "auto" }}>
              {navItems.map((item) => {
                const isActive = activeNav === item.id && !showProfile;
                return (
                  <button key={item.id} onClick={() => { navigate(item.id); setShowMobileMenu(false); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, border: "none",
                    background: isActive ? "#f0fdf4" : "transparent", color: isActive ? "#16a34a" : "#475569",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 2,
                    borderLeft: isActive ? "3px solid #16a34a" : "3px solid transparent", transition: "all 0.15s",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24 }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: "16px", borderTop: "1px solid #f1f5f9" }}>
              <button onClick={() => { navigate("profile"); setShowMobileMenu(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "none",
                background: showProfile ? "#f0fdf4" : "#f8fafc", cursor: "pointer",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>{initials}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", overflow: "hidden" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{userName}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>{userEmail}</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
