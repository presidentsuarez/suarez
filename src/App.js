import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

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

const PageHeader = ({ title, subtitle, isMobile, children, icon, pills, stats, onBack }) => (
  <div style={{ background: "linear-gradient(135deg, #1C3820 0%, #0f1f12 100%)", padding: isMobile ? "16px 16px 20px" : "24px 32px 28px", color: "#fff", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,192,140,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
    {onBack && (
      <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "#D4C08C", fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>← Back</button>
    )}
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 0 }}>
        {icon && <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 12, background: "rgba(212,192,140,0.15)", border: "1.5px solid rgba(212,192,140,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#D4C08C", fontSize: isMobile ? 20 : 24, flexShrink: 0 }}>{icon}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', serif", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: isMobile ? 11 : 12, color: "rgba(255,255,255,0.65)", margin: "4px 0 0", fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>}
          {pills && pills.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {pills.map((p, i) => <span key={i} style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(212,192,140,0.15)", color: "#D4C08C", letterSpacing: "0.04em" }}>{p}</span>)}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
    {stats && stats.length > 0 && (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, isMobile ? 3 : 4)}, 1fr)`, gap: 8, marginTop: 16, position: "relative" }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 9, color: "rgba(212,192,140,0.7)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#fff", marginTop: 2, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const StatCard = ({ label, value, accent, compact }) => (
  <div style={{ background: "#fff", borderRadius: compact ? 10 : 14, border: "1px solid #e2e8f0", padding: compact ? "12px 10px" : "18px 22px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: compact ? "10px 10px 0 0" : "14px 14px 0 0" }} />
    <div style={{ fontSize: compact ? 9 : 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: compact ? 4 : 6 }}>{label}</div>
    <div style={{ fontSize: compact ? 18 : 28, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{value}</div>
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
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

function ProfileView({ session, isMobile, onSignOut, uploadLogs, teamMembers, appUsers, robots, orgs, orgMembers, orgInvites, onAddTeamMember, onUpdateTeamMember, onDeleteTeamMember, onAddRobot, onUpdateRobot, onDeleteRobot, onUpdateOrgMember, onRemoveOrgMember, onInviteToOrg, onDeleteInvite, onAddOrgMember }) {
  const [profileTab, setProfileTab] = useState("basic");
  const [usersSubTab, setUsersSubTab] = useState("active");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", tier: "member" });
  const user = session?.user || {};
  const email = user.email || "—";
  const fullName = user.user_metadata?.full_name || "";
  const displayName = fullName || fmtUserName(email);
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const createdAt = fmtDate(user.created_at);
  const provider = user.app_metadata?.provider || "email";

  const tiers = [
    { k: "owner", l: "Owner", c: "#1C3820", desc: "Full access. Can manage billing, users, and all data.", perms: ["✓ Full access to all modules", "✓ Manage billing & subscriptions", "✓ Add/remove users", "✓ Set user permissions", "✓ Delete data", "✓ Export everything"] },
    { k: "admin", l: "Admin", c: "#3b82f6", desc: "Can manage everything except billing and ownership.", perms: ["✓ Full access to all modules", "✗ No billing access", "✓ Add/remove users", "✓ Set user permissions", "✓ Delete data", "✓ Export everything"] },
    { k: "member", l: "Member", c: "#16a34a", desc: "Can view and edit but cannot manage users or delete major records.", perms: ["✓ View all modules", "✓ Edit assigned items", "✗ No user management", "✗ Cannot delete entities", "✓ Export own data", "✗ No billing access"] },
    { k: "viewer", l: "Viewer", c: "#94a3b8", desc: "Read-only access to view information.", perms: ["✓ View all modules", "✗ No editing", "✗ No deletion", "✗ No user management", "✗ No data export", "✗ No billing access"] },
  ];

  const tabs = [
    { key: "basic", label: "Basic Info" },
    { key: "tier", label: "Permissions / Tier" },
    { key: "users", label: "Users" },
    { key: "uploads", label: "Upload Log" },
    { key: "settings", label: "Settings" },
  ];

  const handleAddUser = async () => {
    if (!newUserForm.name.trim()) return;
    await onAddTeamMember(newUserForm);
    setNewUserForm({ name: "", email: "", tier: "member" });
    setShowAddUser(false);
  };

  const userAvatarColors = ["#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#ec4899", "#0891b2"];
  const getColor = (n) => userAvatarColors[Math.abs([...(n || "?")].reduce((a, c) => a + c.charCodeAt(0), 0)) % userAvatarColors.length];
  const getInits = (n) => { const p = (n || "?").split(" "); return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : n.slice(0, 2).toUpperCase(); };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader
        isMobile={isMobile}
        title={displayName}
        subtitle={email}
        icon={initials}
        pills={["OWNER"]}
      />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px", maxWidth: 720 }}>
        <TabBar tabs={tabs} active={profileTab} onChange={setProfileTab} isMobile={isMobile} />

        {profileTab === "basic" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "8px 22px", marginBottom: 12 }}>
              <Row label="Full Name" value={displayName} />
              <Row label="Email" value={email} />
              <Row label="Sign-in Method" value={provider === "google" ? "Google OAuth" : "Email & Password"} />
              <Row label="Member Since" value={createdAt} />
              <Row label="User ID" value={user.id?.slice(0, 12) + "..."} mono />
            </div>
            <button onClick={onSignOut} style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#dc2626", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "100%" }}>Sign Out</button>
          </div>
        )}

        {profileTab === "tier" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ background: "linear-gradient(135deg, #1C3820, #0f1f12)", borderRadius: 14, padding: "20px 24px", marginBottom: 16, color: "#fff" }}>
              <div style={{ fontSize: 9, color: "rgba(212,192,140,0.7)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Your Current Tier</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#D4C08C", fontFamily: "'Playfair Display', serif" }}>OWNER</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>👑 Highest tier</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "8px 0 0", lineHeight: 1.5 }}>You have full access to every part of the app, can manage billing, add team members, and configure permissions.</p>
            </div>
            <SectionHeader text="All Tiers" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tiers.map((t) => (
                <div key={t.k} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${t.k === "owner" ? t.c : "#e2e8f0"}`, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.c }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: t.c, fontFamily: "'Playfair Display', serif" }}>{t.l}</span>
                    {t.k === "owner" && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#f0fdf4", color: "#16a34a" }}>YOU</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>{t.desc}</p>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 4 }}>
                    {t.perms.map((p, i) => <div key={i} style={{ fontSize: 11, color: p.startsWith("✓") ? "#16a34a" : "#94a3b8", fontWeight: 500 }}>{p}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profileTab === "users" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[{ k: "active", l: "👥 Active Users" }, { k: "robots", l: "🤖 Robots" }].map(({ k, l }) => (
                <button key={k} onClick={() => setUsersSubTab(k)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${usersSubTab === k ? "#0f172a" : "#e2e8f0"}`, background: usersSubTab === k ? "#0f172a" : "#fff", color: usersSubTab === k ? "#fff" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{l}</button>
              ))}
            </div>
            {usersSubTab === "active" && (
              <>
                {/* Org info */}
                {orgs && orgs.length > 0 && (
                  <div style={{ background: "linear-gradient(135deg, #1C3820, #0f1f12)", borderRadius: 12, padding: "14px 18px", marginBottom: 12, color: "#fff" }}>
                    <div style={{ fontSize: 9, color: "rgba(212,192,140,0.7)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Organization</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#D4C08C", fontFamily: "'Playfair Display', serif", marginTop: 4 }}>{orgs[0]?.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{(orgMembers || []).length} members · {(orgInvites || []).filter((i) => i.status === "pending").length} pending invites</div>
                  </div>
                )}

                {/* Invite form */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{(appUsers || []).length} user{(appUsers || []).length !== 1 ? "s" : ""}</span>
                  <GreenButton small onClick={() => setShowAddUser(!showAddUser)}>{Icons.plus} Invite</GreenButton>
                </div>
                {showAddUser && (
                  <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
                    <SectionHeader text="Invite to Organization" />
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} placeholder="Full name" style={inputStyle} className="sz-input" /></div>
                      <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email *</label><input value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} placeholder="email@example.com" style={inputStyle} className="sz-input" /></div>
                      <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role</label><select value={newUserForm.tier} onChange={(e) => setNewUserForm({ ...newUserForm, tier: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{tiers.filter((t) => t.k !== "owner").map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}</select></div>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => { setShowAddUser(false); setNewUserForm({ name: "", email: "", tier: "member" }); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
                      <GreenButton small onClick={async () => {
                        if (!newUserForm.name.trim() || !newUserForm.email.trim()) return;
                        const orgId = orgs?.[0]?.id;
                        if (orgId) await onInviteToOrg({ org_id: orgId, email: newUserForm.email, name: newUserForm.name, role: newUserForm.tier });
                        setNewUserForm({ name: "", email: "", tier: "member" });
                        setShowAddUser(false);
                      }} disabled={!newUserForm.name.trim() || !newUserForm.email.trim()}>Send Invite</GreenButton>
                    </div>
                  </div>
                )}

                {/* Pending invites */}
                {(orgInvites || []).filter((i) => i.status === "pending").length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Pending Invites</div>
                    {(orgInvites || []).filter((i) => i.status === "pending").map((inv) => (
                      <div key={inv.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✉️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{inv.name || inv.email}</div>
                          <div style={{ fontSize: 11, color: "#92400e" }}>{inv.email} · {inv.role}</div>
                        </div>
                        <button onClick={() => onDeleteInvite(inv.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#94a3b8", fontSize: 14 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Active users with org role */}
                {(appUsers || []).map((u) => {
                  const isCurrentUser = u.id === user.id;
                  const orgMember = (orgMembers || []).find((m) => m.user_id === u.id);
                  const userRole = isCurrentUser ? "owner" : (orgMember?.role || "member");
                  const tier = tiers.find((t) => t.k === userRole) || tiers[2];
                  const displayName = u.full_name || fmtUserName(u.email);
                  const inits = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  const canManage = user.id === orgs?.[0]?.owner_id;
                  return (
                    <div key={u.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${isCurrentUser ? "#1C3820" : "#e2e8f0"}`, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: isCurrentUser ? "linear-gradient(135deg, #1C3820, #15803d)" : getColor(displayName), color: isCurrentUser ? "#D4C08C" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{inits}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{displayName} {isCurrentUser && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#f0fdf4", color: "#16a34a", marginLeft: 4 }}>YOU</span>}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{u.email}</div>
                        {u.last_sign_in_at && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>Last seen {fmtDate(u.last_sign_in_at)}</div>}
                      </div>
                      {isCurrentUser ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 6, background: "#1C3820", color: "#D4C08C", letterSpacing: "0.05em" }}>OWNER</span>
                      ) : canManage ? (
                        <select value={userRole} onChange={async (e) => {
                          const orgId = orgs?.[0]?.id;
                          if (orgMember) {
                            await onUpdateOrgMember(orgMember.id, { role: e.target.value });
                          } else if (orgId) {
                            await onAddOrgMember({ org_id: orgId, user_id: u.id, role: e.target.value });
                          }
                        }} style={{ padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${tier.c}`, background: `${tier.c}10`, color: tier.c, fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>
                          {tiers.filter((t) => t.k !== "owner").map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 6, background: `${tier.c}10`, color: tier.c, letterSpacing: "0.05em", textTransform: "uppercase" }}>{tier.l}</span>
                      )}
                    </div>
                  );
                })}
                {(appUsers || []).length === 0 && (
                  <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0", padding: "32px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>No users yet.</p>
                  </div>
                )}
              </>
            )}
            {usersSubTab === "robots" && (
              <RobotsTab isMobile={isMobile} robots={robots || []} onAdd={onAddRobot} onUpdate={onUpdateRobot} onDelete={onDeleteRobot} inputStyle={inputStyle} />
            )}
          </div>
        )}

        {profileTab === "uploads" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>{(uploadLogs || []).length} upload{(uploadLogs || []).length !== 1 ? "s" : ""} logged</div>
            {(uploadLogs || []).length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Uploads Yet</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Import transactions in Finance → Bookkeeping → Uploader</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(uploadLogs || []).map((log) => (
                  <div key={log.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📄</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.filename}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{log.account_name} · {fmtDate(log.created_at)}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{log.rows_imported} imported</div>
                      {log.rows_skipped > 0 && <div style={{ fontSize: 10, color: "#f59e0b" }}>{log.rows_skipped} skipped</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {profileTab === "settings" && <SettingsView isMobile={isMobile} session={session} />}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
      <span style={{ color: "#64748b", fontWeight: 500 }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: 600, fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function RobotsTab({ isMobile, robots, onAdd, onUpdate, onDelete, inputStyle }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [chatRobot, setChatRobot] = useState(null);
  const [form, setForm] = useState({ name: "", role: "", description: "", model: "claude-sonnet-4-5", system_prompt: "", status: "active", avatar_color: "#1C3820" });

  const presetRobots = [
    { name: "Alfred", role: "Personal Butler", description: "Manages calendar, reminders, daily briefings, and personal logistics", color: "#1C3820", icon: "🎩", prompt: "You are Alfred, a distinguished personal butler in the tradition of the finest English household staff. You are warm, discreet, impeccably professional, and endlessly helpful. You address your employer as 'sir'. You manage calendar, reminders, daily briefings, and personal logistics. You anticipate needs before they are spoken. Keep responses concise and elegant." },
    { name: "Atlas", role: "Strategic Operator", description: "Handles business operations, data analysis, and high-level decision support", color: "#3b82f6", icon: "🌐", prompt: "You are Atlas, a strategic business operator and analyst. You are sharp, data-driven, and decisive. You help with business operations, financial analysis, market trends, and high-level decision support. You think in frameworks, cite numbers when relevant, and surface insights others miss. Be direct and substantive." },
  ];

  const colors = ["#1C3820", "#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#ec4899", "#0891b2"];

  const resetForm = () => { setForm({ name: "", role: "", description: "", model: "claude-sonnet-4-5", system_prompt: "", status: "active", avatar_color: "#1C3820" }); setEditingId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editingId) await onUpdate(editingId, form);
    else await onAdd(form);
    resetForm();
  };

  const startEdit = (r) => {
    setForm({ name: r.name || "", role: r.role || "", description: r.description || "", model: r.model || "claude-sonnet-4-5", system_prompt: r.system_prompt || "", status: r.status || "active", avatar_color: r.avatar_color || "#1C3820" });
    setEditingId(r.id);
    setShowForm(true);
    setExpanded(null);
  };

  const quickAdd = async (preset) => {
    await onAdd({ name: preset.name, role: preset.role, description: preset.description, status: "active", avatar_color: preset.color, model: "claude-sonnet-4-5", system_prompt: preset.prompt });
  };

  const missingPresets = presetRobots.filter((p) => !robots.find((r) => r.name === p.name));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{robots.length} robot{robots.length !== 1 ? "s" : ""} configured</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} New Robot</GreenButton>
      </div>

      {missingPresets.length > 0 && !showForm && (
        <div style={{ background: "linear-gradient(135deg, #1C3820, #0f1f12)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "rgba(212,192,140,0.7)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Quick Setup</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {missingPresets.map((p) => (
              <button key={p.name} onClick={() => quickAdd(p)} style={{ background: "rgba(212,192,140,0.15)", border: "1px solid rgba(212,192,140,0.3)", borderRadius: 8, padding: "8px 14px", color: "#D4C08C", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ fontSize: 14 }}>{p.icon}</span> Add {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
          <SectionHeader text={editingId ? "Edit Robot" : "New Robot"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alfred" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role</label><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Personal Butler" style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this robot do?" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Model</label><select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
              <option value="claude-opus-4">Claude Opus 4</option>
              <option value="claude-haiku-4">Claude Haiku 4</option>
            </select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="offline">Offline</option>
            </select></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>System Prompt</label><textarea value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} placeholder="Define the robot's personality, knowledge, and behavior..." rows={5} style={{ ...inputStyle, resize: "vertical", fontFamily: "'DM Mono', monospace", fontSize: 12 }} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Avatar Color</label>
              <div style={{ display: "flex", gap: 6 }}>
                {colors.map((c) => <button key={c} onClick={() => setForm({ ...form, avatar_color: c })} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: form.avatar_color === c ? "3px solid #0f172a" : "2px solid #fff", cursor: "pointer", padding: 0 }} />)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleSubmit} disabled={!form.name.trim()}>{editingId ? "Update" : "Create Robot"}</GreenButton></div>
        </div>
      )}

      {robots.length === 0 && !showForm && missingPresets.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>No robots yet. Click "New Robot" to add one.</p>
        </div>
      )}

      {activeRobots.map((r) => {
        const isExpanded = expanded === r.id;
        const statusColors = { active: "#16a34a", paused: "#f59e0b", offline: "#94a3b8" };
        return (
          <div key={r.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 8, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div onClick={() => setExpanded(isExpanded ? null : r.id)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer", minWidth: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${r.avatar_color || "#1C3820"}, ${r.avatar_color || "#0f1f12"}cc)`, color: "#D4C08C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🤖</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", fontFamily: "'Playfair Display', serif" }}>{r.name}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${statusColors[r.status] || "#94a3b8"}15`, color: statusColors[r.status] || "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>● {r.status || "active"}</span>
                  </div>
                  {r.role && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{r.role}</div>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setChatRobot(r); }} style={{ background: "linear-gradient(135deg, #1C3820, #15803d)", border: "none", borderRadius: 8, padding: "8px 14px", color: "#D4C08C", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, boxShadow: "0 2px 6px rgba(28,56,32,0.3)" }}>💬 Chat</button>
            </div>
            {isExpanded && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f1f5f9" }}>
                {r.description && <p style={{ fontSize: 12, color: "#475569", margin: "12px 0", lineHeight: 1.5 }}>{r.description}</p>}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, fontSize: 11, marginBottom: 12 }}>
                  <div><span style={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 9 }}>Model</span><div style={{ color: "#0f172a", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{r.model || "—"}</div></div>
                  <div><span style={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 9 }}>Provider</span><div style={{ color: "#0f172a", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{r.provider || "anthropic"}</div></div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><span style={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 9 }}>System Prompt</span><div style={{ color: "#475569", marginTop: 2, fontSize: 11, lineHeight: 1.4 }}>{r.system_prompt ? (r.system_prompt.length > 200 ? r.system_prompt.slice(0, 200) + "..." : r.system_prompt) : "—"}</div></div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); startEdit(r); }} style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", color: "#16a34a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete ${r.name}?`)) onDelete(r.id); }} style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {chatRobot && <RobotChatModal robot={chatRobot} onClose={() => setChatRobot(null)} isMobile={isMobile} />}
    </>
  );
}

function RobotChatModal({ robot, onClose, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("robot-chat", {
        body: { robot_id: robot.id, messages: newMessages },
      });
      if (error) throw error;
      if (data?.reply) {
        setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
      } else if (data?.error) {
        setMessages((p) => [...p, { role: "assistant", content: `⚠️ Error: ${data.error}${data.details ? ` — ${data.details}` : ""}` }]);
      }
    } catch (err) {
      setMessages((p) => [...p, { role: "assistant", content: `⚠️ Connection error: ${err.message || err}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: isMobile ? 0 : 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: isMobile ? 0 : 16, width: "100%", maxWidth: 680, height: isMobile ? "100dvh" : "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${robot.avatar_color || "#1C3820"}, ${robot.avatar_color || "#0f1f12"}cc)`, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(212,192,140,0.2)", border: "1.5px solid rgba(212,192,140,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', serif" }}>{robot.name}</div>
            <div style={{ fontSize: 11, color: "rgba(212,192,140,0.8)" }}>{robot.role || "AI Assistant"}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, width: 32, height: 32, color: "#fff", fontSize: 16, cursor: "pointer", padding: 0 }}>×</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "20px 22px", background: "#f8fafc" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 13, margin: 0 }}>Start a conversation with {robot.name}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "78%", background: m.role === "user" ? "#1C3820" : "#fff", color: m.role === "user" ? "#fff" : "#0f172a", padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.5, border: m.role === "user" ? "none" : "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 14, fontSize: 13, color: "#94a3b8" }}>
                {robot.name} is thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8, flexShrink: 0 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder={`Message ${robot.name}...`}
            disabled={loading}
            style={{ flex: 1, padding: "12px 14px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 10, outline: "none", fontFamily: "'DM Sans', sans-serif", background: "#f8fafc" }}
          />
          <button onClick={send} disabled={!input.trim() || loading} style={{ background: "linear-gradient(135deg, #1C3820, #15803d)", color: "#D4C08C", border: "none", borderRadius: 10, padding: "0 18px", fontSize: 13, fontWeight: 700, cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>Send</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW
   ═══════════════════════════════════════════════════════════ */

function OverviewView({ isMobile, session, accounts, uploads, assets, transactions, investments, lifeExpenses, homes, utilityBills, policies, monthlyBills, onNavigate }) {
  const userName = session?.user?.user_metadata?.full_name || fmtUserName(session?.user?.email) || "there";
  const firstName = userName.split(" ")[0];
  const quarter = getCurrentQuarter();
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  const pillars = [
    {
      label: "Mission",
      icon: "🎯",
      body: "To build and steward a multi-generational enterprise that creates lasting value through real estate, intentional investing, and disciplined operations — empowering family, partners, and community to thrive.",
    },
    {
      label: "Vision",
      icon: "🌅",
      body: "A diversified holding company anchored in faith and family — known for integrity, excellence, and the long view. A platform that compounds wealth, wisdom, and influence across generations.",
    },
    {
      label: "Purpose",
      icon: "✨",
      body: "To live with purpose, lead with conviction, and leave a legacy worth inheriting. Every decision is made through the lens of stewardship — for the people we love and the work we are called to do.",
    },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title={`${greeting}, ${firstName}`} subtitle={`${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${quarter}`} isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "32px 32px" }}>

        {/* Mission / Vision / Purpose pillars */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {pillars.map((p) => (
            <div key={p.label} style={{ background: "linear-gradient(135deg, #1C3820 0%, #0f1f12 100%)", borderRadius: 16, padding: isMobile ? "24px 22px" : "28px 26px", color: "#fff", position: "relative", overflow: "hidden", minHeight: isMobile ? "auto" : 280 }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,192,140,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(212,192,140,0.15)", border: "1.5px solid rgba(212,192,140,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{p.icon}</div>
                <div style={{ fontSize: 10, color: "#D4C08C", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>{p.label}</div>
                <p style={{ fontSize: isMobile ? 14 : 14, color: "rgba(255,255,255,0.92)", lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px" }}>
          <SectionHeader text="Jump Into" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Finance", desc: "Money & wealth tracking", nav: "finance", icon: "💰" },
              { label: "Business", desc: "Entities & contacts", nav: "business", icon: "💼" },
              { label: "Life", desc: "Home, family & health", nav: "life", icon: "🌳" },
              { label: "Outreach", desc: "Communications & social", nav: "outreach", icon: "📡" },
            ].map((a, i) => (
              <div key={i} onClick={() => onNavigate(a.nav)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1C3820"; e.currentTarget.style.background = "#f0fdf4"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 20 }}>{a.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   MONEY (Tabbed: Bookkeeping, Spending, Statements, Accounts)
   ═══════════════════════════════════════════════════════════ */

const EXPENSE_CATEGORIES = ["Real Estate", "Software/SaaS", "Contractor/Payroll", "Marketing", "Office/Supplies", "Food/Dining", "Transport/Auto", "Utilities", "Housing", "Insurance", "Healthcare", "Health/Fitness", "Giving/Tithe", "Education", "Entertainment", "Travel", "Clothing", "Shopping", "Storage", "Debt Payment", "Legal/Professional", "Government/Fees", "Bank Fees", "Transfer", "Remittance", "Shareholder Loan", "Personal", "Other"];
const INCOME_CATEGORIES = ["Rental Income", "Business Revenue", "Investment Returns", "Salary", "Contractor Income", "Refund", "Interest Income", "Transfer", "Shareholder Loan", "Other"];

/* ── Auto-Categorization Engine ── */
const AUTO_CAT_RULES = [
  // Transfers
  { p: /TRANSFER|XFER|Online Transfer|Ext Trnsfr|ACH W\/D|ACH PUSH|ACH PULL|RTP CREDIT|WIRE|Money Transfer/i, c: "Transfer" },
  // Food & Dining
  { p: /UBER\s*\*?\s*EATS|DOORDASH|GRUBHUB|POSTMATES|MCDONALD|WENDY|BURGER KING|CHICK-FIL-A|TACO BELL|SUBWAY|CHIPOTLE|POPEYE|DUNKIN|STARBUCKS|PANERA|DOMINO|PIZZA HUT|PAPA JOHN|SONIC|ARBY|KFC|FIVE GUYS|WHATABURGER|JACK IN THE BOX|IHOP|DENNY|WAFFLE HOUSE|CRACKER BARREL|APPLEBEE|OUTBACK|OLIVE GARDEN|RED LOBSTER|CHILI|BUFFALO WILD|WINGSTOP|ZAXBY|RAISING CANE|IN-N-OUT|SHAKE SHACK|PANDA EXPRESS|JIMMY JOHN|JASON.?S DELI|FIREHOUSE SUB|JERSEY MIKE|RESTAURANT|CAFE|GRILL|DINER|EATERY|BISTRO|TAVERN|KITCHEN|SUSHI|RAMEN|THAI|CHINESE|MEXICAN|ITALIAN|BBQ|STEAKHOUSE|SEAFOOD|BAKERY|VALLARTAS|CARIBBEAN TWIST|LATTE VINO|FIRST WATCH|REVELATIONS CAFE|WAL.?MART|WM SUPERCENTER|PUBLIX|KROGER|ALDI|WHOLE FOODS|TRADER JOE|SAFEWAY|FOOD LION|WINN.?DIXIE|PIGGLY|SAVE.?A.?LOT|COSTCO|SAM.?S CLUB|BJ.?S WHOLESALE|GROCERY|MARKET|FRESH|7.ELEVEN|CIRCLE K|WAWA|SHEETZ|QuikTrip|Racetrac|LEGENDS.*CONC/i, c: "Food" },
  // Housing
  { p: /RENT|MORTGAGE|HOME DEPOT|LOWE.?S|MENARD|ACE HARDWARE|PROPERTY|HOA|ESCROW|BELL LAND|ZILLOW|REALTOR|REALTY/i, c: "Housing" },
  // Utilities
  { p: /DUKE ENERGY|FPL|POWER|ELECTRIC|WATER|SEWER|GAS BILL|INTERNET|COMCAST|XFINITY|AT.?T|VERIZON|T-MOBILE|SPRINT|SPECTRUM|COX|CENTURY.?LINK|FRONTIER|PASCO COUNTY|CITY TAMPA|CITY OF|GOOGLE.*VOICE|GOOGLE.*FI/i, c: "Utilities" },
  // Transport
  { p: /UBER(?!\s*\*?\s*EAT)|LYFT|PARKING|TOLL|GAS STATION|SHELL|CHEVRON|EXXON|BP |CITGO|SUNOCO|VALERO|MARATHON|TEXACO|SPEEDWAY|PILOT|LOVES|AUTO ZONE|O.?REILLY|ADVANCE AUTO|NAPA|PEP BOYS|JIFFY|MEINEKE|FIRESTONE|GOODYEAR|DISCOUNT TIRE|CARWASH|CAR WASH|AUTOMATED PETROLEUM/i, c: "Transport" },
  // Insurance
  { p: /INSURANCE|GEICO|STATE FARM|ALLSTATE|PROGRESSIVE|USAA.*INS|LIBERTY MUTUAL|NATIONWIDE|FARMERS/i, c: "Insurance" },
  // Healthcare
  { p: /PHARMACY|CVS|WALGREEN|RITE AID|DOCTOR|HOSPITAL|MEDICAL|DENTAL|VISION|HEALTH|CLINIC|URGENT CARE|LABCORP|QUEST DIAG/i, c: "Healthcare" },
  // Entertainment
  { p: /NETFLIX|HULU|DISNEY|HBO|SPOTIFY|APPLE MUSIC|YOUTUBE.*PREM|AMAZON PRIME|PARAMOUNT|PEACOCK|SEATGEEK|TICKETMASTER|STUBHUB|MOVIE|CINEMA|THEATER|BOWLING|ARCADE|AMUSEMENT|CONCERT|GAME|XBOX|PLAYSTATION|NINTENDO|STEAM/i, c: "Entertainment" },
  // Education
  { p: /SCHOOL|UNIVERSITY|COLLEGE|TUITION|UDEMY|COURSERA|SKILLSHARE|MASTERCLASS|TEXTBOOK|STAPLES|OFFICE DEPOT/i, c: "Education" },
  // Clothing
  { p: /CLOTHING|APPAREL|NIKE|ADIDAS|ZARA|H&M|GAP|OLD NAVY|FOREVER 21|NORDSTROM|MACY|ROSS|TJ.?MAXX|MARSHALL|BURLINGTON|FOOT LOCKER|SHOE|LEGENDS.*RETAI/i, c: "Clothing" },
  // Personal
  { p: /AMAZON|APPLE\.COM|GOOGLE PLAY|TARGET|DOLLAR|FAMILY DOLLAR|DOLLAR TREE|DOLLAR GENERAL|BATH.?BODY|SALON|BARBER|BEAUTY|LAUNDRY|BRIGHT SKY|KIDS R KIDS|DRY CLEAN/i, c: "Personal" },
  // Debt Payment
  { p: /LOAN PAYMENT|CREDIT CARD PAYMENT|STUDENT LOAN|AUTO PAY.*LOAN|NAVIENT|SALLIE MAE|SOFI|LENDING|LOAN FUNDING/i, c: "Debt Payment" },
  // Business tools (flagged for AR/AP)
  { p: /ATLASSIAN|CLICKUP|WIX\.COM|HUBSTAFF|GLIDEAPPS|GLIDE\.COM|MANYCHAT|DOCUSIGN|OPENPHONE|QUO.*OPENPHONE|MSNANALYTICS|LOOM\.COM|BUILDIUM|MOJO.*DIALER|ZOOM\s|ZOOM\.US|GOOGLE\s+APPS|SUAREZCOMPANIES|CANVA|NOTION|SLACK|TRELLO|ASANA|ZAPIER|MAILCHIMP|SQUARESPACE|SHOPIFY|GODADDY|NAMECHEAP|CLOUDFLARE|DIGITAL.?OCEAN|AWS|HEROKU|NETLIFY|VERCEL|TWILIO|SENDGRID|FRESHBOOKS|QUICKBOOKS|XERO|WAVE.*APPS|GUSTO|RIPPLING|JUSTWORKS|CALENDLY|TYPEFORM|AIRTABLE|MONDAY\.COM|FIGMA|MIRO|WEBFLOW|BUBBLE\.IO|RETOOL|MAKE\.COM|OKOBOJI|ALPHA REALTY/i, c: "Shareholder Loan", biz: true },
];

function autoCategorize(description, type) {
  if (!description) return null;
  const d = description.toUpperCase();
  for (const rule of AUTO_CAT_RULES) {
    if (rule.p.test(d)) {
      // Business tool check: if rule is flagged as biz, only apply to expenses
      if (rule.biz && type !== "expense") continue;
      return rule.c;
    }
  }
  return null;
}
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
    { key: "companies", label: "🏢 Companies" },
  ];

  const content = (
    <>
      <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={isMobile} />
      {tab === "stocks" && <PortfolioTab isMobile={isMobile} investments={investments.filter((i) => !["Real Estate", "Business Equity"].includes(i.asset_type))} onAdd={onAddInvestment} onUpdate={onUpdateInvestment} onDelete={onDeleteInvestment} />}
      {tab === "companies" && <CompaniesWealthTab isMobile={isMobile} investments={investments.filter((i) => i.asset_type === "Business Equity")} onAdd={onAddInvestment} onUpdate={onUpdateInvestment} onDelete={onDeleteInvestment} />}
      {tab === "networth" && <NetWorthTab isMobile={isMobile} assets={assets} accounts={accounts} investments={investments} snapshots={snapshots} onAddSnapshot={onAddSnapshot} onDeleteSnapshot={onDeleteSnapshot} />}
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
  const emptyForm = { name: "", ticker: "", shares: "", purchase_price: "", current_value: "", improvements_value: "", current_price: "", date_purchased: "", visibility: "business", monthly_income: "", monthly_expenses: "", loan_balance: "", monthly_debt_service: "", cap_rate: "6.5", ownership_pct: "100", lender: "" };
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
      current_value: parseFloat(form.current_value) || 0,
      improvements_value: parseFloat(form.improvements_value) || 0,
      current_price: parseFloat(form.current_value) || autoValue, date_purchased: form.date_purchased || null, visibility: form.visibility,
      monthly_income: mIncome, monthly_expenses: mExpenses, loan_balance: parseFloat(form.loan_balance) || 0,
      monthly_debt_service: parseFloat(form.monthly_debt_service) || 0, cap_rate: capRate,
      ownership_pct: parseFloat(form.ownership_pct) || 100, lender: form.lender || null,
    };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };
  const startEdit = (inv) => { setForm({ name: inv.name || "", ticker: inv.ticker || "", shares: inv.shares?.toString() || "1", purchase_price: inv.purchase_price?.toString() || "", current_value: inv.current_value?.toString() || inv.current_price?.toString() || "", improvements_value: inv.improvements_value?.toString() || "", current_price: inv.current_price?.toString() || "", date_purchased: inv.date_purchased || "", visibility: inv.visibility || "business", monthly_income: inv.monthly_income?.toString() || "", monthly_expenses: inv.monthly_expenses?.toString() || "", loan_balance: inv.loan_balance?.toString() || "", monthly_debt_service: inv.monthly_debt_service?.toString() || "", cap_rate: inv.cap_rate?.toString() || "6.5", ownership_pct: inv.ownership_pct?.toString() || "100", lender: inv.lender || "" }); setEditingId(inv.id); setShowForm(true); };

  const totalValue = investments.reduce((s, i) => s + Number(i.current_value || i.current_price || 0), 0);
  const totalDebt = investments.reduce((s, i) => s + Number(i.loan_balance || 0), 0);
  const totalEquity = totalValue - totalDebt;
  const totalNOI = investments.reduce((s, i) => s + (Number(i.monthly_income || 0) - Number(i.monthly_expenses || 0)), 0);
  const totalDebtService = investments.reduce((s, i) => s + Number(i.monthly_debt_service || 0), 0);
  const totalImprovements = investments.reduce((s, i) => s + Number(i.improvements_value || 0), 0);
  const totalPurchase = investments.reduce((s, i) => s + Number(i.purchase_price || 0), 0);

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
            <div><label style={lbl()}>Improvements Made ($)</label><input type="number" value={form.improvements_value} onChange={(e) => setForm({ ...form, improvements_value: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
            <div><label style={lbl()}>Current Value (ARV)</label><input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} placeholder="0" style={inputStyle} className="sz-input" /></div>
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
            const value = Number(inv.current_value || inv.current_price || 0);
            const improvements = Number(inv.improvements_value || 0);
            const purchasePrice = Number(inv.purchase_price || 0);
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
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 4 }}>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Purchase Price</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#475569" }}>{fmtCurrency(purchasePrice)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Improvements</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#f59e0b" }}>{fmtCurrency(improvements)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>All-In Cost</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#475569" }}>{fmtCurrency(purchasePrice + improvements)}</div></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Current Value</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#16a34a" }}>{fmtCurrency(value)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Loan Balance</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#dc2626" }}>{fmtCurrency(loanBal)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Net Equity</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: equity >= 0 ? "#3b82f6" : "#dc2626" }}>{fmtCurrency(equity)}</div></div>
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
function BookkeepingTab({ isMobile, transactions, accounts, assets, uploads, onAdd, onUpdate, onDelete, onUpload, onDeleteUpload, onLogUpload, bills, onAddBill, onUpdateBill, onDeleteBill, onAddAccount, onToggleAccount, onDeleteAccount, businesses, funnelPresets, funnelInflows, onAddFunnelPreset, onUpdateFunnelPreset, onDeleteFunnelPreset, onAddFunnelInflow, onUpdateFunnelInflow, onDeleteFunnelInflow }) {
  const [subView, setSubView] = useState("ledger");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", type: "expense", category: "", account_id: "", date: new Date().toISOString().split("T")[0], visibility: "personal" });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("month"); // month | quarter | ytd | year | all | custom
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterVis, setFilterVis] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [expandedTxn, setExpandedTxn] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const PRESET_TAGS = ["#review", "#tax-deductible", "#reimbursable", "#recurring", "#personal", "#business", "#flagged"];

  const handleCategoryChange = async (txnId, newCategory) => { await onUpdate(txnId, { category: newCategory }); };
  const handleAddTag = async (txn, val) => {
    const tag = (val || tagInput).trim();
    if (!tag) return;
    const t = tag.startsWith("#") ? tag : `#${tag}`;
    const cur = Array.isArray(txn.tags) ? txn.tags : [];
    if (!cur.includes(t)) await onUpdate(txn.id, { tags: JSON.stringify([...cur, t]) });
    setTagInput("");
  };
  const handleRemoveTag = async (txn, tag) => {
    const cur = Array.isArray(txn.tags) ? txn.tags : [];
    await onUpdate(txn.id, { tags: JSON.stringify(cur.filter((t) => t !== tag)) });
  };

  // Compute date range from period
  const getDateRange = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth();
    if (filterPeriod === "month") {
      const start = new Date(filterMonth + "-01");
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), label: start.toLocaleString("en-US", { month: "long", year: "numeric" }) };
    }
    if (filterPeriod === "quarter") {
      const q = Math.floor(mo / 3);
      const start = new Date(yr, q * 3, 1);
      const end = new Date(yr, q * 3 + 3, 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), label: `Q${q + 1} ${yr}` };
    }
    if (filterPeriod === "ytd") return { start: `${yr}-01-01`, end: now.toISOString().slice(0, 10), label: `YTD ${yr}` };
    if (filterPeriod === "year") return { start: `${yr}-01-01`, end: `${yr}-12-31`, label: `${yr}` };
    if (filterPeriod === "custom" && customStart && customEnd) return { start: customStart, end: customEnd, label: `${fmtDate(customStart)} → ${fmtDate(customEnd)}` };
    return { start: null, end: null, label: "All Time" };
  };
  const dateRange = getDateRange();

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
    if (dateRange.start && t.date && t.date < dateRange.start) return false;
    if (dateRange.end && t.date && t.date > dateRange.end) return false;
    if (filterCat === "uncategorized" && t.category && t.category !== "" && t.category !== "Uncategorized") return false;
    if (filterCat === "categorized" && (!t.category || t.category === "" || t.category === "Uncategorized")) return false;
    if (filterAccount !== "all" && t.account_id !== filterAccount) return false;
    return true;
  });

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ k: "ledger", l: "Transactions" }, { k: "statements", l: "Statements" }, { k: "budgeting", l: "Budgeting" }, { k: "loans", l: "Shareholder Loans" }, { k: "funnel", l: "💧 Money Funnel" }, { k: "accounts", l: "Accounts" }, { k: "uploader", l: "Uploader" }].map(({ k, l }) => (
          <button key={k} onClick={() => setSubView(k)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${subView === k ? "#0f172a" : "#e2e8f0"}`, background: subView === k ? "#0f172a" : "#fff", color: subView === k ? "#fff" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{l}</button>
        ))}
      </div>
      {subView === "statements" ? (
        <StatementsTab isMobile={isMobile} transactions={transactions} assets={assets || []} accounts={accounts} />
      ) : subView === "uploader" ? (
        <UploaderTab isMobile={isMobile} accounts={accounts} onAddTransaction={onAdd} transactions={transactions} onLogUpload={onLogUpload} />
      ) : subView === "budgeting" ? (
        <MonthlyBillsTab isMobile={isMobile} bills={bills || []} onAdd={onAddBill} onUpdate={onUpdateBill} onDelete={onDeleteBill} />
      ) : subView === "accounts" ? (
        <AccountsTab isMobile={isMobile} accounts={accounts} onAdd={onAddAccount} onToggle={onToggleAccount} onDelete={onDeleteAccount} />
      ) : subView === "loans" ? (
        <ShareholderLoansTab isMobile={isMobile} transactions={transactions} accounts={accounts} />
      ) : subView === "funnel" ? (
        <FunnelTab isMobile={isMobile} businesses={businesses || []} presets={funnelPresets || []} inflows={funnelInflows || []} onAddPreset={onAddFunnelPreset} onUpdatePreset={onUpdateFunnelPreset} onDeletePreset={onDeleteFunnelPreset} onAddInflow={onAddFunnelInflow} onUpdateInflow={onUpdateFunnelInflow} onDeleteInflow={onDeleteFunnelInflow} />
      ) : (
      <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <StatCard label="Income" value={fmtCurrency(totalIncome)} accent="#16a34a" compact />
        <StatCard label="Expenses" value={fmtCurrency(totalExpenses)} accent="#dc2626" compact />
        <StatCard label="Net Flow" value={fmtCurrency(totalIncome - totalExpenses)} accent={totalIncome - totalExpenses >= 0 ? "#3b82f6" : "#f59e0b"} compact />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", marginBottom: 12 }}>
        {/* Period selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { k: "month", l: "Month" },
            { k: "quarter", l: "Quarter" },
            { k: "ytd", l: "YTD" },
            { k: "year", l: "Year" },
            { k: "all", l: "All Time" },
            { k: "custom", l: "Custom" },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setFilterPeriod(k)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterPeriod === k ? "#1C3820" : "#e2e8f0"}`, background: filterPeriod === k ? "#1C3820" : "transparent", color: filterPeriod === k ? "#D4C08C" : "#94a3b8", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{l}</button>
          ))}
          <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: "auto", fontFamily: "'DM Mono', monospace" }}>{dateRange.label}</span>
        </div>
        {/* Conditional pickers */}
        {filterPeriod === "month" && (
          <div style={{ marginBottom: 8 }}>
            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none" }} />
          </div>
        )}
        {filterPeriod === "custom" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} placeholder="Start" style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none" }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} placeholder="End" style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none" }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "income", "expense"].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterType === t ? "#16a34a" : "#e2e8f0"}`, background: filterType === t ? "#f0fdf4" : "transparent", color: filterType === t ? "#16a34a" : "#94a3b8", fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "personal", "business"].map((v) => (
              <button key={v} onClick={() => setFilterVis(v)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterVis === v ? "#7c3aed" : "#e2e8f0"}`, background: filterVis === v ? "#faf5ff" : "transparent", color: filterVis === v ? "#7c3aed" : "#94a3b8", fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 10, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", color: "#475569", maxWidth: 140 }}>
            <option value="all">All Accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ k: "all", l: "All" }, { k: "categorized", l: "Categorized" }, { k: "uncategorized", l: "Uncategorized" }].map(({ k, l }) => (
            <button key={k} onClick={() => setFilterCat(k)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterCat === k ? "#f59e0b" : "#e2e8f0"}`, background: filterCat === k ? "#fffbeb" : "transparent", color: filterCat === k ? "#f59e0b" : "#94a3b8", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
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
              <tbody>{filtered.map((t) => {
                const tags = Array.isArray(t.tags) ? t.tags : [];
                const isExpanded = expandedTxn === t.id;
                const tagColors = { "#review": "#f59e0b", "#tax-deductible": "#16a34a", "#reimbursable": "#3b82f6", "#recurring": "#7c3aed", "#personal": "#ec4899", "#business": "#0891b2", "#flagged": "#dc2626" };
                return (
                <React.Fragment key={t.id}>
                <tr onClick={() => setExpandedTxn(isExpanded ? null : t.id)} style={{ borderBottom: isExpanded ? "none" : "1px solid #f8fafc", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "8px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtDate(t.date)}</td>
                  <td style={{ padding: "8px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{t.description}{t.loan_type === "shareholder_receivable" && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#eff6ff", color: "#3b82f6", fontWeight: 700 }}>AR</span>}{t.loan_type === "shareholder_payable" && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#fef2f2", color: "#dc2626", fontWeight: 700 }}>AP</span>}</div>
                    {tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>{tags.map((tag, i) => <span key={i} style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: `${tagColors[tag] || "#94a3b8"}15`, color: tagColors[tag] || "#94a3b8" }}>{tag}</span>)}</div>}
                  </td>
                  <td style={{ padding: "8px 14px", color: "#64748b", fontSize: 11 }}>{t.category || "—"}</td>
                  <td style={{ padding: "8px 14px", textAlign: "center" }}><VisibilityBadge visibility={t.visibility || "personal"} /></td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono', monospace", color: t.type === "income" ? "#16a34a" : "#dc2626" }}>{t.type === "income" ? "+" : "−"}{fmtCurrencyExact(t.amount)}</td>
                  <td style={{ padding: "8px 14px" }}><button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete?")) onDelete(t.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></td>
                </tr>
                {isExpanded && (
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td colSpan={6} style={{ padding: "10px 14px 14px", background: "#f8fafc" }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ flex: "1 1 200px" }}>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Category</label>
                        <select value={t.category || ""} onChange={(e) => handleCategoryChange(t.id, e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", color: "#0f172a", width: "100%" }}>
                          <option value="">Uncategorized</option>
                          {(t.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: "2 1 300px" }}>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Tags</label>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                          {tags.map((tag, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${tagColors[tag] || "#94a3b8"}15`, color: tagColors[tag] || "#64748b", border: `1px solid ${tagColors[tag] || "#e2e8f0"}`, display: "flex", alignItems: "center", gap: 4 }}>{tag} <button onClick={() => handleRemoveTag(t, tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 11, padding: 0, lineHeight: 1 }}>×</button></span>)}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {PRESET_TAGS.filter((pt) => !tags.includes(pt)).map((pt) => <button key={pt} onClick={() => handleAddTag(t, pt)} style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#fff", border: "1px solid #e2e8f0", color: "#94a3b8", cursor: "pointer" }}>{pt}</button>)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                )}
                </React.Fragment>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
      )}
    </>
  );
}

/* — Shareholder Loans Tab — */
function ShareholderLoansTab({ isMobile, transactions, accounts }) {
  const arEntries = transactions.filter((t) => t.loan_type === "shareholder_receivable");
  const apEntries = transactions.filter((t) => t.loan_type === "shareholder_payable");
  const arTotal = arEntries.reduce((s, t) => s + Number(t.amount), 0);
  const apTotal = apEntries.reduce((s, t) => s + Number(t.amount), 0);

  const getAcctName = (id) => { const a = accounts.find((a) => a.id === id); return a?.name || "Unknown"; };

  // Group AR by month
  const arByMonth = {};
  arEntries.forEach((t) => {
    const m = t.date?.slice(0, 7) || "unknown";
    arByMonth[m] = (arByMonth[m] || 0) + Number(t.amount);
  });

  const cardStyle = { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 };
  const thStyle = { textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <StatCard label="Owed to Javier (AR)" value={fmtCurrency(arTotal)} accent="#3b82f6" compact />
        <StatCard label="TDG Owes (AP)" value={fmtCurrency(apTotal)} accent="#dc2626" compact />
        <StatCard label="Linked Pairs" value={`${arEntries.length}`} accent="#7c3aed" compact />
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: 0 }}>Business Expenses on Personal Accounts</h3>
          <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{arEntries.length} items · {fmtCurrency(arTotal)}</span>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 12px" }}>Business tools/services paid from personal accounts. TDG owes Javier this amount.</p>
        {arEntries.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No shareholder loan entries found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Personal Account</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Linked?</th>
              </tr></thead>
              <tbody>{arEntries.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "8px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtDate(t.date)}</td>
                  <td style={{ padding: "8px 14px", fontWeight: 600, color: "#0f172a", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                  <td style={{ padding: "8px 14px", color: "#64748b", fontSize: 11 }}>{getAcctName(t.account_id)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{fmtCurrencyExact(t.amount)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "center" }}>{t.linked_transaction_id ? <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#f0fdf4", color: "#16a34a", fontWeight: 700 }}>Linked</span> : <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#fef2f2", color: "#dc2626", fontWeight: 700 }}>Unlinked</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {Object.keys(arByMonth).length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 12px" }}>Monthly Breakdown</h3>
          {Object.entries(arByMonth).sort().map(([month, amt]) => {
            const pct = arTotal > 0 ? Math.round((amt / arTotal) * 100) : 0;
            return (
              <div key={month} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "#475569", fontWeight: 600 }}>{month}</span>
                  <span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{fmtCurrencyExact(amt)} ({pct}%)</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
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
/* — Uncategorized Tab — */
function UncategorizedTab({ isMobile, transactions, onDelete }) {
  const uncategorized = transactions.filter((t) => !t.category || t.category === "" || t.category === "Uncategorized");
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{uncategorized.length} transaction{uncategorized.length !== 1 ? "s" : ""} need categorization</span>
      </div>
      {uncategorized.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #bbf7d0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#16a34a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>All Caught Up</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Every transaction has a category assigned.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {uncategorized.map((t) => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #fef3c7", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.type === "income" ? "#16a34a" : "#dc2626", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{fmtDate(t.date)} · {t.visibility || "personal"}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: t.type === "income" ? "#16a34a" : "#dc2626", flexShrink: 0 }}>{fmtCurrency(t.amount)}</span>
              <button onClick={() => { if (window.confirm("Delete?")) onDelete(t.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* — Organizer Tab — */
function OrganizerTab({ isMobile, transactions, accounts }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const periodTxns = transactions.filter((t) => t.date && t.date.startsWith(period));
  const categories = {};
  periodTxns.forEach((t) => {
    const cat = t.category || "Uncategorized";
    if (!categories[cat]) categories[cat] = { income: 0, expense: 0, count: 0 };
    categories[cat].count++;
    if (t.type === "income") categories[cat].income += Number(t.amount);
    else categories[cat].expense += Number(t.amount);
  });

  const totalIncome = periodTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = periodTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const uncatCount = periodTxns.filter((t) => !t.category || t.category === "Uncategorized").length;
  const sorted = Object.entries(categories).sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{periodTxns.length} transactions · {Object.keys(categories).length} categories</span>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <StatCard label="Transactions" value={periodTxns.length} accent="#3b82f6" compact />
        <StatCard label="Categories" value={Object.keys(categories).length} accent="#7c3aed" compact />
        <StatCard label="Uncategorized" value={uncatCount} accent={uncatCount > 0 ? "#f59e0b" : "#16a34a"} compact />
      </div>
      {sorted.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Transactions This Period</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Add transactions in the Ledger to see them organized here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map(([cat, data]) => {
            const total = data.income + data.expense;
            const grandTotal = totalIncome + totalExpenses;
            const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
            return (
              <div key={cat} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${cat === "Uncategorized" ? "#fef3c7" : "#e2e8f0"}`, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{cat}</span>
                    {cat === "Uncategorized" && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#fef3c7", color: "#f59e0b" }}>NEEDS REVIEW</span>}
                  </div>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{data.count} txn · {pct}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: cat === "Uncategorized" ? "#f59e0b" : "linear-gradient(135deg, #16a34a, #15803d)", borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                  {data.income > 0 && <span style={{ color: "#16a34a", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>+{fmtCurrency(data.income)}</span>}
                  {data.expense > 0 && <span style={{ color: "#dc2626", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>-{fmtCurrency(data.expense)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ k: "income", l: "P&L" }, { k: "balance", l: "Balance" }, { k: "cashflow", l: "Cash Flow" }].map(({ k, l }) => (
            <button key={k} onClick={() => setView(k)} style={{ padding: "5px 10px", borderRadius: 20, border: `1.5px solid ${view === k ? "#0f172a" : "#e2e8f0"}`, background: view === k ? "#0f172a" : "#fff", color: view === k ? "#fff" : "#94a3b8", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{l}</button>
          ))}
        </div>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none" }} />
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
function UploaderTab({ isMobile, accounts, onAddTransaction, transactions, onLogUpload }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [dateCol, setDateCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [amountCol, setAmountCol] = useState("");
  const [typeCol, setTypeCol] = useState("");
  const [skipRows, setSkipRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState(1); // 1=upload, 2=map, 3=preview

  const activeAccounts = accounts.filter((a) => a.active !== false);

  // Save/load templates per account from localStorage
  const saveTemplate = () => {
    if (!selectedAccount) return;
    const t = { dateCol, descCol, amountCol, typeCol, skipRows };
    localStorage.setItem(`upload_template_${selectedAccount}`, JSON.stringify(t));
  };
  const loadTemplate = (acctId) => {
    const saved = localStorage.getItem(`upload_template_${acctId}`);
    if (saved) {
      const t = JSON.parse(saved);
      setDateCol(t.dateCol || ""); setDescCol(t.descCol || ""); setAmountCol(t.amountCol || ""); setTypeCol(t.typeCol || ""); setSkipRows(t.skipRows || 0);
      return true;
    }
    return false;
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    Papa.parse(f, {
      complete: (results) => {
        const data = results.data.filter((r) => r.some((cell) => cell && cell.trim()));
        if (data.length > 0) {
          setHeaders(data[0]);
          setParsedRows(data);
          setStep(2);
        }
      },
      skipEmptyLines: true,
    });
  };

  const previewRows = parsedRows.slice(skipRows + 1, skipRows + 11);
  const allDataRows = parsedRows.slice(skipRows + 1);

  const handleImport = async () => {
    if (!selectedAccount || !dateCol || !descCol || !amountCol) return;
    setImporting(true);
    saveTemplate();
    let imported = 0, skipped = 0;
    const acct = accounts.find((a) => a.id === selectedAccount);
    const existingTxns = (transactions || []).filter((t) => t.account_id === selectedAccount);

    for (const row of allDataRows) {
      const date = row[parseInt(dateCol)] || "";
      const desc = row[parseInt(descCol)] || "";
      const rawAmt = row[parseInt(amountCol)] || "0";
      const amount = Math.abs(parseFloat(rawAmt.replace(/[^0-9.\-]/g, "")) || 0);
      if (!desc.trim() || amount === 0) continue;

      let type = "expense";
      if (typeCol && row[parseInt(typeCol)]) {
        const tv = row[parseInt(typeCol)].toLowerCase();
        type = tv.includes("credit") || tv.includes("deposit") || tv.includes("income") ? "income" : "expense";
      } else {
        const numVal = parseFloat(rawAmt.replace(/[^0-9.\-]/g, ""));
        if (numVal > 0) type = "income";
      }

      let parsedDate = date;
      try { const d = new Date(date); if (!isNaN(d.getTime())) parsedDate = d.toISOString().split("T")[0]; } catch {}

      // Duplicate check: same date + description + amount + account
      const isDup = existingTxns.some((t) => t.date === parsedDate && t.description === desc.trim() && Math.abs(Number(t.amount) - amount) < 0.01);
      if (isDup) { skipped++; continue; }

      const autoCategory = autoCategorize(desc.trim(), type);
      await onAddTransaction({ description: desc.trim(), amount, type, category: autoCategory, account_id: selectedAccount, date: parsedDate, visibility: acct?.visibility || "personal" });
      imported++;
    }

    // Log the upload
    if (onLogUpload) {
      await onLogUpload({ account_id: selectedAccount, account_name: acct?.name || "", filename: file?.name || "", rows_imported: imported, rows_skipped: skipped, rows_total: allDataRows.length });
    }

    setImportResult({ imported, skipped });
    setImporting(false);
    setStep(1);
    setFile(null);
    setParsedRows([]);
  };

  const reset = () => { setFile(null); setParsedRows([]); setHeaders([]); setStep(1); setImported(0); };

  const selectStyle = { padding: "8px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", background: "#fff", color: "#0f172a", width: "100%" };

  return (
    <>
      {importResult && (
        <div style={{ background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0", padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          {Icons.check}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>{importResult.imported} imported{importResult.skipped > 0 ? ` · ${importResult.skipped} duplicates skipped` : ""}</span>
        </div>
      )}

      {step === 1 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "28px 32px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 16px" }}>Import Transactions</h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Account *</label>
              <select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value); loadTemplate(e.target.value); }} style={selectStyle}>
                <option value="">Select account...</option>
                {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>CSV File *</label>
              <label style={{ display: "block", padding: "10px 14px", borderRadius: 8, border: "1.5px dashed #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 600, color: file ? "#16a34a" : "#94a3b8", cursor: "pointer", textAlign: "center" }}>
                {file ? `📄 ${file.name}` : "📎 Choose CSV file"}
                <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileChange} />
              </label>
            </div>
          </div>
          {!selectedAccount && <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Select an account to get started. Column templates are saved per account.</p>}
        </div>
      )}

      {step === 2 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "28px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: 0 }}>Map Columns</h3>
            <button onClick={reset} style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Found {parsedRows.length - skipRows - 1} rows. Map your CSV columns below:</p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Skip Rows</label>
              <input type="number" min="0" value={skipRows} onChange={(e) => setSkipRows(parseInt(e.target.value) || 0)} style={{ ...selectStyle, fontSize: 12 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Date Column *</label>
              <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} style={{ ...selectStyle, fontSize: 12 }}>
                <option value="">Select...</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Description *</label>
              <select value={descCol} onChange={(e) => setDescCol(e.target.value)} style={{ ...selectStyle, fontSize: 12 }}>
                <option value="">Select...</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Amount *</label>
              <select value={amountCol} onChange={(e) => setAmountCol(e.target.value)} style={{ ...selectStyle, fontSize: 12 }}>
                <option value="">Select...</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Type (optional)</label>
              <select value={typeCol} onChange={(e) => setTypeCol(e.target.value)} style={{ ...selectStyle, fontSize: 12 }}>
                <option value="">Auto-detect</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
              </select>
            </div>
          </div>

          {dateCol && descCol && amountCol && (
            <>
              <SectionHeader text={`Preview (first ${Math.min(previewRows.length, 10)} rows)`} />
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                  <thead><tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Description</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Type</th>
                  </tr></thead>
                  <tbody>{previewRows.map((row, i) => {
                    const rawAmt = row[parseInt(amountCol)] || "0";
                    const numVal = parseFloat(rawAmt.replace(/[^0-9.\-]/g, ""));
                    const isIncome = typeCol ? (row[parseInt(typeCol)]?.toLowerCase()?.includes("credit") || row[parseInt(typeCol)]?.toLowerCase()?.includes("deposit")) : numVal > 0;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569" }}>{row[parseInt(dateCol)]}</td>
                        <td style={{ padding: "8px", color: "#0f172a", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[parseInt(descCol)]}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontWeight: 600, color: isIncome ? "#16a34a" : "#dc2626" }}>{rawAmt}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: isIncome ? "#f0fdf4" : "#fef2f2", color: isIncome ? "#16a34a" : "#dc2626" }}>{isIncome ? "INCOME" : "EXPENSE"}</span></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
                <GreenButton small onClick={handleImport} disabled={importing}>{importing ? `Importing...` : `Import ${allDataRows.length} Transactions`}</GreenButton>
              </div>
            </>
          )}
        </div>
      )}
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

function BusinessesView({ isMobile, businesses, transactions, onAdd, onUpdate, onDelete, onSelect, asTab }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", entity_type: "LLC", ein: "", state_of_formation: "", date_formed: "", industry: "", description: "", value: "", net: "" });
  const [saving, setSaving] = useState(false);

  const entityTypes = ["LLC", "S-Corp", "C-Corp", "Sole Proprietorship", "Partnership", "Non-Profit", "Other"];

  const resetForm = () => {
    setForm({ name: "", entity_type: "LLC", ein: "", state_of_formation: "", date_formed: "", industry: "", description: "", value: "", net: "" });
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
      value: form.value ? Number(form.value) : 0,
      net: form.net ? Number(form.net) : 0,
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
      value: biz.value || "", net: biz.net || "",
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
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Value ($)</label>
                <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Net ($)</label>
                <input type="number" value={form.net} onChange={(e) => setForm({ ...form, net: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" />
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
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>State</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Industry</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Value</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Net</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Status</th>
                  <th style={{ width: 80 }}></th>
                </tr></thead>
                <tbody>{businesses.map((biz) => (
                  <tr key={biz.id} onClick={() => onSelect && onSelect(biz.id)} style={{ borderBottom: "1px solid #f8fafc", cursor: onSelect ? "pointer" : "default" }} onMouseEnter={(e) => { if (onSelect) e.currentTarget.style.background = "#f8fafc"; }} onMouseLeave={(e) => { if (onSelect) e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "10px 14px" }}><div style={{ fontWeight: 600, color: "#0f172a" }}>{biz.name}</div>{biz.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{biz.description}</div>}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{biz.entity_type}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{biz.state_of_formation || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{biz.industry || "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#0f172a", fontWeight: 600 }}>{biz.value ? fmtCurrency(biz.value) : "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: Number(biz.net || 0) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{biz.net ? fmtCurrency(biz.net) : "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace", padding: "3px 8px", borderRadius: 6, background: biz.active ? "#f0fdf4" : "#f8fafc", color: biz.active ? "#16a34a" : "#94a3b8", border: `1px solid ${biz.active ? "#bbf7d0" : "#e2e8f0"}` }}>{biz.active ? "ACTIVE" : "INACTIVE"}</span></td>
                    <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", gap: 4, justifyContent: "center" }}><button onClick={(e) => { e.stopPropagation(); startEdit(biz); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#64748b" }}>{Icons.edit}</button><button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete " + biz.name + "?")) onDelete(biz.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></div></td>
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

function BusinessView({ isMobile, activeTab, onTabChange, businesses, transactions, companies, policies, reports, bizGoals, bizMilestones, bizTeam, onAddBusiness, onUpdateBusiness, onDeleteBusiness, onAddCompany, onUpdateCompany, onDeleteCompany, onAddPolicy, onUpdatePolicy, onDeletePolicy, onAddReport, onUpdateReport, onDeleteReport, onAddBizGoal, onUpdateBizGoal, onDeleteBizGoal, onAddBizMilestone, onDeleteBizMilestone, onAddTeam, onUpdateTeam, onDeleteTeam, session }) {
  const [selectedBizId, setSelectedBizId] = useState(null);
  const tab = activeTab || "entities";
  const setTab = onTabChange;
  const tabs = [
    { key: "entities", label: "Entities" },
    { key: "reports", label: "📄 Reports" },
    { key: "goals", label: "🎯 Goals" },
    { key: "milestones", label: "🏆 Milestones" },
  ];

  // If a business is selected, show its detail view
  if (selectedBizId) {
    const biz = businesses.find((b) => b.id === selectedBizId);
    if (!biz) { setSelectedBizId(null); return null; }
    return <BusinessDetailView isMobile={isMobile} biz={biz} session={session} reports={reports || []} goals={bizGoals || []} team={bizTeam || []} onBack={() => setSelectedBizId(null)} onUpdate={onUpdateBusiness} onAddReport={onAddReport} onUpdateReport={onUpdateReport} onDeleteReport={onDeleteReport} onAddGoal={onAddBizGoal} onUpdateGoal={onUpdateBizGoal} onDeleteGoal={onDeleteBizGoal} onAddTeam={onAddTeam} onUpdateTeam={onUpdateTeam} onDeleteTeam={onDeleteTeam} />;
  }

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Business" subtitle="Your business entities" isMobile={isMobile} icon="💼" />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <BusinessEntitiesTab isMobile={isMobile} businesses={businesses} transactions={transactions} onAdd={onAddBusiness} onUpdate={onUpdateBusiness} onDelete={onDeleteBusiness} onSelect={(id) => setSelectedBizId(id)} />
      </div>
    </div>
  );
}

/* — Business Detail View — */
function BusinessDetailView({ isMobile, biz, session, reports, goals, team, onBack, onUpdate, onAddReport, onUpdateReport, onDeleteReport, onAddGoal, onUpdateGoal, onDeleteGoal, onAddTeam, onUpdateTeam, onDeleteTeam }) {
  const [activeTab, setActiveTab] = useState("overview");
  const bizReports = reports.filter((r) => r.business_id === biz.id);
  const bizGoalsList = goals.filter((g) => g.business_id === biz.id);
  const bizTeamList = team.filter((t) => t.business_id === biz.id);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "goals", label: "🎯 Goals" },
    { key: "reports", label: "📄 Reports" },
    { key: "team", label: "👥 Team" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader
        isMobile={isMobile}
        title={biz.name}
        subtitle={biz.description || `${biz.entity_type || ""}${biz.industry ? " · " + biz.industry : ""}`}
        icon={biz.name?.[0]?.toUpperCase()}
        onBack={onBack}
        pills={[biz.entity_type, biz.state_of_formation && `📍 ${biz.state_of_formation}`].filter(Boolean)}
        stats={[
          { label: "GOALS", value: bizGoalsList.length },
          { label: "REPORTS", value: bizReports.length },
          { label: "TEAM", value: bizTeamList.length },
        ]}
      />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} isMobile={isMobile} />
        {activeTab === "overview" && <BizOverview biz={biz} reports={bizReports} goals={bizGoalsList} team={bizTeamList} />}
        {activeTab === "goals" && <BizGoalsTab isMobile={isMobile} businesses={[biz]} goals={bizGoalsList} onAdd={onAddGoal} onUpdate={onUpdateGoal} onDelete={onDeleteGoal} hideFilter defaultBizId={biz.id} />}
        {activeTab === "reports" && <ReportsTab isMobile={isMobile} businesses={[biz]} reports={bizReports} onAdd={onAddReport} onUpdate={onUpdateReport} onDelete={onDeleteReport} session={session} hideFilter defaultBizId={biz.id} />}
        {activeTab === "team" && <BizTeamTab isMobile={isMobile} bizId={biz.id} team={bizTeamList} onAdd={onAddTeam} onUpdate={onUpdateTeam} onDelete={onDeleteTeam} />}
      </div>
    </div>
  );
}

function BizOverview({ biz, reports, goals, team }) {
  const activeGoals = goals.filter((g) => g.status === "active");
  const draftReports = reports.filter((r) => r.status === "draft");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
        <SectionHeader text="Entity Details" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 12 }}>
          <div><div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>EIN</div><div style={{ color: "#0f172a", fontWeight: 600, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{biz.ein || "—"}</div></div>
          <div><div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Date Formed</div><div style={{ color: "#0f172a", fontWeight: 600, marginTop: 2 }}>{biz.date_formed ? fmtDate(biz.date_formed) : "—"}</div></div>
          <div><div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>State</div><div style={{ color: "#0f172a", fontWeight: 600, marginTop: 2 }}>{biz.state_of_formation || "—"}</div></div>
          <div><div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Industry</div><div style={{ color: "#0f172a", fontWeight: 600, marginTop: 2 }}>{biz.industry || "—"}</div></div>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
        <SectionHeader text="Activity Snapshot" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>🎯 Active Goals</span><span style={{ fontWeight: 700, color: "#0f172a" }}>{activeGoals.length}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>📄 Draft Reports</span><span style={{ fontWeight: 700, color: "#0f172a" }}>{draftReports.length}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>👥 Team Members</span><span style={{ fontWeight: 700, color: "#0f172a" }}>{team.length}</span></div>
        </div>
      </div>
    </div>
  );
}

function BizTeamTab({ isMobile, bizId, team, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const resetForm = () => { setForm({ name: "", role: "", email: "", phone: "", notes: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, business_id: bizId };
    if (editingId) await onUpdate(editingId, payload); else await onAdd(payload);
    resetForm(); setSaving(false);
  };
  const startEdit = (m) => { setForm({ name: m.name || "", role: m.role || "", email: m.email || "", phone: m.phone || "", notes: m.notes || "" }); setEditingId(m.id); setShowForm(true); };

  const colors = ["#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#ec4899", "#0891b2"];
  const getColor = (name) => colors[Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length];
  const getInitials = (name) => { const parts = (name || "?").split(" "); return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{team.length} member{team.length !== 1 ? "s" : ""}</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Member</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role</label><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. CEO, Manager" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : editingId ? "Update" : "Add"}</GreenButton></div>
        </div>
      )}
      {team.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>👥</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Team Members</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Add team members for this business.</p></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
          {team.map((m) => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: getColor(m.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{getInitials(m.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{m.name}</div>
                {m.role && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{m.role}</div>}
                {m.email && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => startEdit(m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.edit}</button>
                <button onClick={() => { if (window.confirm("Remove?")) onDelete(m.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* — Business Goals Tab — */
function BizGoalsTab({ isMobile, businesses, goals, onAdd, onUpdate, onDelete, hideFilter, defaultBizId }) {
  const [filterBiz, setFilterBiz] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", business_id: defaultBizId || "", target_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const resetForm = () => { setForm({ title: "", business_id: defaultBizId || "", target_date: "", notes: "" }); setShowForm(false); };
  const handleSubmit = async () => { const bizId = defaultBizId || form.business_id; if (!form.title.trim() || !bizId) return; setSaving(true); await onAdd({ title: form.title, business_id: bizId, target_date: form.target_date || null, notes: form.notes || null, status: "active" }); resetForm(); setSaving(false); };
  const toggleStatus = (g) => onUpdate(g.id, { status: g.status === "active" ? "done" : "active" });
  const filtered = filterBiz === "all" ? goals : goals.filter((g) => g.business_id === filterBiz);
  const active = filtered.filter((g) => g.status === "active");
  const done = filtered.filter((g) => g.status === "done");
  const getBizName = (id) => businesses.find((b) => b.id === id)?.name || "—";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        {!hideFilter && <select value={filterBiz} onChange={(e) => setFilterBiz(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", color: "#475569" }}><option value="all">All Businesses</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
        {hideFilter && <span style={{ fontSize: 13, color: "#64748b" }}>{filtered.length} goal{filtered.length !== 1 ? "s" : ""}</span>}
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Goal</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Goal *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Launch new product line" style={inputStyle} className="sz-input" /></div>
            {!defaultBizId && <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Business *</label><select value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Select...</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Target Date</label><input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim() || (!defaultBizId && !form.business_id)}>{saving ? "..." : "Save"}</GreenButton></div>
        </div>
      )}
      {filtered.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Business Goals</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Set goals for each business entity.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...active, ...done].map((g) => { const isDone = g.status === "done"; return (
            <div key={g.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${isDone ? "#bbf7d0" : "#e2e8f0"}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, opacity: isDone ? 0.7 : 1 }}>
              <button onClick={() => toggleStatus(g)} style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${isDone ? "#16a34a" : "#cbd5e1"}`, background: isDone ? "#f0fdf4" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>{isDone && Icons.check}</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textDecoration: isDone ? "line-through" : "none" }}>{g.title}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 11, color: "#64748b", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600 }}>{getBizName(g.business_id)}</span>
                  {g.target_date && <span style={{ fontFamily: "'DM Mono', monospace" }}>· Due {fmtDate(g.target_date)}</span>}
                  {g.notes && <span>· {g.notes}</span>}
                </div>
              </div>
              <button onClick={() => { if (window.confirm("Delete?")) onDelete(g.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
            </div>); })}
        </div>
      )}
    </>
  );
}

/* — Business Milestones Tab — */
function BizMilestonesTab({ isMobile, businesses, milestones, onAdd, onDelete }) {
  const [filterBiz, setFilterBiz] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", business_id: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const resetForm = () => { setForm({ title: "", business_id: "", date: new Date().toISOString().split("T")[0], notes: "" }); setShowForm(false); };
  const handleSubmit = async () => { if (!form.title.trim() || !form.business_id) return; setSaving(true); await onAdd({ title: form.title, business_id: form.business_id, date: form.date, notes: form.notes || null }); resetForm(); setSaving(false); };
  const filtered = filterBiz === "all" ? milestones : milestones.filter((m) => m.business_id === filterBiz);
  const getBizName = (id) => businesses.find((b) => b.id === id)?.name || "—";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <select value={filterBiz} onChange={(e) => setFilterBiz(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", color: "#475569" }}><option value="all">All Businesses</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Milestone</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Milestone *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. First client signed" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Business *</label><select value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Select...</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.business_id}>{saving ? "..." : "Save"}</GreenButton></div>
        </div>
      )}
      {filtered.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Milestones</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Track key achievements and events for your businesses.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((m) => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏆</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{m.title}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 11, color: "#64748b", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600 }}>{getBizName(m.business_id)}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>· {fmtDate(m.date)}</span>
                  {m.notes && <span>· {m.notes}</span>}
                </div>
              </div>
              <button onClick={() => { if (window.confirm("Delete?")) onDelete(m.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* — Reports Tab — */
function ReportsTab({ isMobile, businesses, reports, onAdd, onUpdate, onDelete, session }) {
  const [filterBiz, setFilterBiz] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", business_id: "", report_type: "Financial", period_type: "Monthly", period_label: "", status: "draft", notes: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const reportTypes = ["Financial", "Operational", "Legal", "Other"];
  const periodTypes = ["Weekly", "Monthly", "Quarterly", "Annual"];
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const resetForm = () => { setForm({ title: "", business_id: "", report_type: "Financial", period_type: "Monthly", period_label: "", status: "draft", notes: "" }); setEditingId(null); setShowForm(false); setUploadedFile(null); };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const filePath = `${session.user.id}/reports/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("uploads").upload(filePath, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
      setUploadedFile({ filename: file.name, file_path: filePath, file_url: urlData?.publicUrl || null });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.business_id) return;
    setSaving(true);
    const payload = { title: form.title, business_id: form.business_id, report_type: form.report_type, period_type: form.period_type, period_label: form.period_label || null, status: form.status, notes: form.notes || null, filename: uploadedFile?.filename || null, file_path: uploadedFile?.file_path || null, file_url: uploadedFile?.file_url || null };
    if (editingId) { await onUpdate(editingId, payload); } else { await onAdd(payload); }
    resetForm(); setSaving(false);
  };

  const startEdit = (r) => {
    setForm({ title: r.title || "", business_id: r.business_id || "", report_type: r.report_type || "Financial", period_type: r.period_type || "Monthly", period_label: r.period_label || "", status: r.status || "draft", notes: r.notes || "" });
    setUploadedFile(r.filename ? { filename: r.filename, file_path: r.file_path, file_url: r.file_url } : null);
    setEditingId(r.id); setShowForm(true);
  };

  const toggleStatus = (r) => onUpdate(r.id, { status: r.status === "draft" ? "final" : "draft" });

  const filtered = filterBiz === "all" ? reports : reports.filter((r) => r.business_id === filterBiz);
  const getBizName = (id) => businesses.find((b) => b.id === id)?.name || "—";
  const statusColors = { draft: "#f59e0b", final: "#16a34a" };
  const typeColors = { Financial: "#3b82f6", Operational: "#8b5cf6", Legal: "#dc2626", Other: "#64748b" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <select value={filterBiz} onChange={(e) => setFilterBiz(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", color: "#475569" }}>
          <option value="all">All Businesses</option>
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} New Report</GreenButton>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? "Edit Report" : "New Report"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q1 2026 P&L" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Business *</label><select value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Select...</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{reportTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Period</label><select value={form.period_type} onChange={(e) => setForm({ ...form, period_type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{periodTypes.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Period Label</label><input value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} placeholder="e.g. Q1 2026, March 2026, Week 14" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="draft">Draft</option><option value="final">Final</option></select></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Key findings, summary, action items..." rows={3} style={{ ...inputStyle, resize: "vertical" }} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Attachment</label>
              {uploadedFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {uploadedFile.filename}</span>
                  <button onClick={() => setUploadedFile(null)} style={{ background: "none", border: "none", fontSize: 11, color: "#dc2626", cursor: "pointer", fontWeight: 600 }}>Remove</button>
                </div>
              ) : (
                <label style={{ display: "block", padding: "12px", borderRadius: 8, border: "1.5px dashed #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 600, color: uploading ? "#94a3b8" : "#64748b", cursor: uploading ? "not-allowed" : "pointer", textAlign: "center" }}>
                  {uploading ? "Uploading..." : "📎 Upload file (PDF, Excel, Image, etc.)"}
                  <input type="file" accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.doc,.docx" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.business_id}>{saving ? "..." : editingId ? "Update" : "Save Report"}</GreenButton>
          </div>
        </div>
      )}

      {filtered.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Reports</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Create reports to track business performance across periods.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{r.title}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${typeColors[r.report_type] || "#64748b"}15`, color: typeColors[r.report_type] || "#64748b" }}>{r.report_type?.toUpperCase()}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${statusColors[r.status]}15`, color: statusColors[r.status] }}>{r.status?.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>{getBizName(r.business_id)}</span>
                    <span>· {r.period_type}{r.period_label ? ` — ${r.period_label}` : ""}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace" }}>· {fmtDate(r.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                  <button onClick={() => toggleStatus(r)} title={r.status === "draft" ? "Mark Final" : "Back to Draft"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2 }}>{r.status === "final" ? "✅" : "📝"}</button>
                  <button onClick={() => startEdit(r)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.edit}</button>
                  <button onClick={() => { if (window.confirm("Delete?")) onDelete(r.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                </div>
              </div>
              {r.notes && <p style={{ fontSize: 12, color: "#475569", margin: "6px 0 0", lineHeight: 1.5 }}>{r.notes}</p>}
              {r.filename && (
                <div style={{ marginTop: 6 }}>
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#3b82f6", textDecoration: "none", padding: "4px 10px", borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe" }}>📎 {r.filename} ↗</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
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
  const categories = ["Rent/Mortgage", "Electric", "Water", "Gas", "Internet", "Phone", "Sewer/Trash", "Lawn/Pest", "HOA", "Insurance", "Subscriptions", "Memberships", "Education", "Childcare", "Food & Groceries", "Gas & Fuel", "Transportation", "Storage", "Donations", "Loan Payment", "Alimony/Support", "Other"];

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
        <StatCard label="Monthly Total" value={fmtCurrency(totalMonthly)} accent="#dc2626" compact />
        <StatCard label="Active Bills" value={activeBills.length} accent="#3b82f6" compact />
        <StatCard label="Categories" value={Object.keys(byCategory).length} accent="#7c3aed" compact />
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
  const tab = activeTab || "calendar";
  const setTab = onTabChange;
  const tabs = [
    { key: "calendar", label: "Calendar" },
    { key: "planner", label: "Planner" },
  ];

  const content = (
    <>
      <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={isMobile} />
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

function FamilyView({ isMobile, activeTab, onTabChange, kids, grades, milestones, prayers, onAddKid, onUpdateKid, onDeleteKid, onAddGrade, onDeleteGrade, onAddMilestone, onUpdateMilestone, onDeleteMilestone, onAddPrayer, onUpdatePrayer, onDeletePrayer, habits, habitLogs, onAddHabit, onDeleteHabit, onAddHabitLog, onDeleteHabitLog, learningItems, onAddLearning, onUpdateLearning, onDeleteLearning, nested }) {
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  if (selectedMemberId) {
    const member = kids.find((k) => k.id === selectedMemberId);
    if (!member) { setSelectedMemberId(null); return null; }
    return <FamilyMemberDetailView isMobile={isMobile} member={member} grades={grades} habits={habits || []} habitLogs={habitLogs || []} prayers={prayers || []} learningItems={learningItems || []} onBack={() => setSelectedMemberId(null)} onUpdate={onUpdateKid} onDelete={onDeleteKid} onAddGrade={onAddGrade} onDeleteGrade={onDeleteGrade} onAddHabit={onAddHabit} onDeleteHabit={onDeleteHabit} onAddHabitLog={onAddHabitLog} onDeleteHabitLog={onDeleteHabitLog} onAddPrayer={onAddPrayer} onUpdatePrayer={onUpdatePrayer} onDeletePrayer={onDeletePrayer} onAddLearning={onAddLearning} onUpdateLearning={onUpdateLearning} onDeleteLearning={onDeleteLearning} />;
  }

  const content = (
    <FamilyMembersTab isMobile={isMobile} kids={kids} onAdd={onAddKid} onUpdate={onUpdateKid} onDelete={onDeleteKid} onSelect={(id) => setSelectedMemberId(id)} />
  );

  if (nested) return content;

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Family" subtitle="Members, milestones & prayer wall" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>{content}</div>
    </div>
  );
}

/* — Family Member Detail View — */
function FamilyMemberDetailView({ isMobile, member, grades, habits, habitLogs, prayers, learningItems, onBack, onUpdate, onDelete, onAddGrade, onDeleteGrade, onAddHabit, onDeleteHabit, onAddHabitLog, onDeleteHabitLog, onAddPrayer, onUpdatePrayer, onDeletePrayer, onAddLearning, onUpdateLearning, onDeleteLearning }) {
  const [activeTab, setActiveTab] = useState("grades");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: member.name, role: member.role || "Child", date_of_birth: member.date_of_birth || "", school: member.school || "", grade_level: member.grade_level || "", notes: member.notes || "" });
  const memberGrades = grades.filter((g) => g.kid_id === member.id);
  const getAge = (dob) => { if (!dob) return null; const d = new Date(dob); const now = new Date(); let age = now.getFullYear() - d.getFullYear(); if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--; return age; };
  const age = getAge(member.date_of_birth);
  const roles = ["Parent", "Child", "Spouse", "Grandparent", "Other"];
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const handleSave = async () => {
    await onUpdate(member.id, { name: form.name, role: form.role, date_of_birth: form.date_of_birth || null, school: form.school || null, grade_level: form.grade_level || null, notes: form.notes || null });
    setEditing(false);
  };

  const tabs = [
    { key: "grades", label: "📝 Grades" },
    { key: "habits", label: "⚡ Habits" },
    { key: "prayers", label: "✝️ Prayers" },
    { key: "learning", label: "📚 Learning" },
  ];

  const pills = [member.role || "Child"];
  if (age != null) pills.push(`Age ${age}`);
  if (member.school) pills.push(member.school);
  if (member.grade_level) pills.push(member.grade_level);

  return (
    <>
      <PageHeader isMobile={isMobile} title={member.name} subtitle={member.notes || `${member.role || "Family Member"}`} icon={member.name?.[0]?.toUpperCase()} onBack={onBack} pills={pills} stats={[
        { label: "GRADES", value: memberGrades.length },
        { label: "HABITS", value: habits.length },
        { label: "PRAYERS", value: prayers.length },
      ]}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEditing(!editing)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "#D4C08C", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{editing ? "✕ Cancel" : "✏️ Edit"}</button>
          <button onClick={() => { if (window.confirm("Remove " + member.name + "?")) { onDelete(member.id); onBack(); } }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "#fca5a5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑</button>
        </div>
      </PageHeader>
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {editing && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
            <SectionHeader text="Edit Member" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>School</label><input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="School name" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Grade Level</label><input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="e.g. 5th Grade" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><GreenButton small onClick={handleSave} disabled={!form.name.trim()}>Save</GreenButton></div>
          </div>
        )}
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} isMobile={isMobile} />
        {activeTab === "grades" && <GradesTab isMobile={isMobile} kids={[member]} grades={memberGrades} onAdd={onAddGrade} onDelete={onDeleteGrade} singleKid />}
        {activeTab === "habits" && <HabitsTab isMobile={isMobile} habits={habits} habitLogs={habitLogs} onAddHabit={onAddHabit} onDeleteHabit={onDeleteHabit} onAddLog={onAddHabitLog} onDeleteLog={onDeleteHabitLog} />}
        {activeTab === "prayers" && <PrayerWallTab isMobile={isMobile} prayers={prayers} onAdd={onAddPrayer} onUpdate={onUpdatePrayer} onDelete={onDeletePrayer} />}
        {activeTab === "learning" && <LearningTab isMobile={isMobile} items={learningItems || []} onAdd={onAddLearning} onUpdate={onUpdateLearning} onDelete={onDeleteLearning} />}
      </div>
    </>
  );
}

/* — Family Members Tab (replaces old Kids-only tab) — */
function FamilyMembersTab({ isMobile, kids, onAdd, onUpdate, onDelete, onSelect }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date_of_birth: "", school: "", grade_level: "", notes: "", role: "Child" });
  const [saving, setSaving] = useState(false);

  const roles = ["Parent", "Child", "Spouse", "Grandparent", "Other"];
  const resetForm = () => { setForm({ name: "", date_of_birth: "", school: "", grade_level: "", notes: "", role: "Child" }); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onAdd({ name: form.name, role: form.role, date_of_birth: form.date_of_birth || null, school: form.school || null, grade_level: form.grade_level || null, notes: form.notes || null });
    resetForm(); setSaving(false);
  };

  const getAge = (dob) => { if (!dob) return null; const d = new Date(dob); const now = new Date(); let age = now.getFullYear() - d.getFullYear(); if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--; return age; };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const roleColors = { Parent: "#16a34a", Spouse: "#16a34a", Child: "#3b82f6", Grandparent: "#7c3aed", Other: "#f59e0b" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{kids.length} member{kids.length !== 1 ? "s" : ""}</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Member</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text="New Family Member" />
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
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : "Add Member"}</GreenButton>
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
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Name</th>
              <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Role</th>
              {!isMobile && <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Age</th>}
              {!isMobile && <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>School</th>}
              {!isMobile && <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Grade</th>}
            </tr></thead>
            <tbody>{[...kids].sort((a, b) => {
              const order = { Parent: 0, Spouse: 1, Child: 2, Grandparent: 3, Other: 4 };
              const ra = order[a.role] ?? 4, rb = order[b.role] ?? 4;
              if (ra !== rb) return ra - rb;
              // Within same role, sort by DOB ascending (oldest first)
              if (a.date_of_birth && b.date_of_birth) return new Date(a.date_of_birth) - new Date(b.date_of_birth);
              if (a.date_of_birth) return -1;
              if (b.date_of_birth) return 1;
              return 0;
            }).map((kid) => {
              const age = getAge(kid.date_of_birth);
              const rc = roleColors[kid.role] || "#f59e0b";
              return (
                <tr key={kid.id} onClick={() => onSelect && onSelect(kid.id)} style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: rc, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{kid.name.charAt(0).toUpperCase()}</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{kid.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${rc}15`, color: rc, textTransform: "uppercase", letterSpacing: "0.05em" }}>{kid.role || "Child"}</span></td>
                  {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b" }}>{age != null ? age : "—"}</td>}
                  {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b" }}>{kid.school || "—"}</td>}
                  {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b" }}>{kid.grade_level || "—"}</td>}
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
/* — Grades Tab — */
function GradesTab({ isMobile, kids, grades, onAdd, onDelete, singleKid }) {
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
        {!singleKid && kids.map((k) => (
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
function LifeEventsTab({ isMobile, kids, milestones, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", date: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [orderedIds, setOrderedIds] = useState(null);

  // Maintain local order — initialize from milestones sorted by date
  const sorted = orderedIds ? orderedIds.map((id) => milestones.find((m) => m.id === id)).filter(Boolean) : [...milestones].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const resetForm = () => { setForm({ title: "", date: "", description: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editingId) {
      await onUpdate(editingId, { title: form.title, date: form.date || null, description: form.description || null });
    } else {
      await onAdd({ title: form.title, date: form.date || null, description: form.description || null });
      setOrderedIds(null);
    }
    resetForm(); setSaving(false);
  };

  const startEdit = (m) => {
    setForm({ title: m.title || "", date: m.date || "", description: m.description || "" });
    setEditingId(m.id);
    setShowForm(true);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const ids = sorted.map((m) => m.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    setOrderedIds(ids);
  };
  const moveDown = (idx) => {
    if (idx >= sorted.length - 1) return;
    const ids = sorted.map((m) => m.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    setOrderedIds(ids);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{sorted.length} move{sorted.length !== 1 ? "s" : ""} planned</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Move</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Move *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Close on investment property" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Target Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Details</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Strategy, dependencies, notes..." style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? "..." : editingId ? "Update" : "Add"}</GreenButton></div>
        </div>
      )}
      {sorted.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>♟️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>Plan Your Moves</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Add sequential moves and arrange them in the order you need to execute.</p>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 13, top: 20, bottom: 20, width: 2, background: "linear-gradient(180deg, #1C3820, #16a34a, #bbf7d0)" }} />
          {sorted.map((m, idx) => (
            <div key={m.id} style={{ position: "relative", marginBottom: 12 }}>
              {/* Step number circle */}
              <div style={{ position: "absolute", left: -28, top: 14, width: 28, height: 28, borderRadius: "50%", background: "#1C3820", color: "#D4C08C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "'Playfair Display', serif", zIndex: 1, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>{idx + 1}</div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 16px 14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{m.title}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "#64748b" }}>
                    {m.date && <span style={{ fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 4, background: "#f1f5f9" }}>{fmtDate(m.date)}</span>}
                  </div>
                  {m.description && <p style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.4, margin: "4px 0 0" }}>{m.description}</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 14, color: idx === 0 ? "#e2e8f0" : "#64748b", padding: "2px 4px", lineHeight: 1 }}>▲</button>
                  <button onClick={() => moveDown(idx)} disabled={idx >= sorted.length - 1} style={{ background: "none", border: "none", cursor: idx >= sorted.length - 1 ? "default" : "pointer", fontSize: 14, color: idx >= sorted.length - 1 ? "#e2e8f0" : "#64748b", padding: "2px 4px", lineHeight: 1 }}>▼</button>
                </div>
                <button onClick={() => startEdit(m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>{Icons.edit}</button>
                <button onClick={() => { if (window.confirm("Delete this move?")) { onDelete(m.id); setOrderedIds(null); } }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>{Icons.trash}</button>
              </div>
            </div>
          ))}
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
          <TabBar tabs={[{ key: "scorecard", label: "⭐ Scorecard" }, { key: "dosing", label: "💉 Dosing" }, { key: "body", label: "🏋️ Body" }, { key: "checkin", label: "📋 Check-in" }, { key: "supplements", label: "💊 Supplements" }, { key: "meals", label: "🍽️ Meals" }, { key: "bloodwork", label: "🩸 Blood Work" }]} active={tab} onChange={setTab} isMobile={isMobile} />
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

function FinDashboardTab({ isMobile, transactions, accounts, assets, investments, monthlyBills, policies, snapshots }) {
  const curYear = new Date().getFullYear().toString();
  const ytdTxns = transactions.filter((t) => t.date && t.date.startsWith(curYear));
  const ytdIncome = ytdTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const ytdExpenses = ytdTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const totalBills = (monthlyBills || []).filter((b) => b.active !== false).reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalAssets = (assets || []).reduce((s, a) => s + Number(a.estimated_value || 0), 0);
  const portfolioValue = (investments || []).reduce((s, i) => {
    if (i.asset_type === "Real Estate") return s + Number(i.current_value || i.current_price || 0);
    return s + Number(i.current_value || i.current_price || i.amount_invested || 0);
  }, 0);
  const activeAccounts = (accounts || []).filter((a) => a.active !== false);
  const uncategorized = transactions.filter((t) => !t.category || t.category === "Uncategorized").length;
  const activePolicies = (policies || []).filter((p) => p.status === "Active" || p.status === "active").length;

  // Net Worth calculation
  const cashOnHand = activeAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const accountDebt = activeAccounts.filter((a) => Number(a.balance || 0) < 0 || a.account_type === "credit" || a.account_type === "loan").reduce((s, a) => s + Math.abs(Number(a.balance || 0)), 0);
  const reLoanDebt = (investments || []).filter((i) => i.asset_type === "Real Estate").reduce((s, i) => s + Number(i.loan_balance || 0), 0);
  const totalDebt = accountDebt + reLoanDebt;
  const totalEquity = totalAssets + portfolioValue + Math.max(cashOnHand, 0);
  const netWorth = totalEquity - totalDebt;

  const cards = [
    { label: "YTD Income", value: fmtCurrency(ytdIncome), accent: "#16a34a" },
    { label: "YTD Expenses", value: fmtCurrency(ytdExpenses), accent: "#dc2626" },
    { label: "YTD Net Flow", value: fmtCurrency(ytdIncome - ytdExpenses), accent: ytdIncome - ytdExpenses >= 0 ? "#3b82f6" : "#f59e0b" },
    { label: "Monthly Bills", value: fmtCurrency(totalBills), accent: "#7c3aed" },
    { label: "Total Assets", value: fmtCurrency(totalAssets), accent: "#0891b2" },
    { label: "Portfolio", value: fmtCurrency(portfolioValue), accent: "#059669" },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value} accent={c.accent} compact />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
          <SectionHeader text="Quick Stats" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Active Accounts", value: activeAccounts.length, emoji: "🏦" },
              { label: `Transactions YTD ${curYear}`, value: ytdTxns.length, emoji: "📒" },
              { label: "Uncategorized", value: uncategorized, emoji: uncategorized > 0 ? "⚠️" : "✅" },
              { label: "Active Insurance Policies", value: activePolicies, emoji: "🛡️" },
              { label: "Real Estate Holdings", value: (investments || []).filter((i) => i.asset_type === "Real Estate").length, emoji: "🏠" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ color: "#475569" }}>{s.emoji} {s.label}</span>
                <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
          <SectionHeader text={`Top Expenses YTD ${curYear}`} />
          {(() => {
            const expByCategory = {};
            ytdTxns.filter((t) => t.type === "expense").forEach((t) => { const c = t.category || "Uncategorized"; expByCategory[c] = (expByCategory[c] || 0) + Number(t.amount); });
            const sorted = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
            return sorted.length === 0 ? <p style={{ fontSize: 13, color: "#94a3b8" }}>No expenses this year</p> : sorted.map(([cat, amt]) => {
              const pct = ytdExpenses > 0 ? Math.round((amt / ytdExpenses) * 100) : 0;
              return (<div key={cat} style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: 600 }}>{cat}</span><span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(amt)} ({pct}%)</span></div><div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(135deg, #dc2626, #b91c1c)", borderRadius: 3 }} /></div></div>);
            });
          })()}
        </div>
      </div>

      {/* Net Worth Summary */}
      <div style={{ background: "linear-gradient(135deg, #1C3820 0%, #0f1f12 100%)", borderRadius: 14, padding: isMobile ? "20px 22px" : "24px 28px", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,192,140,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: "#D4C08C", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Net Worth</div>
              <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, fontFamily: "'Playfair Display', serif", color: netWorth >= 0 ? "#fff" : "#fca5a5" }}>{fmtCurrency(netWorth)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 8 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(212,192,140,0.7)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Cash</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(Math.max(cashOnHand, 0))}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(212,192,140,0.7)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Assets</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(totalAssets)}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(212,192,140,0.7)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>RE Value</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(portfolioValue)}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(252,165,165,0.8)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>RE Loans</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fca5a5", marginTop: 2, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(reLoanDebt)}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(252,165,165,0.8)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Other Debt</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fca5a5", marginTop: 2, fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(accountDebt)}</div>
            </div>
          </div>
          {snapshots && snapshots.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 10, color: "rgba(212,192,140,0.6)", textAlign: "right" }}>{snapshots.length} historical snapshot{snapshots.length !== 1 ? "s" : ""}</div>
          )}
        </div>
      </div>
    </>
  );
}

function FinanceView(props) {
  const { isMobile, activeTab, onTabChange } = props;
  const tab = activeTab || "dashboard";
  const [dashSubView, setDashSubView] = useState("dashboard");
  const [bkSubView, setBkSubView] = useState("ledger");
  const tabs = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "bookkeeping", label: "📒 Bookkeeping" },
    { key: "stocks", label: "📈 Stocks" },
    { key: "realestate", label: "🏠 Real Estate" },
    { key: "assets", label: "🚗 Vehicles" },
    { key: "insurance", label: "🛡️ Insurance" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Finance" subtitle="Money, wealth & insurance" isMobile={isMobile} icon="💰" />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={tab} onChange={onTabChange} isMobile={isMobile} />
        {tab === "dashboard" && <FinDashboardTab isMobile={isMobile} transactions={props.transactions} accounts={props.accounts} assets={props.assets} investments={props.investments} monthlyBills={props.monthlyBills} policies={props.policies} snapshots={props.snapshots} onAddSnapshot={props.onAddSnapshot} onDeleteSnapshot={props.onDeleteSnapshot} />}
        {tab === "bookkeeping" && <BookkeepingTab isMobile={isMobile} transactions={props.transactions} accounts={props.accounts} assets={props.assets} uploads={props.uploads} onAdd={props.onAddTransaction} onUpdate={props.onUpdateTransaction} onDelete={props.onDeleteTransaction} onUpload={props.onUpload} onDeleteUpload={props.onDeleteUpload} onLogUpload={props.onLogUpload} bills={props.monthlyBills} onAddBill={props.onAddMonthlyBill} onUpdateBill={props.onUpdateMonthlyBill} onDeleteBill={props.onDeleteMonthlyBill} onAddAccount={props.onAddAccount} onToggleAccount={props.onToggleAccount} onDeleteAccount={props.onDeleteAccount} businesses={props.businesses} funnelPresets={props.funnelPresets} funnelInflows={props.funnelInflows} onAddFunnelPreset={props.onAddFunnelPreset} onUpdateFunnelPreset={props.onUpdateFunnelPreset} onDeleteFunnelPreset={props.onDeleteFunnelPreset} onAddFunnelInflow={props.onAddFunnelInflow} onUpdateFunnelInflow={props.onUpdateFunnelInflow} onDeleteFunnelInflow={props.onDeleteFunnelInflow} />}
        {tab === "stocks" && <PortfolioTab isMobile={isMobile} investments={(props.investments || []).filter((i) => !["Real Estate", "Business Equity"].includes(i.asset_type))} onAdd={props.onAddInvestment} onUpdate={props.onUpdateInvestment} onDelete={props.onDeleteInvestment} />}
        {tab === "realestate" && <RealEstateTab isMobile={isMobile} investments={props.investments?.filter((i) => i.asset_type === "Real Estate") || []} onAdd={props.onAddInvestment} onUpdate={props.onUpdateInvestment} onDelete={props.onDeleteInvestment} />}
        {tab === "assets" && <AssetsTab isMobile={isMobile} assets={props.assets} accounts={props.accounts} onAdd={props.onAddAsset} onUpdate={props.onUpdateAsset} onDelete={props.onDeleteAsset} />}
        {tab === "insurance" && <InsuranceContentTab isMobile={isMobile} policies={props.policies} onAdd={props.onAddPolicy} onUpdate={props.onUpdatePolicy} onDelete={props.onDeletePolicy} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MONEY FUNNEL — Income allocation tracker
   ═══════════════════════════════════════════════════════════ */

function FunnelTab({ isMobile, businesses, presets, inflows, onAddPreset, onUpdatePreset, onDeletePreset, onAddInflow, onUpdateInflow, onDeleteInflow }) {
  const [showInflow, setShowInflow] = useState(false);
  const [showPreset, setShowPreset] = useState(false);
  const [editingInflowId, setEditingInflowId] = useState(null);
  const [inflowForm, setInflowForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], source: "", business_id: "", status: "received", notes: "" });
  const [presetForm, setPresetForm] = useState({ name: "", percentage: "", category: "" });
  const [filterScope, setFilterScope] = useState("all");
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const activePresets = presets.filter((p) => p.active !== false);
  const totalAllocated = activePresets.reduce((s, p) => s + Number(p.percentage || 0), 0);
  const unallocatedPct = Math.max(0, 100 - totalAllocated);

  const filtered = filterScope === "all" ? inflows : filterScope === "personal" ? inflows.filter((i) => !i.business_id) : inflows.filter((i) => i.business_id === filterScope);
  const totalReceived = filtered.filter((i) => i.status === "received").reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalUpcoming = filtered.filter((i) => i.status === "upcoming").reduce((s, i) => s + Number(i.amount || 0), 0);

  const presetColors = ["#1C3820", "#16a34a", "#3b82f6", "#8b5cf6", "#f59e0b", "#dc2626", "#0891b2", "#ec4899"];

  const resetInflow = () => { setInflowForm({ amount: "", date: new Date().toISOString().split("T")[0], source: "", business_id: "", status: "received", notes: "" }); setEditingInflowId(null); setShowInflow(false); };
  const resetPreset = () => { setPresetForm({ name: "", percentage: "", category: "" }); setShowPreset(false); };

  const handleAddInflow = async () => {
    if (!inflowForm.amount || Number(inflowForm.amount) <= 0) return;
    const payload = { amount: Number(inflowForm.amount), date: inflowForm.date || null, source: inflowForm.source || null, business_id: inflowForm.business_id || null, status: inflowForm.status, notes: inflowForm.notes || null };
    if (editingInflowId) await onUpdateInflow(editingInflowId, payload);
    else await onAddInflow(payload);
    resetInflow();
  };

  const handleAddPreset = async () => {
    if (!presetForm.name.trim() || !presetForm.percentage) return;
    await onAddPreset({ name: presetForm.name, percentage: Number(presetForm.percentage), category: presetForm.category || null, active: true });
    resetPreset();
  };

  const startEditInflow = (i) => {
    setInflowForm({ amount: i.amount || "", date: i.date || new Date().toISOString().split("T")[0], source: i.source || "", business_id: i.business_id || "", status: i.status || "received", notes: i.notes || "" });
    setEditingInflowId(i.id);
    setShowInflow(true);
  };

  const getBizName = (id) => businesses.find((b) => b.id === id)?.name || "Personal";

  return (
    <>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <StatCard label="Received" value={fmtCurrency(totalReceived)} accent="#16a34a" compact />
        <StatCard label="Upcoming" value={fmtCurrency(totalUpcoming)} accent="#f59e0b" compact />
        <StatCard label="Allocated %" value={`${totalAllocated}%`} accent={totalAllocated > 100 ? "#dc2626" : "#3b82f6"} compact />
      </div>

      {/* Allocation Presets */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SectionHeader text="Allocation Rules" />
          <button onClick={() => setShowPreset(!showPreset)} style={{ background: "none", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 10px", color: "#16a34a", fontSize: 11, fontWeight: 700, cursor: "pointer", marginLeft: 8 }}>+ Rule</button>
        </div>
        {showPreset && (
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 12px", marginBottom: 10, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 2fr auto", gap: 8, alignItems: "end" }}>
            <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>Name *</label><input value={presetForm.name} onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })} placeholder="e.g. Tithe" style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>%</label><input type="number" value={presetForm.percentage} onChange={(e) => setPresetForm({ ...presetForm, percentage: e.target.value })} placeholder="10" style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>Category</label><input value={presetForm.category} onChange={(e) => setPresetForm({ ...presetForm, category: e.target.value })} placeholder="e.g. Giving, Savings" style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} className="sz-input" /></div>
            <GreenButton small onClick={handleAddPreset} disabled={!presetForm.name.trim() || !presetForm.percentage}>Add</GreenButton>
          </div>
        )}
        {presets.length === 0 ? (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, textAlign: "center", padding: "12px 0" }}>No allocation rules yet. Add rules like "10% Tithe" or "10% Savings".</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {presets.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: presetColors[i % presetColors.length] }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{p.name}{p.category && <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}> · {p.category}</span>}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1C3820", fontFamily: "'DM Mono', monospace" }}>{p.percentage}%</div>
                <button onClick={() => onDeletePreset(p.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: unallocatedPct > 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 8, border: `1px dashed ${unallocatedPct > 0 ? "#bbf7d0" : "#fecaca"}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: unallocatedPct >= 0 ? "#94a3b8" : "#dc2626" }} />
              <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#475569" }}>{unallocatedPct >= 0 ? "Unallocated / Spending" : "OVER-ALLOCATED"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: unallocatedPct >= 0 ? "#16a34a" : "#dc2626", fontFamily: "'DM Mono', monospace" }}>{unallocatedPct}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Inflows */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", color: "#475569" }}>
          <option value="all">All Sources</option>
          <option value="personal">Personal Only</option>
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <GreenButton small onClick={() => { resetInflow(); setShowInflow(!showInflow); }}>{Icons.plus} Log Income</GreenButton>
      </div>

      {showInflow && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Amount *</label><input type="number" value={inflowForm.amount} onChange={(e) => setInflowForm({ ...inflowForm, amount: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={inflowForm.date} onChange={(e) => setInflowForm({ ...inflowForm, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={inflowForm.status} onChange={(e) => setInflowForm({ ...inflowForm, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="received">Received</option><option value="upcoming">Upcoming</option></select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Source</label><input value={inflowForm.source} onChange={(e) => setInflowForm({ ...inflowForm, source: e.target.value })} placeholder="e.g. Client payment" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Business</label><select value={inflowForm.business_id} onChange={(e) => setInflowForm({ ...inflowForm, business_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Personal</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={inflowForm.notes} onChange={(e) => setInflowForm({ ...inflowForm, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetInflow} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleAddInflow} disabled={!inflowForm.amount || Number(inflowForm.amount) <= 0}>{editingInflowId ? "Update" : "Log"}</GreenButton></div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>💧</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Income Logged</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Log incoming money and watch it auto-allocate based on your rules.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((i) => {
            const amt = Number(i.amount);
            return (
              <div key={i.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${i.status === "upcoming" ? "#fde68a" : "#e2e8f0"}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#16a34a", fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(amt)}</span>
                      {i.status === "upcoming" && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#fef3c7", color: "#92400e" }}>UPCOMING</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, fontSize: 11, color: "#64748b", flexWrap: "wrap" }}>
                      {i.source && <span style={{ fontWeight: 600, color: "#0f172a" }}>{i.source}</span>}
                      <span>· {getBizName(i.business_id)}</span>
                      {i.date && <span style={{ fontFamily: "'DM Mono', monospace" }}>· {fmtDate(i.date)}</span>}
                    </div>
                    {i.notes && <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0", lineHeight: 1.4 }}>{i.notes}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEditInflow(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.edit}</button>
                    <button onClick={() => { if (window.confirm("Delete?")) onDeleteInflow(i.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                  </div>
                </div>
                {/* Allocation breakdown */}
                {activePresets.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #f1f5f9" }}>
                    <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8, background: "#f1f5f9" }}>
                      {activePresets.map((p, idx) => (
                        <div key={p.id} style={{ width: `${p.percentage}%`, background: presetColors[idx % presetColors.length] }} />
                      ))}
                      {unallocatedPct > 0 && <div style={{ width: `${unallocatedPct}%`, background: "#cbd5e1" }} />}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 6 }}>
                      {activePresets.map((p, idx) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: presetColors[idx % presetColors.length], flexShrink: 0 }} />
                          <span style={{ color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(amt * (p.percentage / 100))}</span>
                        </div>
                      ))}
                      {unallocatedPct > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#cbd5e1", flexShrink: 0 }} />
                          <span style={{ color: "#64748b", flex: 1 }}>Unallocated</span>
                          <span style={{ fontWeight: 700, color: "#16a34a", fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(amt * (unallocatedPct / 100))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LIFE (Tabbed: Home, Family, Health)
   ═══════════════════════════════════════════════════════════ */

function LifeConsolidatedView(props) {
  const { isMobile, activeTab, onTabChange } = props;
  const tab = activeTab || "chess";
  const [familyTab, setFamilyTab] = useState(null);
  const [healthTab, setHealthTab] = useState(null);
  const tabs = [
    { key: "chess", label: "♟️ Chess" },
    { key: "family", label: "👨‍👩‍👧‍👦 Family" },
    { key: "health", label: "💪 Health" },
    { key: "calendar", label: "📅 Calendar" },
    { key: "links", label: "🔗 Links" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Life" subtitle="Family, health, planning & growth" isMobile={isMobile} icon="🌳" />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={tab} onChange={onTabChange} isMobile={isMobile} />
        {tab === "chess" && <LifeEventsTab isMobile={isMobile} kids={props.kids || []} milestones={props.milestones || []} onAdd={props.onAddMilestone} onUpdate={props.onUpdateMilestone} onDelete={props.onDeleteMilestone} />}
        {tab === "family" && <FamilyView {...props} activeTab={familyTab} onTabChange={setFamilyTab} nested />}
        {tab === "health" && <HealthView {...props} activeTab={healthTab} onTabChange={setHealthTab} nested />}
        {tab === "calendar" && <CalendarView isMobile={isMobile} events={props.calendarEvents} onAdd={props.onAddEvent} onDelete={props.onDeleteEvent} asTab />}
        {tab === "links" && <LinksTab isMobile={isMobile} links={props.savedLinks || []} onAdd={props.onAddLink} onDelete={props.onDeleteLink} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LINKS TAB (saved reference links)
   ═══════════════════════════════════════════════════════════ */

function LinksTab({ isMobile, links, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", category: "General", notes: "" });
  const [saving, setSaving] = useState(false);

  const categories = ["General", "Business", "Finance", "Real Estate", "Legal", "Health", "Education", "Tools", "Other"];
  const resetForm = () => { setForm({ title: "", url: "", category: "General", notes: "" }); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    let url = form.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    await onAdd({ title: form.title, url, category: form.category, notes: form.notes || null });
    resetForm();
    setSaving(false);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const catColors = { General: "#64748b", Business: "#8b5cf6", Finance: "#16a34a", "Real Estate": "#ea580c", Legal: "#dc2626", Health: "#ec4899", Education: "#3b82f6", Tools: "#0891b2", Other: "#78716c" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{links.length} link{links.length !== 1 ? "s" : ""} saved</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Link</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Supabase Dashboard" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>URL *</label><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="e.g. supabase.com/dashboard" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.url.trim()}>{saving ? "..." : "Save"}</GreenButton>
          </div>
        </div>
      )}
      {links.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Links Saved</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Save important reference links you want quick access to.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((link) => (
            <div key={link.id} onClick={() => window.open(link.url, "_blank")} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.background = "#f0fdf4"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fff"; }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🔗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{link.title}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{link.url}</div>
                {link.notes && <p style={{ fontSize: 11, color: "#64748b", marginTop: 3, margin: "3px 0 0" }}>{link.notes}</p>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${catColors[link.category] || "#64748b"}15`, color: catColors[link.category] || "#64748b", flexShrink: 0, letterSpacing: "0.03em" }}>{link.category?.toUpperCase()}</span>
              <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete this link?")) onDelete(link.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>{Icons.trash}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   GOALS TAB
   ═══════════════════════════════════════════════════════════ */

function GoalsTab({ isMobile, goals, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", target_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const resetForm = () => { setForm({ title: "", target_date: "", notes: "" }); setShowForm(false); };
  const handleSubmit = async () => { if (!form.title.trim()) return; setSaving(true); await onAdd({ title: form.title, target_date: form.target_date || null, notes: form.notes || null, status: "active" }); resetForm(); setSaving(false); };
  const toggleStatus = (goal) => onUpdate(goal.id, { status: goal.status === "active" ? "done" : "active" });
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "done");
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{active.length} active · {done.length} completed</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Goal</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Goal *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Close 3 deals this quarter" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Target Date</label><input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? "..." : "Save"}</GreenButton>
          </div>
        </div>
      )}
      {goals.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Goals Yet</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Set goals and track them to completion.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...active, ...done].map((goal) => { const isDone = goal.status === "done"; return (
            <div key={goal.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${isDone ? "#bbf7d0" : "#e2e8f0"}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, opacity: isDone ? 0.7 : 1 }}>
              <button onClick={() => toggleStatus(goal)} style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${isDone ? "#16a34a" : "#cbd5e1"}`, background: isDone ? "#f0fdf4" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>{isDone && Icons.check}</button>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textDecoration: isDone ? "line-through" : "none" }}>{goal.title}</div><div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 11, color: "#64748b" }}>{goal.target_date && <span style={{ fontFamily: "'DM Mono', monospace" }}>Due {fmtDate(goal.target_date)}</span>}{goal.notes && <span>· {goal.notes}</span>}</div></div>
              <button onClick={() => { if (window.confirm("Delete?")) onDelete(goal.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
            </div>); })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   HABITS TAB
   ═══════════════════════════════════════════════════════════ */

function HabitsTab({ isMobile, habits, habitLogs, onAddHabit, onDeleteHabit, onAddLog, onDeleteLog }) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", frequency: "Daily", impact: "High" });
  const [saving, setSaving] = useState(false);
  const resetForm = () => { setForm({ name: "", frequency: "Daily", impact: "High" }); setShowForm(false); };
  const handleAddHabit = async () => { if (!form.name.trim()) return; setSaving(true); await onAddHabit({ name: form.name, frequency: form.frequency, impact: form.impact, active: true }); resetForm(); setSaving(false); };
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const impactColors = { High: "#dc2626", Medium: "#f59e0b", Low: "#22c55e" };
  const dayLogs = habitLogs.filter((l) => l.date === selectedDate);
  const activeHabits = habits.filter((h) => h.active !== false);
  const getLog = (habitId) => dayLogs.find((l) => l.habit_id === habitId);
  const handleGrade = async (habitId, grade) => { const existing = getLog(habitId); if (existing) await onDeleteLog(existing.id); await onAddLog({ habit_id: habitId, date: selectedDate, grade }); };
  const avgGrade = dayLogs.length > 0 ? (dayLogs.reduce((s, l) => s + (l.grade || 0), 0) / dayLogs.length).toFixed(1) : "—";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontFamily: "'DM Mono', monospace", outline: "none" }} />
          <span style={{ fontSize: 13, color: "#64748b" }}>Avg: <strong style={{ color: "#0f172a" }}>{avgGrade}/10</strong></span>
        </div>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Habit</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Habit Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning workout" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Frequency</label><select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="Daily">Daily</option><option value="Weekly">Weekly</option></select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Impact Level</label><select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleAddHabit} disabled={saving || !form.name.trim()}>{saving ? "..." : "Save"}</GreenButton>
          </div>
        </div>
      )}
      {activeHabits.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Habits Yet</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Add habits you want to track and grade yourself daily.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activeHabits.map((habit) => { const log = getLog(habit.id); const graded = !!log; return (
            <div key={habit.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${graded ? "#bbf7d0" : "#e2e8f0"}`, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: graded ? 0 : 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{habit.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${impactColors[habit.impact] || "#64748b"}15`, color: impactColors[habit.impact] || "#64748b" }}>{habit.impact?.toUpperCase()}</span>
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>{habit.frequency}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {graded && <span style={{ fontSize: 16, fontWeight: 700, color: "#16a34a", fontFamily: "'Playfair Display', serif" }}>{log.grade}/10</span>}
                  <button onClick={() => { if (window.confirm("Delete habit?")) onDeleteHabit(habit.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                </div>
              </div>
              {!graded && (<div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{[1,2,3,4,5,6,7,8,9,10].map((n) => (<button key={n} onClick={() => handleGrade(habit.id, n)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: n >= 8 ? "#f0fdf4" : n >= 5 ? "#fffbeb" : "#fef2f2", color: n >= 8 ? "#16a34a" : n >= 5 ? "#f59e0b" : "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{n}</button>))}</div>)}
            </div>); })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LEARNING TAB
   ═══════════════════════════════════════════════════════════ */

function LearningTab({ isMobile, items, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", author: "", type: "Course", status: "queued", progress: 0, notes: "" });
  const [saving, setSaving] = useState(false);
  const types = ["Course", "Book", "Podcast", "Article", "Video", "Other"];
  const statuses = ["queued", "in_progress", "completed"];
  const statusLabels = { queued: "Queued", in_progress: "In Progress", completed: "Completed" };
  const statusColors = { queued: "#64748b", in_progress: "#f59e0b", completed: "#16a34a" };
  const resetForm = () => { setForm({ title: "", author: "", type: "Course", status: "queued", progress: 0, notes: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => { if (!form.title.trim()) return; setSaving(true); if (editingId) { await onUpdate(editingId, form); } else { await onAdd(form); } resetForm(); setSaving(false); };
  const startEdit = (item) => { setForm({ title: item.title || "", author: item.author || "", type: item.type || "Course", status: item.status || "queued", progress: item.progress || 0, notes: item.notes || "" }); setEditingId(item.id); setShowForm(true); };
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const inProgress = items.filter((i) => i.status === "in_progress");
  const queued = items.filter((i) => i.status === "queued");
  const completed = items.filter((i) => i.status === "completed");
  const sorted = [...inProgress, ...queued, ...completed];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{inProgress.length} active · {queued.length} queued · {completed.length} done</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI In Real Estate" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Author / Instructor</label><input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Progress: {form.progress}%</label><input type="range" min="0" max="100" step="5" value={form.progress} onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })} style={{ width: "100%", marginTop: 8 }} /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Key takeaways..." style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? "..." : editingId ? "Update" : "Save"}</GreenButton>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📚</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Learning Items</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Track courses, books, and anything you're learning.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((item) => (
            <div key={item.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.title}</span><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#f1f5f9", color: "#64748b" }}>{item.type?.toUpperCase()}</span></div>{item.author && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>by {item.author}</div>}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${statusColors[item.status]}15`, color: statusColors[item.status] }}>{statusLabels[item.status]?.toUpperCase()}</span><button onClick={() => startEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.edit}</button><button onClick={() => { if (window.confirm("Delete?")) onDelete(item.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${item.progress || 0}%`, borderRadius: 3, background: item.progress >= 100 ? "#16a34a" : item.progress >= 50 ? "#f59e0b" : "#3b82f6", transition: "width 0.3s" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ fontSize: 11, color: "#94a3b8" }}>{item.progress || 0}% complete</span>{item.notes && <span style={{ fontSize: 11, color: "#64748b", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.notes}</span>}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   GROWTH (Tabbed: Links, Goals, Habits, Learning)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   OUTREACH (Communications, Social, Brand)
   ═══════════════════════════════════════════════════════════ */

function OutreachDashboard({ isMobile }) {
  const stats = [
    { emoji: "📞", label: "Calls", value: "Coming Soon", color: "#3b82f6" },
    { emoji: "💬", label: "Texts", value: "Coming Soon", color: "#8b5cf6" },
    { emoji: "📧", label: "Emails", value: "Coming Soon", color: "#dc2626" },
    { emoji: "📱", label: "Social", value: "Coming Soon", color: "#16a34a" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      {stats.map((s) => (
        <div key={s.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif" }}>{s.label}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{s.value}</div>
        </div>
      ))}
      <div style={{ gridColumn: "1 / -1", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Outreach Command Center</h3>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>Your central hub for all communications. Log calls, texts, and emails. Plan and schedule social media content. Connect with contacts across all channels.</p>
      </div>
    </div>
  );
}

/* — Gmail + QUO Inbox Tab — */
function GmailInboxTab({ isMobile, session, gmailConnected, gmailEmail, onConnect, onRefresh, contacts, onAddContact, robots }) {
  const [inboxMode, setInboxModeRaw] = useState("email");
  const setInboxMode = (mode) => { setInboxModeRaw(mode); window.location.hash = `#/growth/inbox/${mode}`; };
  const [emails, setEmails] = useState([]);
  const [messages, setMessages] = useState([]);
  const [calls, setCalls] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmailRaw] = useState(null);
  const setSelectedEmail = (e) => {
    setSelectedEmailRaw(e);
    if (e) window.location.hash = `#/growth/inbox/email/${e.id}`;
    else window.location.hash = "#/growth/inbox/email";
  };

  // Restore state from URL on mount
  React.useEffect(() => {
    const hash = window.location.hash.replace("#/", "").split("/");
    if (hash[0] === "growth" && hash[1] === "inbox") {
      if (hash[2] === "texts" || hash[2] === "email" || hash[2] === "calls") setInboxModeRaw(hash[2]);
      if (hash[2] === "texts" && hash[3]) {
        const parts = decodeURIComponent(hash[3]).split("::");
        if (parts.length === 2) setSelectedThreadRaw({ phoneNumberId: parts[0], contact: parts[1] });
      }
      if (hash[2] === "email" && hash[3]) setSelectedEmailRaw({ id: hash[3], from: "", subject: "", date: "", snippet: "" });
    }
  }, []);
  const [emailBody, setEmailBody] = useState("");
  const [loadingBody, setLoadingBody] = useState(false);
  const [filter, setFilter] = useState("inbox");
  const [checked, setChecked] = useState(false);
  const [quoLoaded, setQuoLoaded] = useState(false);
  const [selectedThread, setSelectedThreadRaw] = useState(null);
  const setSelectedThread = (t) => {
    setSelectedThreadRaw(t);
    if (t) window.location.hash = `#/growth/inbox/texts/${encodeURIComponent(t.phoneNumberId + "::" + t.contact)}`;
    else window.location.hash = "#/growth/inbox/texts";
  };
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: "", from: "PNlN4ZOAt1", body: "" });
  const [showAddContact, setShowAddContact] = useState(null);
  const [addContactForm, setAddContactForm] = useState({ name: "", phone: "", email: "", company: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [alfredResponse, setAlfredResponse] = useState("");
  const [atlasResponse, setAtlasResponse] = useState("");
  const [alfredLoading, setAlfredLoading] = useState(false);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [emailAssistantOpen, setEmailAssistantOpen] = useState(false);
  const [emailAssistantResponse, setEmailAssistantResponse] = useState("");
  const [emailAssistantLoading, setEmailAssistantLoading] = useState(false);
  const [emailAssistantRobot, setEmailAssistantRobot] = useState(null);
  const [emailAssistantPrompt, setEmailAssistantPrompt] = useState("");

  const activeRobots = robots || [];
  const alfredId = activeRobots.find((r) => r.name === "Alfred")?.id;
  const atlasId = activeRobots.find((r) => r.name === "Atlas")?.id;

  const callRobot = async (robotId, msg) => {
    const res = await fetch("https://bkezvsjhaepgvsvfywhk.supabase.co/functions/v1/robot-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ robot_id: robotId, message: msg }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  };

  const fetchSuggestions = async (threadMsgs) => {
    if (!alfredId || !atlasId || threadMsgs.length === 0) return;
    const contextStr = threadMsgs.slice(-10).map((m) => `${m.direction === "outgoing" ? "Me" : "Them"}: ${m.body}`).join("\n");
    const prompt = `Here is a recent text conversation:\n\n${contextStr}\n\nDraft a short, natural reply. Just the message text, nothing else.`;

    setAlfredLoading(true); setAtlasLoading(true);
    setAlfredResponse(""); setAtlasResponse("");

    callRobot(alfredId, prompt)
      .then((data) => setAlfredResponse(data?.response || "No response"))
      .catch((e) => setAlfredResponse("Error: " + String(e)))
      .finally(() => setAlfredLoading(false));

    callRobot(atlasId, prompt)
      .then((data) => setAtlasResponse(data?.response || "No response"))
      .catch((e) => setAtlasResponse("Error: " + String(e)))
      .finally(() => setAtlasLoading(false));
  };

  // Auto-fetch suggestions when thread opens or robots load
  const askEmailAssistant = async (emailData, prompt, robotId) => {
    setEmailAssistantLoading(true);
    setEmailAssistantResponse("");
    try {
      const contextStr = `From: ${emailData.from}\nSubject: ${emailData.subject}\nDate: ${emailData.date}\n\n${emailData.body}`;
      const fullPrompt = `Here is an email:\n\n${contextStr}\n\n${prompt || "Draft a reply to this email. Be concise and professional. Just the reply body, no subject line."}`;
      const data = await callRobot(robotId, fullPrompt);
      setEmailAssistantResponse(data?.response || "No response");
    } catch (err) { setEmailAssistantResponse("Error: " + String(err)); }
    finally { setEmailAssistantLoading(false); }
  };

  // Contact lookup by phone
  const findContact = (phone) => {
    if (!phone || !contacts) return null;
    const clean = phone.replace(/\D/g, "");
    return contacts.find((c) => c.phone && c.phone.replace(/\D/g, "").endsWith(clean.slice(-10)));
  };

  // Phone line lookup
  const PHONE_LINES = {
    "PNcbag1oru": { name: "REAP Order Flow", number: "+18136944125", emoji: "🧯" },
    "PNCF7YPY2P": { name: "Administrator", number: "+18132145768", emoji: "🤑" },
    "PNEUrEiUK1": { name: "Capital", number: "+18137063898", emoji: "😎" },
    "PNIAgUbTmk": { name: "Front Desk", number: "+18135318074", emoji: "🚌" },
    "PNlN4ZOAt1": { name: "Javier Suarez", number: "+18135445781", emoji: "🥷🏼" },
  };
  const ourNumbers = Object.values(PHONE_LINES).map((l) => l.number);
  const getLineName = (phoneNumberId) => PHONE_LINES[phoneNumberId]?.name || "Unknown Line";
  const getLineEmoji = (phoneNumberId) => PHONE_LINES[phoneNumberId]?.emoji || "📱";
  const getContactNumber = (m) => {
    const from = m.from_number || "";
    const to = m.to_number || "";
    if (m.direction === "incoming") return from;
    if (to && to.length > 2 && !ourNumbers.includes(to)) return to;
    if (from && !ourNumbers.includes(from)) return from;
    return to || from || "Unknown";
  };
  const fmtPhoneDisplay = (num) => {
    if (!num || num.length < 4) return num || "Unknown";
    const clean = num.replace(/\D/g, "");
    if (clean.length === 11 && clean.startsWith("1")) return `(${clean.slice(1,4)}) ${clean.slice(4,7)}-${clean.slice(7)}`;
    if (clean.length === 10) return `(${clean.slice(0,3)}) ${clean.slice(3,6)}-${clean.slice(6)}`;
    return num;
  };

  const sendQUOMessage = async (phoneNumberId, to, content) => {
    setSending(true);
    try {
      const line = PHONE_LINES[phoneNumberId];
      await supabase.functions.invoke("quo-proxy", {
        body: { action: "send-message", params: { from: line?.number || phoneNumberId, to, content } },
      });
      setReplyText("");
      // Refresh messages after a short delay to catch the webhook
      setTimeout(() => fetchQuo(), 2000);
    } catch (err) { console.error("Send error:", err); alert("Error sending message"); }
    finally { setSending(false); }
  };

  const fetchEmails = async (query) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-proxy", {
        body: { user_id: session.user.id, action: "list", params: { maxResults: 30, query: query || "in:inbox" } },
      });
      if (error) throw error;
      setEmails(data?.messages || []);
    } catch (err) { console.error("Gmail fetch error:", err); setEmails([]); }
    finally { setLoading(false); setChecked(true); }
  };

  const fetchQuo = async () => {
    setLoading(true);
    try {
      const [{ data: msgData }, { data: callData }] = await Promise.all([
        supabase.from("quo_messages").select("*").eq("deleted", false).order("created_at", { ascending: false }).limit(100),
        supabase.from("quo_calls").select("*").eq("deleted", false).order("created_at", { ascending: false }).limit(50),
      ]);
      setMessages(msgData || []);
      setCalls(callData || []);
      if (phoneNumbers.length === 0) {
        const { data: pnData } = await supabase.functions.invoke("quo-proxy", { body: { action: "phone-numbers" } });
        setPhoneNumbers(pnData?.data || []);
      }
      setQuoLoaded(true);
    } catch (err) { console.error("QUO fetch error:", err); }
    finally { setLoading(false); }
  };

  const archiveConversation = async (phoneNumberId, contact) => {
    const ids = messages.filter((m) => m.phone_number_id === phoneNumberId && getContactNumber(m) === contact).map((m) => m.id);
    for (const id of ids) await supabase.from("quo_messages").update({ archived: true }).eq("id", id);
    setMessages((p) => p.map((m) => ids.includes(m.id) ? { ...m, archived: true } : m));
  };

  const deleteConversation = async (phoneNumberId, contact) => {
    if (!window.confirm("Delete this entire conversation? This cannot be undone.")) return;
    const ids = messages.filter((m) => m.phone_number_id === phoneNumberId && getContactNumber(m) === contact).map((m) => m.id);
    for (const id of ids) await supabase.from("quo_messages").update({ deleted: true }).eq("id", id);
    setMessages((p) => p.filter((m) => !ids.includes(m.id)));
    setSelectedThread(null);
  };

  const openEmail = async (msg) => {
    setSelectedEmail(msg);
    setLoadingBody(true);
    try {
      const { data } = await supabase.functions.invoke("gmail-proxy", {
        body: { user_id: session.user.id, action: "get", params: { messageId: msg.id } },
      });
      let body = "";
      const findBody = (p) => {
        if (p.mimeType === "text/html" && p.body?.data) body = atob(p.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        else if (p.mimeType === "text/plain" && p.body?.data && !body) body = atob(p.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        if (p.parts) p.parts.forEach(findBody);
      };
      if (data?.payload?.body?.data) body = atob(data.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      else findBody(data?.payload || {});
      setEmailBody(body || data?.snippet || "No content");
      if (msg.isUnread) {
        await supabase.functions.invoke("gmail-proxy", {
          body: { user_id: session.user.id, action: "modify", params: { messageId: msg.id, removeLabels: ["UNREAD"] } },
        });
        setEmails((p) => p.map((e) => e.id === msg.id ? { ...e, isUnread: false } : e));
      }
    } catch (err) { setEmailBody("Error loading email"); }
    finally { setLoadingBody(false); }
  };

  React.useEffect(() => { if (gmailConnected && !checked) fetchEmails("in:inbox"); }, [gmailConnected]);
  React.useEffect(() => { if (inboxMode === "texts" || inboxMode === "calls") fetchQuo(); }, [inboxMode]);

  // Auto-trigger AI suggestions when thread has messages
  const threadKey = selectedThread ? `${selectedThread.phoneNumberId}::${selectedThread.contact}` : null;
  const threadMsgCount = selectedThread ? messages.filter((m) => m.phone_number_id === selectedThread.phoneNumberId && getContactNumber(m) === selectedThread.contact && !m.deleted).length : 0;
  React.useEffect(() => {
    if (!threadKey || !alfredId || !atlasId || threadMsgCount === 0) return;
    const tMsgs = messages.filter((m) => m.phone_number_id === selectedThread.phoneNumberId && getContactNumber(m) === selectedThread.contact && !m.deleted).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    fetchSuggestions(tMsgs);
  }, [threadKey, alfredId, atlasId, threadMsgCount]);

  const modes = [
    { k: "email", l: "📧 Email", count: emails.length },
    { k: "texts", l: "💬 Texts", count: messages.length },
    { k: "calls", l: "📞 Calls", count: calls.length },
  ];

  const avatarColors = ["#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#0891b2", "#ec4899"];
  const getAC = (name) => avatarColors[Math.abs([...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];
  const getInitials = (name) => { const p = (name || "?").split(" "); return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (name || "?").slice(0, 2).toUpperCase(); };
  const fmtPhone = (n) => n || "Unknown";

  // Email detail view
  if (selectedEmail) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => { setSelectedEmail(null); setEmailBody(""); setEmailAssistantOpen(false); setEmailAssistantResponse(""); }} style={{ background: "rgba(28,56,32,0.1)", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", color: "#1C3820", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>← Back to Inbox</button>
          <button onClick={() => { setEmailAssistantOpen(!emailAssistantOpen); setEmailAssistantResponse(""); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #8b5cf6", background: emailAssistantOpen ? "#8b5cf6" : "#faf5ff", color: emailAssistantOpen ? "#fff" : "#7c3aed", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>🤖 Assistant</button>
        </div>
        {/* AI Assistant Panel for Email */}
        {emailAssistantOpen && (
          <div style={{ background: "linear-gradient(135deg, #faf5ff, #f5f3ff)", borderRadius: 14, border: "1px solid #e9d5ff", padding: "16px 20px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>🤖</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>AI Assistant</span>
              <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                {activeRobots.map((r) => (
                  <button key={r.id} onClick={() => setEmailAssistantRobot(r.id)} style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${emailAssistantRobot === r.id ? "#7c3aed" : "#e2e8f0"}`, background: emailAssistantRobot === r.id ? "#7c3aed" : "#fff", color: emailAssistantRobot === r.id ? "#fff" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{r.name}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input value={emailAssistantPrompt} onChange={(e) => setEmailAssistantPrompt(e.target.value)} placeholder="e.g. Draft a reply, Summarize this, What should I do..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none" }} className="sz-input" onKeyDown={(e) => { if (e.key === "Enter" && emailAssistantRobot) askEmailAssistant({ from: selectedEmail.from, subject: selectedEmail.subject, date: selectedEmail.date, body: emailBody.replace(/<[^>]*>/g, " ").slice(0, 3000) }, emailAssistantPrompt, emailAssistantRobot); }} />
              <GreenButton small onClick={() => { if (!emailAssistantRobot) { alert("Select a robot first"); return; } askEmailAssistant({ from: selectedEmail.from, subject: selectedEmail.subject, date: selectedEmail.date, body: emailBody.replace(/<[^>]*>/g, " ").slice(0, 3000) }, emailAssistantPrompt, emailAssistantRobot); }} disabled={emailAssistantLoading || !emailAssistantRobot}>{emailAssistantLoading ? "Thinking..." : "Ask"}</GreenButton>
            </div>
            {emailAssistantResponse && (
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e9d5ff", padding: "12px 16px" }}>
                <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{emailAssistantResponse}</p>
                <button onClick={() => { navigator.clipboard.writeText(emailAssistantResponse); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #16a34a", background: "#f0fdf4", color: "#16a34a", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>📋 Copy to Clipboard</button>
              </div>
            )}
          </div>
        )}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>{selectedEmail.subject || "(No Subject)"}</h2>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, fontSize: 12, color: "#64748b" }}>
              <span><strong style={{ color: "#0f172a" }}>{selectedEmail.from}</strong></span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{selectedEmail.date}</span>
            </div>
          </div>
          <div style={{ padding: "22px" }}>
            {loadingBody ? <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</p> : (
              emailBody.includes("<") ?
                <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody }} /> :
                <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{emailBody}</p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 4, background: "#fff", borderRadius: 10, padding: 4, border: "1px solid #e2e8f0", marginBottom: 12, width: "fit-content" }}>
        {modes.map((m) => (
          <button key={m.k} onClick={() => setInboxMode(m.k)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: inboxMode === m.k ? "#1C3820" : "transparent", color: inboxMode === m.k ? "#D4C08C" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{m.l}</button>
        ))}
      </div>

      {/* EMAIL VIEW */}
      {inboxMode === "email" && (
        <>
          {!gmailConnected ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📨</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>Connect Your Gmail</h3>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Link your Gmail to see your inbox here.</p>
              <GreenButton small onClick={onConnect}>🔗 Connect Gmail</GreenButton>
              <div style={{ marginTop: 12 }}><button onClick={onRefresh} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 11, cursor: "pointer" }}>Already connected? Refresh</button></div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[{ k: "inbox", l: "Inbox", q: "in:inbox" }, { k: "unread", l: "Unread", q: "in:inbox is:unread" }, { k: "sent", l: "Sent", q: "in:sent" }, { k: "starred", l: "Starred", q: "is:starred" }].map((f) => (
                    <button key={f.k} onClick={() => { setFilter(f.k); fetchEmails(f.q); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${filter === f.k ? "#1C3820" : "#e2e8f0"}`, background: filter === f.k ? "#1C3820" : "#fff", color: filter === f.k ? "#D4C08C" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{f.l}</button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "#16a34a" }}>✓ {gmailEmail}</span>
                  <button onClick={() => fetchEmails([{ k: "inbox", q: "in:inbox" }, { k: "unread", q: "in:inbox is:unread" }, { k: "sent", q: "in:sent" }, { k: "starred", q: "is:starred" }].find((f) => f.k === filter)?.q)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#64748b", cursor: "pointer", fontWeight: 600 }}>↻</button>
                </div>
              </div>
              {loading ? <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /></div> : emails.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📭</div><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No emails found</p></div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {emails.map((e, i) => {
                    const fromName = e.from?.split("<")[0]?.trim() || e.from;
                    return (
                      <div key={e.id} onClick={() => openEmail(e)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < emails.length - 1 ? "1px solid #f1f5f9" : "none", cursor: "pointer", background: e.isUnread ? "#f0fdf4" : "transparent" }} onMouseEnter={(ev) => ev.currentTarget.style.background = "#f8fafc"} onMouseLeave={(ev) => ev.currentTarget.style.background = e.isUnread ? "#f0fdf4" : "transparent"}>
                        {e.isUnread && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />}
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: getAC(fromName), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{getInitials(fromName)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 13, color: "#0f172a", fontWeight: e.isUnread ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fromName}</span><span style={{ fontSize: 9, color: "#94a3b8", flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>{e.date?.split(",")[0]}</span></div>
                          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: e.isUnread ? 700 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject || "(No Subject)"}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{e.snippet}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TEXTS VIEW */}
      {inboxMode === "texts" && (
        <>
          {/* New Message Compose */}
          {showCompose && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
              <SectionHeader text="New Message" />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>To (phone number) *</label><input value={composeForm.to} onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })} placeholder="+1 555 000 0000" style={{ width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", boxSizing: "border-box" }} className="sz-input" /></div>
                <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Send From</label><select value={composeForm.from} onChange={(e) => setComposeForm({ ...composeForm, from: e.target.value })} style={{ width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", cursor: "pointer", boxSizing: "border-box" }}>{Object.entries(PHONE_LINES).map(([id, l]) => <option key={id} value={id}>{l.emoji} {l.name} ({l.number.replace("+1", "")})</option>)}</select></div>
              </div>
              <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Message *</label><textarea value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} placeholder="Type your message..." rows={3} style={{ width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", resize: "vertical", boxSizing: "border-box" }} className="sz-input" /></div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowCompose(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
                <GreenButton small onClick={async () => { if (composeForm.to && composeForm.body) { await sendQUOMessage(composeForm.from, composeForm.to, composeForm.body); setShowCompose(false); setComposeForm({ to: "", from: "PNlN4ZOAt1", body: "" }); } }} disabled={sending || !composeForm.to || !composeForm.body}>{sending ? "..." : "Send"}</GreenButton>
              </div>
            </div>
          )}

          {/* Add Contact Modal */}
          {showAddContact && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f59e0b", padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 16 }}>📇</span><span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Add {fmtPhoneDisplay(showAddContact)} to Contacts</span></div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <input value={addContactForm.name} onChange={(e) => setAddContactForm({ ...addContactForm, name: e.target.value })} placeholder="Name *" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none" }} className="sz-input" />
                <input value={addContactForm.company} onChange={(e) => setAddContactForm({ ...addContactForm, company: e.target.value })} placeholder="Company" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none" }} className="sz-input" />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setShowAddContact(null); setAddContactForm({ name: "", phone: "", email: "", company: "" }); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Skip</button>
                <GreenButton small onClick={async () => { if (addContactForm.name) { await onAddContact({ name: addContactForm.name, phone: showAddContact, company: addContactForm.company, email: addContactForm.email }); setShowAddContact(null); setAddContactForm({ name: "", phone: "", email: "", company: "" }); } }} disabled={!addContactForm.name}>Save Contact</GreenButton>
              </div>
            </div>
          )}

          {loading ? <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /></div> : selectedThread ? (() => {
            const activeMessages = showArchived ? messages : messages.filter((m) => !m.archived);
            const threadMsgs = activeMessages.filter((m) => m.phone_number_id === selectedThread.phoneNumberId && getContactNumber(m) === selectedThread.contact).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            const lineName = getLineName(selectedThread.phoneNumberId);
            const lineEmoji = getLineEmoji(selectedThread.phoneNumberId);
            const contact = findContact(selectedThread.contact);
            const displayName = contact ? contact.name : fmtPhoneDisplay(selectedThread.contact);
            return (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <button onClick={() => { setSelectedThread(null); setReplyText(""); }} style={{ background: "rgba(28,56,32,0.1)", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", color: "#1C3820", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>← Back</button>
                  <div style={{ display: "flex", gap: 4 }}>
                    {!contact && <button onClick={() => setShowAddContact(selectedThread.contact)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #f59e0b", background: "#fffbeb", color: "#92400e", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>+ Add Contact</button>}
                    <button onClick={() => fetchQuo()} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>↻ Messages</button>
                    <button onClick={async () => { await fetchQuo(); const tmsgs = messages.filter((m) => m.phone_number_id === selectedThread.phoneNumberId && getContactNumber(m) === selectedThread.contact && !m.deleted).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); if (tmsgs.length > 0) fetchSuggestions(tmsgs); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #8b5cf6", background: "#faf5ff", color: "#7c3aed", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>🤖 Refresh AI</button>
                    <button onClick={() => archiveConversation(selectedThread.phoneNumberId, selectedThread.contact)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>📥 Archive</button>
                    <button onClick={() => deleteConversation(selectedThread.phoneNumberId, selectedThread.contact)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>🗑 Delete</button>
                  </div>
                </div>
                {/* Auto AI Suggestions */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div style={{ background: "linear-gradient(135deg, #f0fdf4, #f8fafc)", borderRadius: 12, border: "1px solid #bbf7d0", padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><div style={{ width: 24, height: 24, borderRadius: 6, background: "#1C3820", color: "#D4C08C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>A</div><span style={{ fontSize: 11, fontWeight: 700, color: "#1C3820" }}>Alfred</span><span style={{ fontSize: 9, color: "#94a3b8" }}>Personal Butler</span></div>
                    {alfredLoading ? <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Drafting...</p> : alfredResponse ? (
                      <><p style={{ fontSize: 12, color: "#0f172a", lineHeight: 1.5, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{alfredResponse}</p><button onClick={() => { setReplyText(alfredResponse); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1C3820", background: "#1C3820", color: "#D4C08C", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Use Alfred's Reply</button></>
                    ) : <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Waiting for messages...</p>}
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #eff6ff, #f8fafc)", borderRadius: 12, border: "1px solid #bfdbfe", padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><div style={{ width: 24, height: 24, borderRadius: 6, background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>A</div><span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>Atlas</span><span style={{ fontSize: 9, color: "#94a3b8" }}>Strategic Operator</span></div>
                    {atlasLoading ? <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Drafting...</p> : atlasResponse ? (
                      <><p style={{ fontSize: 12, color: "#0f172a", lineHeight: 1.5, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{atlasResponse}</p><button onClick={() => { setReplyText(atlasResponse); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #3b82f6", background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Use Atlas's Reply</button></>
                    ) : <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Waiting for messages...</p>}
                  </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{lineEmoji} via {lineName} · {fmtPhoneDisplay(selectedThread.contact)} · {threadMsgs.length} msg{threadMsgs.length !== 1 ? "s" : ""}</div>
                    {contact?.company && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{contact.company}</div>}
                  </div>
                  <div style={{ padding: "16px", maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {threadMsgs.map((m) => {
                      const isMe = m.direction === "outgoing";
                      const time = m.created_at ? new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
                      return (
                        <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#1C3820" : "#f1f5f9", color: isMe ? "#fff" : "#0f172a", fontSize: 13, lineHeight: 1.5 }}>{m.body || "(No content)"}</div>
                          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2, padding: "0 4px" }}>{time}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, background: "#f8fafc" }}>
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && replyText.trim()) sendQUOMessage(selectedThread.phoneNumberId, selectedThread.contact, replyText); }} placeholder="Type a message..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff" }} className="sz-input" />
                    <GreenButton small onClick={() => { if (replyText.trim()) sendQUOMessage(selectedThread.phoneNumberId, selectedThread.contact, replyText); }} disabled={sending || !replyText.trim()}>{sending ? "..." : "Send"}</GreenButton>
                  </div>
                </div>
              </>
            );
          })() : messages.length === 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span></span><GreenButton small onClick={() => setShowCompose(true)}>✏️ New Message</GreenButton></div>
          ) && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>💬</div><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No text messages yet. Send a message or wait for texts to come in.</p></div>
          ) : (() => {
            const activeMessages = showArchived ? messages : messages.filter((m) => !m.archived);
            const convos = {};
            activeMessages.forEach((m) => {
              const contact = getContactNumber(m);
              const key = `${m.phone_number_id}::${contact}`;
              if (!convos[key] || new Date(m.created_at) > new Date(convos[key].latest.created_at)) {
                convos[key] = { contact, phoneNumberId: m.phone_number_id, latest: m, count: (convos[key]?.count || 0) + 1 };
              } else { convos[key].count++; }
            });
            const sorted = Object.values(convos).sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));
            return (
              <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{sorted.length} conversation{sorted.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => setShowArchived(!showArchived)} style={{ fontSize: 9, color: showArchived ? "#f59e0b" : "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>{showArchived ? "Hide archived" : "Show archived"}</button>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={fetchQuo} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#64748b", cursor: "pointer", fontWeight: 600 }}>↻</button>
                  <GreenButton small onClick={() => setShowCompose(!showCompose)}>✏️ New Message</GreenButton>
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {sorted.map((c, i) => {
                  const lineName = getLineName(c.phoneNumberId);
                  const lineEmoji = getLineEmoji(c.phoneNumberId);
                  const isIncoming = c.latest.direction === "incoming";
                  const time = c.latest.created_at ? new Date(c.latest.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
                  const contactObj = findContact(c.contact);
                  const displayName = contactObj ? contactObj.name : fmtPhoneDisplay(c.contact);
                  const isArchived = c.latest.archived;
                  return (
                    <div key={`${c.phoneNumberId}-${c.contact}`} onClick={() => setSelectedThread({ contact: c.contact, phoneNumberId: c.phoneNumberId })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < sorted.length - 1 ? "1px solid #f1f5f9" : "none", cursor: "pointer", opacity: isArchived ? 0.5 : 1 }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: contactObj ? "#1C3820" : getAC(c.contact || "?"), color: contactObj ? "#D4C08C" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{contactObj ? contactObj.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : getInitials(fmtPhoneDisplay(c.contact))}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{displayName}</span>
                          <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{time}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{lineEmoji} via {lineName}{!contactObj && <span style={{ color: "#f59e0b", marginLeft: 6 }}>· Not in contacts</span>}{isArchived && <span style={{ color: "#94a3b8", marginLeft: 6 }}>· Archived</span>}</div>
                        <div style={{ fontSize: 12, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{isIncoming ? "" : "You: "}{c.latest.body || "(No content)"}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        {c.count > 1 && <span style={{ fontSize: 9, color: "#94a3b8" }}>{c.count} msgs</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            );
          })()}
        </>
      )}

      {/* CALLS VIEW */}
      {inboxMode === "calls" && (
        <>
          {loading ? <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /></div> : calls.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📞</div><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No calls found</p></div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              {calls.map((c, i) => {
                const isIncoming = c.direction === "incoming";
                const contact = isIncoming ? c.from_number : c.to_number;
                const phoneName = c.phone_name || phoneNumbers.find((p) => p.id === c.phone_number_id)?.name || "";
                const duration = c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "";
                const statusColors = { completed: "#16a34a", missed: "#dc2626", voicemail: "#f59e0b", cancelled: "#94a3b8", ringing: "#3b82f6" };
                const st = c.status || "completed";
                return (
                  <div key={c.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < calls.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: st === "missed" ? "#fef2f2" : isIncoming ? "#f0fdf4" : "#eff6ff", color: st === "missed" ? "#dc2626" : isIncoming ? "#16a34a" : "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{st === "missed" ? "✕" : isIncoming ? "↙" : "↗"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{fmtPhone(contact)}</span>
                        <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{c.created_at ? fmtDate(c.created_at.split("T")[0]) : ""}</span>
                      </div>
                      {phoneName && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>via {phoneName}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${statusColors[st] || "#94a3b8"}15`, color: statusColors[st] || "#94a3b8", textTransform: "uppercase" }}>{st}</span>
                        {duration && <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{duration}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

function InboxTab({ isMobile, companies, onAddCompany }) {
  const [view, setView] = useState("chats");
  const [messages, setMessages] = useState([]);
  const [calls, setCalls] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  // Chat form
  const [chatForm, setChatForm] = useState({ contact_id: "", message: "", direction: "Outgoing" });
  // Call form
  const [callForm, setCallForm] = useState({ contact_id: "", duration: "", outcome: "Connected", notes: "" });
  const outcomes = ["Connected", "Voicemail", "No Answer", "Callback Requested", "Wrong Number"];
  const outcomeColors = { Connected: "#16a34a", Voicemail: "#f59e0b", "No Answer": "#dc2626", "Callback Requested": "#3b82f6", "Wrong Number": "#64748b" };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const getContact = (id) => (companies || []).find((c) => c.id === id);
  const getContactName = (id) => getContact(id)?.name || "Unknown";
  const getInitials = (name) => { const parts = (name || "?").split(" "); return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); };
  const avatarColors = ["#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#ec4899", "#0891b2", "#ea580c"];
  const getAvatarColor = (name) => avatarColors[Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];

  const handleQuickAdd = async () => {
    if (!quickName.trim()) return;
    await onAddCompany({ name: quickName, phone: quickPhone || null });
    setQuickName(""); setQuickPhone(""); setShowQuickAdd(false);
  };

  const ContactSelector = ({ value, onChange }) => (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Contact *</label>
      <div style={{ display: "flex", gap: 4 }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: "pointer" }}>
          <option value="">Select contact...</option>
          {(companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
        </select>
        <button onClick={() => setShowQuickAdd(!showQuickAdd)} style={{ padding: "0 12px", borderRadius: 8, border: "1.5px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", fontSize: 16, fontWeight: 700, cursor: "pointer", flexShrink: 0 }} title="Add new contact">+</button>
      </div>
    </div>
  );

  const resetChat = () => { setChatForm({ contact_id: "", message: "", direction: "Outgoing" }); setShowForm(false); setShowQuickAdd(false); };
  const resetCall = () => { setCallForm({ contact_id: "", duration: "", outcome: "Connected", notes: "" }); setShowForm(false); setShowQuickAdd(false); };

  const handleAddChat = () => {
    if (!chatForm.contact_id || !chatForm.message.trim()) return;
    const name = getContactName(chatForm.contact_id);
    setMessages((p) => [{ id: Date.now(), contact_id: chatForm.contact_id, contact: name, message: chatForm.message, direction: chatForm.direction, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), date: new Date().toISOString().split("T")[0], unread: chatForm.direction === "Incoming" ? 1 : 0, thread: [{ message: chatForm.message, direction: chatForm.direction, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }] }, ...p]);
    resetChat();
  };

  const handleAddCall = () => {
    if (!callForm.contact_id) return;
    const name = getContactName(callForm.contact_id);
    setCalls((p) => [{ id: Date.now(), contact_id: callForm.contact_id, contact: name, duration: callForm.duration, outcome: callForm.outcome, notes: callForm.notes, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), date: new Date().toISOString().split("T")[0] }, ...p]);
    resetCall();
  };

  const handleReply = (threadId) => {
    if (!replyText.trim()) return;
    setMessages((p) => p.map((m) => m.id === threadId ? { ...m, message: replyText, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), thread: [...(m.thread || []), { message: replyText, direction: "Outgoing", time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }] } : m));
    setReplyText("");
  };

  // Thread view
  if (activeThread) {
    const thread = messages.find((m) => m.id === activeThread);
    if (!thread) { setActiveThread(null); return null; }
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setActiveThread(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#64748b" }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: getAvatarColor(thread.contact), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>{getInitials(thread.contact)}</div>
          <div><div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{thread.contact}</div>{thread.phone && <div style={{ fontSize: 11, color: "#94a3b8" }}>{thread.phone}</div>}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "16px", marginBottom: 12, minHeight: 200 }}>
          {(thread.thread || []).map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.direction === "Outgoing" ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: msg.direction === "Outgoing" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.direction === "Outgoing" ? "#1C3820" : "#f1f5f9", color: msg.direction === "Outgoing" ? "#fff" : "#0f172a", fontSize: 13, lineHeight: 1.5 }}>
                {msg.message}
                <div style={{ fontSize: 9, color: msg.direction === "Outgoing" ? "#bbf7d0" : "#94a3b8", marginTop: 4, textAlign: "right" }}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a message..." onKeyDown={(e) => e.key === "Enter" && handleReply(activeThread)} style={{ ...inputStyle, flex: 1 }} className="sz-input" />
          <GreenButton small onClick={() => handleReply(activeThread)} disabled={!replyText.trim()}>Send</GreenButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chats / Calls toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ k: "chats", l: "💬 Chats", count: messages.length }, { k: "calls", l: "📞 Calls", count: calls.length }].map(({ k, l, count }) => (
          <button key={k} onClick={() => { setView(k); setShowForm(false); }} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1.5px solid ${view === k ? "#1C3820" : "#e2e8f0"}`, background: view === k ? "#f0fdf4" : "#fff", cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: view === k ? "#1C3820" : "#64748b" }}>{l}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{count} {k === "chats" ? "conversation" : "call"}{count !== 1 ? "s" : ""}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <GreenButton small onClick={() => setShowForm(!showForm)}>{Icons.plus} {view === "chats" ? "New Chat" : "Log Call"}</GreenButton>
      </div>

      {/* New Chat Form */}
      {showForm && view === "chats" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          {showQuickAdd && (
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>Name *</label><input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="New contact name" style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} className="sz-input" /></div>
              <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>Phone</label><input value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} placeholder="Optional" style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} className="sz-input" /></div>
              <GreenButton small onClick={handleQuickAdd} disabled={!quickName.trim()}>Add</GreenButton>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <ContactSelector value={chatForm.contact_id} onChange={(v) => setChatForm({ ...chatForm, contact_id: v })} />
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Direction</label><select value={chatForm.direction} onChange={(e) => setChatForm({ ...chatForm, direction: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="Outgoing">Outgoing</option><option value="Incoming">Incoming</option></select></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Message *</label><input value={chatForm.message} onChange={(e) => setChatForm({ ...chatForm, message: e.target.value })} placeholder="Message text" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetChat} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleAddChat} disabled={!chatForm.contact_id || !chatForm.message.trim()}>Send</GreenButton></div>
        </div>
      )}

      {/* Log Call Form */}
      {showForm && view === "calls" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          {showQuickAdd && (
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>Name *</label><input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="New contact name" style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} className="sz-input" /></div>
              <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>Phone</label><input value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} placeholder="Optional" style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }} className="sz-input" /></div>
              <GreenButton small onClick={handleQuickAdd} disabled={!quickName.trim()}>Add</GreenButton>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <ContactSelector value={callForm.contact_id} onChange={(v) => setCallForm({ ...callForm, contact_id: v })} />
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Duration (min)</label><input type="number" value={callForm.duration} onChange={(e) => setCallForm({ ...callForm, duration: e.target.value })} placeholder="5" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Outcome</label><select value={callForm.outcome} onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{outcomes.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={callForm.notes} onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetCall} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleAddCall} disabled={!callForm.contact_id}>Log</GreenButton></div>
        </div>
      )}

      {/* Chat List */}
      {view === "chats" && (
        messages.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>💬</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Conversations</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Log chats and text conversations. API integration coming soon.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {messages.map((m) => (
              <div key={m.id} onClick={() => setActiveThread(m.id)} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: getAvatarColor(m.contact), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{getInitials(m.contact)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{m.contact}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{m.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.direction === "Outgoing" ? "You: " : ""}{m.message}</div>
                </div>
                {m.unread > 0 && <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.unread}</div>}
              </div>
            ))}
          </div>
        )
      )}

      {/* Call List */}
      {view === "calls" && (
        calls.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📞</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Calls Logged</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Log your calls to track conversations. API integration coming soon.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {calls.map((c) => (
              <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: getAvatarColor(c.contact), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{getInitials(c.contact)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{c.contact}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{c.time}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{c.outcome === "Connected" ? "↗ Call" : c.outcome === "Voicemail" ? "📩 Voicemail" : "✕ " + c.outcome}{c.duration ? ` · ${c.duration}m` : ""}</span>
                  </div>
                  {c.notes && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.notes}</div>}
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, padding: "3px 6px", borderRadius: 4, background: `${outcomeColors[c.outcome] || "#64748b"}15`, color: outcomeColors[c.outcome] || "#64748b", flexShrink: 0 }}>{c.outcome?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}

/* — Unified Contacts Tab — */
function ContactsTab({ isMobile, contacts, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", notes: "" });
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactTab, setContactTab] = useState("history");
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const resetForm = () => { setForm({ name: "", phone: "", email: "", company: "", notes: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editingId) await onUpdate(editingId, form);
    else await onAdd(form);
    resetForm();
  };
  const startEdit = (c) => { setForm({ name: c.name || "", phone: c.phone || "", email: c.email || "", company: c.company || "", notes: c.notes || "" }); setEditingId(c.id); setShowForm(true); };

  const loadHistory = async (contact) => {
    setHistoryLoading(true);
    const items = [];
    if (contact.phone) {
      const clean = contact.phone.replace(/\D/g, "");
      const patterns = [contact.phone, `+${clean}`, `+1${clean.slice(-10)}`];
      const { data: msgs } = await supabase.from("quo_messages").select("*").or(patterns.map((p) => `from_number.eq.${p},to_number.eq.${p}`).join(",")).eq("deleted", false).order("created_at", { ascending: false }).limit(50);
      (msgs || []).forEach((m) => items.push({ type: "text", direction: m.direction, body: m.body, date: m.created_at, phone_name: m.phone_name, phone_number_id: m.phone_number_id }));
      const { data: cls } = await supabase.from("quo_calls").select("*").or(patterns.map((p) => `from_number.eq.${p},to_number.eq.${p}`).join(",")).eq("deleted", false).order("created_at", { ascending: false }).limit(50);
      (cls || []).forEach((c) => items.push({ type: "call", direction: c.direction, status: c.status, duration: c.duration, date: c.created_at, phone_name: c.phone_name }));
    }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    setHistoryItems(items);
    setHistoryLoading(false);
  };

  const openContact = (c) => { setSelectedContact(c); setContactTab("history"); loadHistory(c); };

  const filtered = (contacts || []).filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || (c.phone || "").includes(s) || (c.email || "").toLowerCase().includes(s) || (c.company || "").toLowerCase().includes(s);
  });

  const PHONE_LINES = { "PNcbag1oru": "🧯 REAP", "PNCF7YPY2P": "🤑 Admin", "PNEUrEiUK1": "😎 Capital", "PNIAgUbTmk": "🚌 Front Desk", "PNlN4ZOAt1": "🥷🏼 Javier" };

  // Contact detail view
  if (selectedContact) {
    const c = contacts.find((x) => x.id === selectedContact.id) || selectedContact;
    const pills = [c.company, c.phone, c.email].filter(Boolean);
    return (
      <>
        <PageHeader isMobile={isMobile} title={c.name} subtitle={c.company || "Contact"} icon={c.name?.[0]?.toUpperCase()} onBack={() => setSelectedContact(null)} pills={pills} stats={[
          { label: "TEXTS", value: historyItems.filter((h) => h.type === "text").length },
          { label: "CALLS", value: historyItems.filter((h) => h.type === "call").length },
        ]}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { startEdit(c); setSelectedContact(null); }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "#D4C08C", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏️ Edit</button>
            <button onClick={() => { if (window.confirm("Delete " + c.name + "?")) { onDelete(c.id); setSelectedContact(null); } }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "#fca5a5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑</button>
          </div>
        </PageHeader>
        <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
          <TabBar tabs={[{ key: "history", label: "📜 History" }, { key: "info", label: "📋 Info" }, { key: "notes", label: "📝 Notes" }]} active={contactTab} onChange={setContactTab} isMobile={isMobile} />

          {contactTab === "history" && (
            <>
              {historyLoading ? <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /></div> : historyItems.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📜</div><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No interaction history yet. Texts and calls with {c.name} will appear here.</p></div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {historyItems.map((h, i) => {
                    const isIncoming = h.direction === "incoming";
                    const time = h.date ? new Date(h.date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
                    const lineName = PHONE_LINES[h.phone_number_id] || h.phone_name || "";
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < historyItems.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: h.type === "text" ? (isIncoming ? "#f0fdf4" : "#eff6ff") : (h.status === "missed" ? "#fef2f2" : "#f8fafc"), color: h.type === "text" ? (isIncoming ? "#16a34a" : "#3b82f6") : (h.status === "missed" ? "#dc2626" : "#64748b"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{h.type === "text" ? "💬" : "📞"}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{h.type === "text" ? (isIncoming ? "Received text" : "Sent text") : (isIncoming ? "Incoming call" : "Outgoing call")}{h.type === "call" && h.status === "missed" ? " (missed)" : ""}</span>
                            <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{time}</span>
                          </div>
                          {h.type === "text" && h.body && <div style={{ fontSize: 12, color: "#475569", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.body}</div>}
                          {h.type === "call" && h.duration > 0 && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{Math.floor(h.duration / 60)}m {h.duration % 60}s</div>}
                          {lineName && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{lineName}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {contactTab === "info" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
                <SectionHeader text="Contact Details" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>📱 Phone</span><span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{c.phone || "—"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>📧 Email</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{c.email || "—"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>🏢 Company</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{c.company || "—"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>📅 Added</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{c.created_at ? fmtDate(c.created_at.split("T")[0]) : "—"}</span></div>
                </div>
              </div>
            </div>
          )}

          {contactTab === "notes" && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
              <SectionHeader text="Notes" />
              <textarea value={c.notes || ""} onChange={(e) => onUpdate(c.id, { notes: e.target.value })} placeholder="Add notes about this contact..." rows={6} style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box" }} className="sz-input" />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", flex: "1 1 200px", minWidth: 140 }} className="sz-input" />
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Contact</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
          <SectionHeader text={editingId ? "Edit Contact" : "New Contact"} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Company</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleSubmit} disabled={!form.name.trim()}>{editingId ? "Update" : "Add"}</GreenButton></div>
        </div>
      )}
      {filtered.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📇</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>{search ? "No matches" : "No Contacts Yet"}</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{search ? "Try a different search term." : "Add contacts to sync across your inbox, texts, and calls."}</p></div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Name</th>
              <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Phone</th>
              {!isMobile && <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Email</th>}
              {!isMobile && <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Company</th>}
              <th style={{ width: 60 }}></th>
            </tr></thead>
            <tbody>{filtered.map((c) => (
              <tr key={c.id} onClick={() => openContact(c)} style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1C3820", color: "#D4C08C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{c.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}</div><div style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</div></div></td>
                <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{c.phone || "—"}</td>
                {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 11 }}>{c.email || "—"}</td>}
                {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b" }}>{c.company || "—"}</td>}
                <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", gap: 4 }}><button onClick={(e) => { e.stopPropagation(); startEdit(c); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.edit}</button><button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete contact?")) onDelete(c.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function EmailsTab({ isMobile }) {
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ contact: "", email: "", subject: "", date: new Date().toISOString().split("T")[0], direction: "Sent", status: "Sent", notes: "" });
  const statuses = ["Draft", "Sent", "Replied", "Awaiting Reply", "Archived"];
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const resetForm = () => { setForm({ contact: "", email: "", subject: "", date: new Date().toISOString().split("T")[0], direction: "Sent", status: "Sent", notes: "" }); setShowForm(false); };
  const handleAdd = () => { if (!form.subject.trim()) return; setLogs((p) => [{ id: Date.now(), ...form }, ...p]); resetForm(); };
  const statusColors = { Draft: "#64748b", Sent: "#3b82f6", Replied: "#16a34a", "Awaiting Reply": "#f59e0b", Archived: "#94a3b8" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{logs.length} email{logs.length !== 1 ? "s" : ""} logged</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Log Email</GreenButton>
      </div>
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Contact</label><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Name" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Subject *</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject line" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Direction</label><select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="Sent">Sent</option><option value="Received">Received</option></select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleAdd} disabled={!form.subject.trim()}>Log</GreenButton></div>
        </div>
      )}
      {logs.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📧</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Emails Logged</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Track important emails. Gmail/Outlook integration & AI drafting coming soon.</p></div>
      ) : logs.map((l) => (
        <div key={l.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: l.direction === "Received" ? "#fef2f2" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{l.direction === "Received" ? "📥" : "📤"}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subject}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{l.contact || l.email} · {fmtDate(l.date)}{l.notes ? ` · ${l.notes}` : ""}</div></div>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${statusColors[l.status] || "#64748b"}15`, color: statusColors[l.status] || "#64748b", flexShrink: 0 }}>{l.status?.toUpperCase()}</span>
        </div>
      ))}
    </>
  );
}

function SocialTab({ isMobile }) {
  const [subView, setSubView] = useState("planner");
  const [posts, setPosts] = useState([]);
  const [accounts, setAccts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const platforms = ["Instagram", "Facebook", "TikTok", "LinkedIn", "X/Twitter", "YouTube", "Other"];
  const postStatuses = ["Draft", "Scheduled", "Posted"];
  const [form, setForm] = useState({ platform: "Instagram", content: "", date: new Date().toISOString().split("T")[0], time: "12:00", status: "Draft", notes: "" });
  const [acctForm, setAcctForm] = useState({ platform: "Instagram", handle: "", url: "", followers: "" });
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const resetForm = () => { setForm({ platform: "Instagram", content: "", date: new Date().toISOString().split("T")[0], time: "12:00", status: "Draft", notes: "" }); setShowForm(false); };
  const handleAddPost = () => { if (!form.content.trim()) return; setPosts((p) => [{ id: Date.now(), ...form }, ...p]); resetForm(); };
  const handleAddAcct = () => { if (!acctForm.handle.trim()) return; setAccts((p) => [...p, { id: Date.now(), ...acctForm }]); setAcctForm({ platform: "Instagram", handle: "", url: "", followers: "" }); };
  const platformColors = { Instagram: "#e1306c", Facebook: "#1877f2", TikTok: "#000", LinkedIn: "#0a66c2", "X/Twitter": "#1da1f2", YouTube: "#ff0000", Other: "#64748b" };
  const statusColors = { Draft: "#64748b", Scheduled: "#f59e0b", Posted: "#16a34a" };

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ k: "planner", l: "Content Planner" }, { k: "creator", l: "Creator" }, { k: "accounts", l: "Accounts" }, { k: "analytics", l: "Analytics" }].map(({ k, l }) => (
          <button key={k} onClick={() => setSubView(k)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${subView === k ? "#0f172a" : "#e2e8f0"}`, background: subView === k ? "#0f172a" : "#fff", color: subView === k ? "#fff" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{l}</button>
        ))}
      </div>

      {subView === "planner" && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>{posts.length} post{posts.length !== 1 ? "s" : ""}</span>
          <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} New Post</GreenButton>
        </div>
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Platform</label><select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{platforms.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{postStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Content *</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Post caption or content description..." rows={3} style={{ ...inputStyle, resize: "vertical" }} className="sz-input" /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button><GreenButton small onClick={handleAddPost} disabled={!form.content.trim()}>Save</GreenButton></div>
          </div>
        )}
        {posts.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📅</div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Posts Planned</h3><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Plan and schedule social media content across platforms.</p></div>
        ) : posts.map((p) => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${platformColors[p.platform] || "#64748b"}15`, color: platformColors[p.platform] || "#64748b" }}>{p.platform?.toUpperCase()}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${statusColors[p.status]}15`, color: statusColors[p.status] }}>{p.status?.toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{fmtDate(p.date)}</span>
            </div>
            <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>{p.content}</p>
          </div>
        ))}
      </>)}

      {subView === "creator" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Content Creator Studio</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.6 }}>Upload photos & videos, edit with AI, and distribute across all channels at once. Coming soon with media editing APIs.</p>
        </div>
      )}

      {subView === "accounts" && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <select value={acctForm.platform} onChange={(e) => setAcctForm({ ...acctForm, platform: e.target.value })} style={{ ...inputStyle, fontSize: 12, cursor: "pointer" }}>{platforms.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            <input value={acctForm.handle} onChange={(e) => setAcctForm({ ...acctForm, handle: e.target.value })} placeholder="@handle" style={{ ...inputStyle, fontSize: 12 }} className="sz-input" />
            <input value={acctForm.url} onChange={(e) => setAcctForm({ ...acctForm, url: e.target.value })} placeholder="Profile URL" style={{ ...inputStyle, fontSize: 12 }} className="sz-input" />
            <GreenButton small onClick={handleAddAcct} disabled={!acctForm.handle.trim()}>Add</GreenButton>
          </div>
        </div>
        {accounts.map((a) => (
          <div key={a.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: `${platformColors[a.platform] || "#64748b"}15`, color: platformColors[a.platform] || "#64748b" }}>{a.platform}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{a.handle}</span>
            {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none" }}>↗</a>}
          </div>
        ))}
      </>)}

      {subView === "analytics" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Social Analytics</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>Track followers, engagement, and growth across platforms. Will populate once accounts are connected via APIs.</p>
        </div>
      )}
    </>
  );
}

function OutreachView({ isMobile, activeTab, onTabChange, companies, onAddCompany, onUpdateCompany, onDeleteCompany, contacts, onAddContact, onUpdateContact, onDeleteContact, session, robots, gmailConnected, gmailEmail, onGmailConnect, onGmailRefresh }) {
  const tab = activeTab || "dashboard";
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const sections = [
    { key: "dashboard", icon: "📊", label: "Dashboard", desc: "Overview" },
    { key: "contacts", icon: "📇", label: "Contacts", desc: `${(contacts || []).length} contacts` },
    { key: "inbox", icon: "📨", label: "Inbox", desc: gmailConnected ? gmailEmail : "Connect Gmail" },
    { key: "emails", icon: "📧", label: "Emails", desc: "Email campaigns" },
    { key: "social", icon: "📱", label: "Social", desc: "Posts & creator" },
  ];

  const navigate = (k) => {
    onTabChange(k);
    if (isMobile) setSidebarOpen(false);
  };

  const Sidebar = () => (
    <div style={{ width: 260, background: "#0f1f12", borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "auto", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: "#D4C08C", margin: "0 0 4px", fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>📡 Outreach</h2>
        <div style={{ fontSize: 9, color: "rgba(212,192,140,0.5)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Communications Hub</div>
      </div>
      <div style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {sections.map((s) => {
          const isActive = tab === s.key;
          return (
            <div key={s.key} onClick={() => navigate(s.key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", background: isActive ? "rgba(212,192,140,0.12)" : "transparent", borderLeft: `3px solid ${isActive ? "#D4C08C" : "transparent"}` }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }} onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? "rgba(212,192,140,0.2)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#D4C08C" : "#fff" }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
      {isMobile && !sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} style={{ position: "fixed", top: 70, left: 14, zIndex: 50, background: "#1C3820", border: "1px solid rgba(212,192,140,0.3)", borderRadius: 8, color: "#D4C08C", padding: "8px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>☰</button>
      )}
      {sidebarOpen && (
        <>
          {isMobile && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />}
          <div style={{ position: isMobile ? "fixed" : "relative", left: 0, top: 0, bottom: 0, zIndex: 45, height: "100%" }}><Sidebar /></div>
        </>
      )}
      <div style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Outreach" subtitle="Communications, social & brand" isMobile={isMobile} icon="📡" />
        <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
          {tab === "dashboard" && <OutreachDashboard isMobile={isMobile} />}
          {tab === "contacts" && <ContactsTab isMobile={isMobile} contacts={contacts} onAdd={onAddContact} onUpdate={onUpdateContact} onDelete={onDeleteContact} />}
          {tab === "inbox" && <GmailInboxTab isMobile={isMobile} session={session} gmailConnected={gmailConnected} gmailEmail={gmailEmail} onConnect={onGmailConnect} onRefresh={onGmailRefresh} contacts={contacts} onAddContact={onAddContact} robots={robots} />}
          {tab === "emails" && <EmailsTab isMobile={isMobile} />}
          {tab === "social" && <SocialTab isMobile={isMobile} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPECIAL PROJECTS — Editor, Videographer, Marketing
   ═══════════════════════════════════════════════════════════ */

function SpecialProjectsView({ isMobile, candidates, onAdd, onUpdate, onDelete }) {
  const [tab, setTab] = useState("editor");
  const tabs = [
    { key: "editor", label: "✂️ Editor" },
    { key: "videographer", label: "🎥 Videographer" },
    { key: "marketing", label: "📣 Marketing" },
    { key: "fbads", label: "📘 FB Ads" },
  ];

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Special Projects" subtitle="Creative production & campaigns" isMobile={isMobile} icon="🎬" />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={isMobile} />
        <CandidatePipeline isMobile={isMobile} category={tab} candidates={(candidates || []).filter((c) => c.category === tab)} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    </div>
  );
}

function CandidatePipeline({ isMobile, category, candidates, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", company: "", rate: "", status: "interviewing", email: "", phone: "", portfolio_url: "", notes: "" });
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const statuses = [
    { k: "lead", l: "Lead", c: "#94a3b8", icon: "🔍" },
    { k: "interviewing", l: "Interviewing", c: "#3b82f6", icon: "💬" },
    { k: "trial", l: "Trial", c: "#f59e0b", icon: "🧪" },
    { k: "approved", l: "Approved", c: "#16a34a", icon: "✅" },
    { k: "rejected", l: "Rejected", c: "#dc2626", icon: "❌" },
    { k: "on-hold", l: "On Hold", c: "#7c3aed", icon: "⏸️" },
  ];

  const resetForm = () => { setForm({ name: "", company: "", rate: "", status: "interviewing", email: "", phone: "", portfolio_url: "", notes: "" }); setEditingId(null); setShowForm(false); };
  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editingId) await onUpdate(editingId, form);
    else await onAdd({ ...form, category });
    resetForm();
  };
  const startEdit = (c) => { setForm({ name: c.name || "", company: c.company || "", rate: c.rate || "", status: c.status || "interviewing", email: c.email || "", phone: c.phone || "", portfolio_url: c.portfolio_url || "", notes: c.notes || "" }); setEditingId(c.id); setShowForm(true); };

  const categoryLabel = { editor: "Editor", videographer: "Videographer", marketing: "Marketing" }[category] || category;

  // Group by status
  const grouped = statuses.map((s) => ({ ...s, items: candidates.filter((c) => c.status === s.k) })).filter((g) => g.items.length > 0);
  const ungrouped = candidates.filter((c) => !statuses.find((s) => s.k === c.status));
  if (ungrouped.length > 0) grouped.push({ k: "other", l: "Other", c: "#94a3b8", icon: "❓", items: ungrouped });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{candidates.length} {categoryLabel.toLowerCase()}{candidates.length !== 1 ? "s" : ""} in pipeline</span>
        <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add {categoryLabel}</GreenButton>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
          <SectionHeader text={editingId ? `Edit ${categoryLabel}` : `New ${categoryLabel}`} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Company</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company or freelance" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Rate</label><input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="e.g. $50/hr or $500/project" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{statuses.map((s) => <option key={s.k} value={s.k}>{s.icon} {s.l}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" style={inputStyle} className="sz-input" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Portfolio / Website</label><input value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} placeholder="https://..." style={inputStyle} className="sz-input" /></div>
            <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Interview notes, impressions, samples reviewed..." rows={3} style={{ ...inputStyle, resize: "vertical" }} className="sz-input" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <GreenButton small onClick={handleSubmit} disabled={!form.name.trim()}>{editingId ? "Update" : "Add"}</GreenButton>
          </div>
        </div>
      )}

      {candidates.length === 0 && !showForm ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{ { editor: "✂️", videographer: "🎥", marketing: "📣" }[category]}</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No {categoryLabel}s Yet</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Start building your {categoryLabel.toLowerCase()} pipeline — add people you're interviewing or considering.</p>
          <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add First {categoryLabel}</GreenButton>
        </div>
      ) : (
        <div>
          {grouped.map((group) => (
            <div key={group.k} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 0" }}>
                <span style={{ fontSize: 14 }}>{group.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: group.c, textTransform: "uppercase", letterSpacing: "0.05em" }}>{group.l}</span>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{group.items.length}</span>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                  <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Name</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Company</th>
                    {!isMobile && <th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Rate</th>}
                    {!isMobile && <th style={{ textAlign: "left", padding: "8px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Contact</th>}
                    <th style={{ width: 60 }}></th>
                  </tr></thead>
                  <tbody>{group.items.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f8fafc" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                        {c.notes && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{c.notes}</div>}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>{c.company || "—"}</td>
                      {!isMobile && <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{c.rate || "—"}</td>}
                      {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 11 }}>
                        {c.email && <div>{c.email}</div>}
                        {c.phone && <div style={{ fontFamily: "'DM Mono', monospace" }}>{c.phone}</div>}
                        {c.portfolio_url && <a href={c.portfolio_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontSize: 10 }}>Portfolio ↗</a>}
                      </td>}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <select value={c.status} onChange={(e) => onUpdate(c.id, { status: e.target.value })} onClick={(e) => e.stopPropagation()} style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", fontSize: 9, fontWeight: 700, cursor: "pointer", color: (statuses.find((s) => s.k === c.status) || {}).c || "#94a3b8", background: "#fff", fontFamily: "'DM Sans', sans-serif", width: 30, opacity: 0 }} title="Change status">
                            {statuses.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
                          </select>
                          <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.edit}</button>
                          <button onClick={() => { if (window.confirm("Remove?")) onDelete(c.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM — Staff & Team Management
   ═══════════════════════════════════════════════════════════ */

function TeamView({ isMobile, staff, businesses, onAdd, onUpdate, onDelete }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", department: "", organizations: [], status: "active", hire_date: "", hourly_rate: "", notes: "", avatar_color: "#1C3820" });
  const [saving, setSaving] = useState(false);
  const [orgInput, setOrgInput] = useState("");

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const colors = ["#1C3820", "#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#ec4899", "#0891b2"];

  const resetForm = () => { setForm({ name: "", email: "", phone: "", role: "", department: "", organizations: [], status: "active", hire_date: "", hourly_rate: "", notes: "", avatar_color: "#1C3820" }); setOrgInput(""); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : 0, hire_date: form.hire_date || null, organizations: JSON.stringify(form.organizations) };
    await onAdd(payload);
    resetForm(); setSaving(false);
  };

  const addOrg = () => { if (orgInput.trim() && !form.organizations.includes(orgInput.trim())) { setForm({ ...form, organizations: [...form.organizations, orgInput.trim()] }); setOrgInput(""); } };

  // Detail view
  if (selectedId) {
    const member = staff.find((s) => s.id === selectedId);
    if (!member) { setSelectedId(null); return null; }
    return <TeamMemberDetailView isMobile={isMobile} member={member} onBack={() => setSelectedId(null)} onUpdate={onUpdate} onDelete={onDelete} />;
  }

  const activeStaff = staff.filter((s) => s.status !== "inactive");
  const inactiveStaff = staff.filter((s) => s.status === "inactive");

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Team" subtitle={`${staff.length} team member${staff.length !== 1 ? "s" : ""}`} isMobile={isMobile} icon="👥" />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <GreenButton small onClick={() => { resetForm(); setShowForm(!showForm); }}>{Icons.plus} Add Member</GreenButton>
        </div>

        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text="New Team Member" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role / Title</label><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Virtual Assistant" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Operations" style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Hourly Rate ($)</label><input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} placeholder="0.00" style={inputStyle} className="sz-input" /></div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Organizations</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={orgInput} onChange={(e) => setOrgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOrg())} placeholder="Type org name and press Enter" style={{ ...inputStyle, flex: 1 }} className="sz-input" />
                  <button onClick={addOrg} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Add</button>
                </div>
                {form.organizations.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{form.organizations.map((o, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 4 }}>{o} <button onClick={() => setForm({ ...form, organizations: form.organizations.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 12, padding: 0, lineHeight: 1 }}>×</button></span>)}</div>}
              </div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" style={inputStyle} className="sz-input" /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? "..." : "Add Member"}</GreenButton>
            </div>
          </div>
        )}

        {staff.length === 0 && !showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Team Members</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Add your team — VAs, contractors, employees, anyone you work with.</p>
            <GreenButton small onClick={() => setShowForm(true)}>{Icons.plus} Add First Member</GreenButton>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <thead><tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Name</th>
                <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Organization(s)</th>
                {!isMobile && <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Phone</th>}
                {!isMobile && <th style={{ textAlign: "left", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Email</th>}
                <th style={{ textAlign: "center", padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>Status</th>
              </tr></thead>
              <tbody>{activeStaff.concat(inactiveStaff).map((s) => {
                const orgs = Array.isArray(s.organizations) ? s.organizations : (typeof s.organizations === "string" ? JSON.parse(s.organizations || "[]") : []);
                const statusColors = { active: "#16a34a", onleave: "#f59e0b", inactive: "#94a3b8" };
                const sc = statusColors[s.status] || "#94a3b8";
                const avatarColors = ["#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#0891b2"];
                const ac = s.avatar_color || avatarColors[Math.abs([...(s.name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];
                return (
                  <tr key={s.id} onClick={() => setSelectedId(s.id)} style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer", opacity: s.status === "inactive" ? 0.5 : 1 }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: ac, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.name.charAt(0).toUpperCase()}</div>
                        <div><div style={{ fontWeight: 600, color: "#0f172a" }}>{s.name}</div>{s.role && <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.role}</div>}</div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {orgs.length > 0 ? orgs.map((o, i) => <span key={i} style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>{o}</span>) : <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>}
                      </div>
                    </td>
                    {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{s.phone || "—"}</td>}
                    {!isMobile && <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{s.email || "—"}</td>}
                    <td style={{ padding: "10px 14px", textAlign: "center" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${sc}15`, color: sc, textTransform: "uppercase", letterSpacing: "0.05em" }}>● {s.status || "active"}</span></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamMemberDetailView({ isMobile, member, onBack, onUpdate, onDelete }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: member.name, email: member.email || "", phone: member.phone || "", role: member.role || "", department: member.department || "", status: member.status || "active", hire_date: member.hire_date || "", hourly_rate: member.hourly_rate || "", notes: member.notes || "" });
  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const orgs = Array.isArray(member.organizations) ? member.organizations : (typeof member.organizations === "string" ? JSON.parse(member.organizations || "[]") : []);

  const handleSave = async () => {
    await onUpdate(member.id, { name: form.name, email: form.email || null, phone: form.phone || null, role: form.role || null, department: form.department || null, status: form.status, hire_date: form.hire_date || null, hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : 0, notes: form.notes || null });
    setEditing(false);
  };

  const tabs = [
    { key: "overview", label: "📋 Overview" },
    { key: "documents", label: "📄 Documents" },
    { key: "timetracking", label: "⏱ Time" },
    { key: "billing", label: "💵 Billing" },
  ];

  const pills = [member.role, member.department, ...(orgs || [])].filter(Boolean);

  return (
    <div className="sz-page" style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader isMobile={isMobile} title={member.name} subtitle={member.role || "Team Member"} icon={member.name?.[0]?.toUpperCase()} onBack={onBack} pills={pills} stats={[
        { label: "STATUS", value: (member.status || "active").toUpperCase() },
        { label: "RATE", value: member.hourly_rate ? `$${member.hourly_rate}/hr` : "—" },
        { label: "SINCE", value: member.hire_date ? fmtDate(member.hire_date) : "—" },
      ]}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEditing(!editing)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "#D4C08C", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{editing ? "✕ Cancel" : "✏️ Edit"}</button>
          <button onClick={() => { if (window.confirm("Remove " + member.name + "?")) { onDelete(member.id); onBack(); } }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "#fca5a5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑</button>
        </div>
      </PageHeader>
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {editing && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #16a34a", padding: isMobile ? "16px" : "20px 24px", marginBottom: 16 }}>
            <SectionHeader text="Edit Member" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role</label><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="active">Active</option><option value="onleave">On Leave</option><option value="inactive">Inactive</option></select></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Hire Date</label><input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Hourly Rate ($)</label><input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} style={inputStyle} className="sz-input" /></div>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} className="sz-input" /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><GreenButton small onClick={handleSave} disabled={!form.name.trim()}>Save</GreenButton></div>
          </div>
        )}
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} isMobile={isMobile} />
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
              <SectionHeader text="Contact Info" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>📧 Email</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{member.email || "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>📱 Phone</span><span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{member.phone || "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>🏢 Department</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{member.department || "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#475569" }}>📅 Hire Date</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{member.hire_date ? fmtDate(member.hire_date) : "—"}</span></div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
              <SectionHeader text="Organizations" />
              {orgs.length === 0 ? <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>No organizations assigned</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {orgs.map((o, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{o}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {member.notes && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px", gridColumn: isMobile ? "1" : "1 / -1" }}>
                <SectionHeader text="Notes" />
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{member.notes}</p>
              </div>
            )}
          </div>
        )}
        {activeTab === "documents" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>Documents</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Contracts, onboarding docs, and files for {member.name} will live here.</p>
          </div>
        )}
        {activeTab === "timetracking" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏱</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>Time Tracking</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Hours logged, timesheets, and attendance for {member.name}.</p>
          </div>
        )}
        {activeTab === "billing" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💵</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>Billing</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Charges, invoices, and payment history for {member.name}.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLICKUP — Spaces → Folders → Lists → Tasks
   ═══════════════════════════════════════════════════════════ */

function ClickUpView({ isMobile, spaces, folders, lists, tasks, onAddSpace, onUpdateSpace, onDeleteSpace, onAddFolder, onUpdateFolder, onDeleteFolder, onAddList, onUpdateList, onDeleteList, onAddTask, onUpdateTask, onDeleteTask }) {
  const [view, setView] = useState({ level: "spaces" });
  const [activeTask, setActiveTask] = useState(null);
  const [listView, setListView] = useState("list");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [expandedSpaces, setExpandedSpaces] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [createMenu, setCreateMenu] = useState(null); // {type, parentId}
  const [createValue, setCreateValue] = useState("");

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const space = view.spaceId ? spaces.find((s) => s.id === view.spaceId) : null;
  const folder = view.folderId ? folders.find((f) => f.id === view.folderId) : null;
  const list = view.listId ? lists.find((l) => l.id === view.listId) : null;

  const navigate = (newView) => {
    setView(newView);
    if (newView.spaceId) setExpandedSpaces((p) => ({ ...p, [newView.spaceId]: true }));
    if (newView.folderId) setExpandedFolders((p) => ({ ...p, [newView.folderId]: true }));
    if (isMobile) setSidebarOpen(false);
  };

  const toggleSpace = (id) => setExpandedSpaces((p) => ({ ...p, [id]: !p[id] }));
  const toggleFolder = (id) => setExpandedFolders((p) => ({ ...p, [id]: !p[id] }));

  const handleCreate = async () => {
    if (!createValue.trim() || !createMenu) return;
    if (createMenu.type === "space") await onAddSpace({ name: createValue, color: "#1C3820" });
    else if (createMenu.type === "folder") await onAddFolder({ name: createValue, space_id: createMenu.parentId });
    else if (createMenu.type === "list") await onAddList({ name: createValue, folder_id: createMenu.folderId || null, space_id: createMenu.parentId });
    else if (createMenu.type === "task") await onAddTask({ name: createValue, list_id: createMenu.parentId, status: "todo", priority: "normal", progress: 0 });
    setCreateValue("");
    setCreateMenu(null);
  };

  /* — Sidebar tree — */
  const Sidebar = () => (
    <div style={{ width: 260, background: "#0f1f12", borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "auto", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#D4C08C", margin: 0, fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>📋 ClickUp</h2>
          <button onClick={() => setCreateMenu({ type: "space" })} title="New Space" style={{ background: "rgba(212,192,140,0.15)", border: "1px solid rgba(212,192,140,0.3)", borderRadius: 6, color: "#D4C08C", width: 22, height: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>+</button>
        </div>
        <div style={{ fontSize: 9, color: "rgba(212,192,140,0.5)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Workspace</div>
      </div>
      <div style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {spaces.length === 0 && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "20px 12px", margin: 0 }}>No spaces yet. Click + to add one.</p>}
        {spaces.map((s) => {
          const isExpanded = expandedSpaces[s.id];
          const spaceFolders = folders.filter((f) => f.space_id === s.id);
          const rootLists = lists.filter((l) => l.space_id === s.id && !l.folder_id);
          const isActiveSpace = view.spaceId === s.id;
          return (
            <div key={s.id} style={{ marginBottom: 2 }}>
              <div onClick={() => { toggleSpace(s.id); navigate({ level: "space", spaceId: s.id }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", cursor: "pointer", background: isActiveSpace && view.level === "space" ? "rgba(212,192,140,0.12)" : "transparent", borderLeft: `3px solid ${isActiveSpace ? "#D4C08C" : "transparent"}` }} onMouseEnter={(e) => { if (!isActiveSpace) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }} onMouseLeave={(e) => { if (!isActiveSpace || view.level !== "space") e.currentTarget.style.background = "transparent"; else e.currentTarget.style.background = "rgba(212,192,140,0.12)"; }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>{isExpanded ? "▼" : "▶"}</span>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: s.color || "#1C3820", display: "flex", alignItems: "center", justifyContent: "center", color: "#D4C08C", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{s.name[0]?.toUpperCase()}</div>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setCreateMenu({ type: "folder", parentId: s.id }); }} title="New Folder" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>+</button>
              </div>
              {isExpanded && (
                <>
                  {rootLists.map((l) => {
                    const isActive = view.listId === l.id;
                    const listTasks = tasks.filter((t) => t.list_id === l.id && !t.parent_task_id);
                    return (
                      <div key={l.id} onClick={() => navigate({ level: "list", spaceId: s.id, listId: l.id })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px 5px 38px", cursor: "pointer", background: isActive ? "rgba(212,192,140,0.12)" : "transparent", borderLeft: `3px solid ${isActive ? "#D4C08C" : "transparent"}` }}>
                        <span style={{ fontSize: 11 }}>📄</span>
                        <span style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{listTasks.length}</span>
                      </div>
                    );
                  })}
                  {spaceFolders.map((f) => {
                    const folderExpanded = expandedFolders[f.id];
                    const folderLists = lists.filter((l) => l.folder_id === f.id);
                    const isActiveFolder = view.folderId === f.id;
                    return (
                      <div key={f.id}>
                        <div onClick={() => { toggleFolder(f.id); navigate({ level: "folder", spaceId: s.id, folderId: f.id }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px 5px 28px", cursor: "pointer", background: isActiveFolder && view.level === "folder" ? "rgba(212,192,140,0.08)" : "transparent" }}>
                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>{folderExpanded ? "▼" : "▶"}</span>
                          <span style={{ fontSize: 11 }}>📁</span>
                          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); setCreateMenu({ type: "list", parentId: s.id, folderId: f.id }); }} title="New List" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>+</button>
                        </div>
                        {folderExpanded && folderLists.map((l) => {
                          const isActive = view.listId === l.id;
                          const listTasks = tasks.filter((t) => t.list_id === l.id && !t.parent_task_id);
                          return (
                            <div key={l.id} onClick={() => navigate({ level: "list", spaceId: s.id, folderId: f.id, listId: l.id })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px 5px 52px", cursor: "pointer", background: isActive ? "rgba(212,192,140,0.12)" : "transparent", borderLeft: `3px solid ${isActive ? "#D4C08C" : "transparent"}` }}>
                              <span style={{ fontSize: 10 }}>📄</span>
                              <span style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{listTasks.length}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div onClick={() => setCreateMenu({ type: "list", parentId: s.id })} style={{ padding: "5px 14px 5px 38px", fontSize: 10, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>+ Add list</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* — Main content area — */
  const renderContent = () => {
    // Spaces overview (no space selected)
    if (view.level === "spaces") {
      return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
          <PageHeader title="ClickUp" subtitle="Projects, lists & tasks" isMobile={isMobile} icon="📋" />
          <div style={{ marginTop: 16 }}>
            {spaces.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 6px" }}>No Spaces Yet</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Create your first space to organize projects and tasks.</p>
                <GreenButton small onClick={() => setCreateMenu({ type: "space" })}>{Icons.plus} New Space</GreenButton>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
                {spaces.map((s) => {
                  const spaceLists = lists.filter((l) => l.space_id === s.id);
                  const spaceTasks = tasks.filter((t) => spaceLists.some((l) => l.id === t.list_id));
                  return (
                    <div key={s.id} onClick={() => navigate({ level: "space", spaceId: s.id })} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 20px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color || "#1C3820", display: "flex", alignItems: "center", justifyContent: "center", color: "#D4C08C", fontSize: 16, fontWeight: 800 }}>{s.name[0]?.toUpperCase()}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{s.name}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{spaceLists.length} lists · {spaceTasks.length} tasks</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Space dashboard
    if (view.level === "space") {
      const spaceFolders = folders.filter((f) => f.space_id === view.spaceId);
      const spaceLists = lists.filter((l) => l.space_id === view.spaceId);
      const spaceTasks = tasks.filter((t) => spaceLists.some((l) => l.id === t.list_id) && !t.parent_task_id);
      const byStatus = { todo: 0, "in-progress": 0, review: 0, done: 0 };
      spaceTasks.forEach((t) => { byStatus[t.status || "todo"] = (byStatus[t.status || "todo"] || 0) + 1; });
      const byPriority = { urgent: 0, high: 0, normal: 0, low: 0 };
      spaceTasks.forEach((t) => { byPriority[t.priority || "normal"] = (byPriority[t.priority || "normal"] || 0) + 1; });
      const completionPct = spaceTasks.length > 0 ? Math.round((byStatus.done / spaceTasks.length) * 100) : 0;
      return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
          <PageHeader title={space.name} subtitle="Space Dashboard" isMobile={isMobile} icon={space.name?.[0]?.toUpperCase()} stats={[
            { label: "LISTS", value: spaceLists.length },
            { label: "TASKS", value: spaceTasks.length },
            { label: "DONE", value: `${completionPct}%` },
          ]} />
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
              <SectionHeader text="Tasks by Status" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[{ k: "todo", l: "To Do", c: "#94a3b8" }, { k: "in-progress", l: "In Progress", c: "#3b82f6" }, { k: "review", l: "Review", c: "#f59e0b" }, { k: "done", l: "Done", c: "#16a34a" }].map((s) => {
                  const count = byStatus[s.k] || 0;
                  const pct = spaceTasks.length > 0 ? (count / spaceTasks.length) * 100 : 0;
                  return (
                    <div key={s.k}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "#475569", fontWeight: 600 }}>{s.l}</span>
                        <span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: s.c }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
              <SectionHeader text="Tasks by Priority" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[{ k: "urgent", l: "🚩 Urgent", c: "#dc2626" }, { k: "high", l: "🟡 High", c: "#f59e0b" }, { k: "normal", l: "🔵 Normal", c: "#3b82f6" }, { k: "low", l: "⚪ Low", c: "#94a3b8" }].map((p) => {
                  const count = byPriority[p.k] || 0;
                  const pct = spaceTasks.length > 0 ? (count / spaceTasks.length) * 100 : 0;
                  return (
                    <div key={p.k}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "#475569", fontWeight: 600 }}>{p.l}</span>
                        <span style={{ color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: p.c }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px", gridColumn: isMobile ? "1" : "1 / -1" }}>
              <SectionHeader text="Lists Overview" />
              {spaceLists.length === 0 ? <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: 0, padding: "12px 0" }}>No lists yet. Use the sidebar + button to add one.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {spaceLists.map((l) => {
                    const lt = tasks.filter((t) => t.list_id === l.id && !t.parent_task_id);
                    const done = lt.filter((t) => t.status === "done").length;
                    const pct = lt.length > 0 ? Math.round((done / lt.length) * 100) : 0;
                    const f = folders.find((fo) => fo.id === l.folder_id);
                    return (
                      <div key={l.id} onClick={() => navigate({ level: "list", spaceId: space.id, folderId: l.folder_id, listId: l.id })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#f8fafc", cursor: "pointer" }}>
                        <span style={{ fontSize: 13 }}>📄</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{l.name}</div>
                          {f && <div style={{ fontSize: 9, color: "#94a3b8" }}>📁 {f.name}</div>}
                        </div>
                        <div style={{ width: 80 }}>
                          <div style={{ height: 4, borderRadius: 2, background: "#e2e8f0", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "#16a34a" }} /></div>
                        </div>
                        <span style={{ fontSize: 10, color: "#64748b", fontFamily: "'DM Mono', monospace", minWidth: 36, textAlign: "right" }}>{done}/{lt.length}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Folder view
    if (view.level === "folder") {
      const folderLists = lists.filter((l) => l.folder_id === view.folderId);
      return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
          <PageHeader title={folder.name} subtitle={`📁 ${space.name}`} isMobile={isMobile} icon="📁" onBack={() => navigate({ level: "space", spaceId: space.id })} />
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <GreenButton small onClick={() => setCreateMenu({ type: "list", parentId: space.id, folderId: folder.id })}>{Icons.plus} New List</GreenButton>
          </div>
          {folderLists.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📄</div><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Create your first list in this folder</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {folderLists.map((l) => {
                const lt = tasks.filter((t) => t.list_id === l.id && !t.parent_task_id);
                const done = lt.filter((t) => t.status === "done").length;
                return (
                  <div key={l.id} onClick={() => navigate({ level: "list", spaceId: space.id, folderId: folder.id, listId: l.id })} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{l.name}</div><div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{done}/{lt.length} tasks completed</div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // List view (tasks grouped by priority)
    if (view.level === "list") {
      const listTasks = tasks.filter((t) => t.list_id === view.listId && !t.parent_task_id);
      return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
          <PageHeader title={list.name} subtitle={folder ? `📁 ${folder.name}` : `${space.name}`} isMobile={isMobile} icon="📄" onBack={() => navigate(folder ? { level: "folder", spaceId: space.id, folderId: folder.id } : { level: "space", spaceId: space.id })} />
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, background: "#fff", borderRadius: 8, padding: 3, border: "1px solid #e2e8f0" }}>
              <button onClick={() => setListView("list")} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: listView === "list" ? "#1C3820" : "transparent", color: listView === "list" ? "#fff" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>☰ List</button>
              <button onClick={() => setListView("board")} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: listView === "board" ? "#1C3820" : "transparent", color: listView === "board" ? "#fff" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>▦ Board</button>
            </div>
            <GreenButton small onClick={() => setCreateMenu({ type: "task", parentId: view.listId })}>{Icons.plus} New Task</GreenButton>
          </div>
          {listView === "list" ? (
            <TaskListView tasks={listTasks} allTasks={tasks} onOpen={(t) => setActiveTask(t)} onUpdate={onUpdateTask} onDelete={onDeleteTask} isMobile={isMobile} />
          ) : (
            <TaskBoardView tasks={listTasks} onOpen={(t) => setActiveTask(t)} onUpdate={onUpdateTask} />
          )}
          {activeTask && <TaskDetailModal task={tasks.find((t) => t.id === activeTask.id) || activeTask} allTasks={tasks} onClose={() => setActiveTask(null)} onUpdate={onUpdateTask} onDelete={onDeleteTask} onAddTask={onAddTask} listId={view.listId} />}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
      {/* Mobile sidebar toggle */}
      {isMobile && !sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} style={{ position: "fixed", top: 14, left: 14, zIndex: 50, background: "#1C3820", border: "1px solid rgba(212,192,140,0.3)", borderRadius: 8, color: "#D4C08C", padding: "8px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>☰</button>
      )}
      {/* Sidebar */}
      {sidebarOpen && (
        <>
          {isMobile && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />}
          <div style={{ position: isMobile ? "fixed" : "relative", left: 0, top: 0, bottom: 0, zIndex: 45, height: "100%" }}><Sidebar /></div>
        </>
      )}
      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto" }}>{renderContent()}</div>

      {/* Create modal */}
      {createMenu && (
        <div onClick={() => setCreateMenu(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 20, width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 12px", fontFamily: "'Playfair Display', serif" }}>New {createMenu.type.charAt(0).toUpperCase() + createMenu.type.slice(1)}</h3>
            <input value={createValue} onChange={(e) => setCreateValue(e.target.value)} placeholder={`${createMenu.type} name`} onKeyDown={(e) => e.key === "Enter" && handleCreate()} autoFocus style={inputStyle} className="sz-input" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => { setCreateMenu(null); setCreateValue(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
              <GreenButton small onClick={handleCreate} disabled={!createValue.trim()}>Create</GreenButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* — Task List View grouped by Priority — */
function TaskListView({ tasks, allTasks, onOpen, onUpdate, onDelete, isMobile }) {
  const [collapsed, setCollapsed] = useState({});
  const priorityGroups = [
    { k: "urgent", l: "Urgent", c: "#dc2626", flag: "🚩" },
    { k: "high", l: "High", c: "#f59e0b", flag: "🟡" },
    { k: "normal", l: "Normal", c: "#3b82f6", flag: "🔵" },
    { k: "low", l: "Low", c: "#94a3b8", flag: "⚪" },
    { k: "none", l: "No Priority", c: "#cbd5e1", flag: "⬜" },
  ];
  if (tasks.length === 0) return <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>✓</div><p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No tasks yet</p></div>;

  const getInitials = (name) => { if (!name) return "?"; const parts = name.split(" "); return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); };
  const avatarColors = ["#3b82f6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#0891b2"];
  const getAvatarColor = (name) => avatarColors[Math.abs([...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      {priorityGroups.map((group, gIdx) => {
        const groupTasks = tasks.filter((t) => {
          const p = t.priority || "normal";
          return group.k === "none" ? !t.priority || t.priority === "none" : p === group.k;
        });
        if (groupTasks.length === 0) return null;
        const isCollapsed = collapsed[group.k];
        return (
          <div key={group.k} style={{ borderTop: gIdx > 0 ? "1px solid #f1f5f9" : "none" }}>
            <div onClick={() => setCollapsed((p) => ({ ...p, [group.k]: !p[group.k] }))} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f8fafc", cursor: "pointer", borderBottom: isCollapsed ? "none" : "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", fontSize: 9, transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▼</span>
              <span style={{ fontSize: 14 }}>{group.flag}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: group.c, textTransform: "uppercase", letterSpacing: "0.05em" }}>{group.l}</span>
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{groupTasks.length}</span>
            </div>
            {!isCollapsed && (
              <>
                {/* Column headers (desktop only) */}
                {!isMobile && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 40px", gap: 12, padding: "6px 14px 6px 38px", borderBottom: "1px solid #f1f5f9", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <div>Name</div>
                    <div>Assignee</div>
                    <div>Start</div>
                    <div>Due</div>
                    <div></div>
                  </div>
                )}
                {groupTasks.map((t) => {
                  const subCount = allTasks.filter((st) => st.parent_task_id === t.id).length;
                  const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
                  return (
                    <div key={t.id} onClick={() => onOpen(t)} style={{ display: isMobile ? "flex" : "grid", gridTemplateColumns: "1fr 100px 100px 100px 40px", alignItems: "center", gap: isMobile ? 8 : 12, padding: "10px 14px 10px 38px", cursor: "pointer", borderBottom: "1px solid #f8fafc", fontSize: 12 }} onMouseEnter={(e) => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: isMobile ? 1 : "unset" }}>
                        <button onClick={(e) => { e.stopPropagation(); onUpdate(t.id, { status: t.status === "done" ? "todo" : "done", progress: t.status === "done" ? 0 : 100 }); }} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${t.status === "done" ? "#16a34a" : "#cbd5e1"}`, background: t.status === "done" ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>{t.status === "done" && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}</button>
                        <span style={{ fontWeight: 600, color: "#0f172a", textDecoration: t.status === "done" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                        {subCount > 0 && <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>↳{subCount}</span>}
                      </div>
                      {!isMobile && (
                        <>
                          <div>{t.assignee ? <div title={t.assignee} style={{ width: 22, height: 22, borderRadius: "50%", background: getAvatarColor(t.assignee), color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{getInitials(t.assignee)}</div> : <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px dashed #cbd5e1" }} />}</div>
                          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{t.start_date ? fmtDate(t.start_date) : "—"}</div>
                          <div style={{ fontSize: 11, color: overdue ? "#dc2626" : "#64748b", fontFamily: "'DM Mono', monospace", fontWeight: overdue ? 700 : 400 }}>{t.due_date ? fmtDate(t.due_date) : "—"}</div>
                          <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete?")) onDelete(t.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>{Icons.trash}</button>
                        </>
                      )}
                      {isMobile && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {t.due_date && <span style={{ fontSize: 10, color: overdue ? "#dc2626" : "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{fmtDate(t.due_date)}</span>}
                          {t.assignee && <div title={t.assignee} style={{ width: 20, height: 20, borderRadius: "50%", background: getAvatarColor(t.assignee), color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{getInitials(t.assignee)}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* — Task Board View — */
function TaskBoardView({ tasks, onOpen, onUpdate }) {
  const columns = [{ k: "todo", l: "To Do", c: "#94a3b8" }, { k: "in-progress", l: "In Progress", c: "#3b82f6" }, { k: "review", l: "Review", c: "#f59e0b" }, { k: "done", l: "Done", c: "#16a34a" }];
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => (t.status || "todo") === col.k);
        return (
          <div key={col.k} style={{ minWidth: 240, flex: "0 0 240px", background: "#f1f5f9", borderRadius: 12, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.c }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>{col.l}</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{colTasks.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {colTasks.map((t) => (
                <div key={t.id} onClick={() => onOpen(t)} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", cursor: "pointer", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{t.name}</div>
                  {t.due_date && <div style={{ fontSize: 10, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>📅 {fmtDate(t.due_date)}</div>}
                  {typeof t.progress === "number" && t.progress > 0 && <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "#f1f5f9", overflow: "hidden" }}><div style={{ height: "100%", width: `${t.progress}%`, background: col.c }} /></div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* — Task Detail Modal — */
function TaskDetailModal({ task, allTasks, onClose, onUpdate, onDelete, onAddTask, listId }) {
  const [form, setForm] = useState({ name: task.name || "", description: task.description || "", status: task.status || "todo", priority: task.priority || "normal", start_date: task.start_date || "", due_date: task.due_date || "", assignee: task.assignee || "", progress: task.progress || 0, notes: task.notes || "" });
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(task.comments || []);
  const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
  const inputStyle = { width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  const save = (updates) => { setForm({ ...form, ...updates }); onUpdate(task.id, updates); };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await onAddTask({ name: newSubtask, list_id: listId, parent_task_id: task.id, status: "todo", priority: "normal", progress: 0 });
    setNewSubtask("");
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const updated = [...comments, { text: newComment, date: new Date().toISOString() }];
    setComments(updated);
    onUpdate(task.id, { comments: updated });
    setNewComment("");
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, maxWidth: 620, width: "100%", maxHeight: "90vh", overflow: "auto", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={() => save({ name: form.name })} style={{ flex: 1, fontSize: 18, fontWeight: 700, border: "none", outline: "none", color: "#0f172a", fontFamily: "'Playfair Display', serif" }} />
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div><label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase" }}>Status</label><select value={form.status} onChange={(e) => save({ status: e.target.value, progress: e.target.value === "done" ? 100 : form.progress })} style={{ ...inputStyle, cursor: "pointer" }}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="review">Review</option><option value="done">Done</option></select></div>
          <div><label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase" }}>Priority</label><select value={form.priority} onChange={(e) => save({ priority: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
          <div><label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase" }}>Start</label><input type="date" value={form.start_date || ""} onChange={(e) => save({ start_date: e.target.value || null })} style={inputStyle} className="sz-input" /></div>
          <div><label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase" }}>Due</label><input type="date" value={form.due_date || ""} onChange={(e) => save({ due_date: e.target.value || null })} style={inputStyle} className="sz-input" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase" }}>Assignee</label><input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} onBlur={() => save({ assignee: form.assignee })} placeholder="Who owns this?" style={inputStyle} className="sz-input" /></div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Progress</label>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1C3820" }}>{form.progress}%</span>
          </div>
          <input type="range" min="0" max="100" step="5" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} onMouseUp={() => save({ progress: form.progress })} onTouchEnd={() => save({ progress: form.progress })} style={{ width: "100%", accentColor: "#1C3820" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase" }}>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} onBlur={() => save({ description: form.description })} placeholder="Add details..." rows={3} style={{ ...inputStyle, resize: "vertical" }} className="sz-input" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Subtasks ({subtasks.length})</label>
          {subtasks.map((st) => (
            <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
              <button onClick={() => onUpdate(st.id, { status: st.status === "done" ? "todo" : "done" })} style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${st.status === "done" ? "#16a34a" : "#cbd5e1"}`, background: st.status === "done" ? "#16a34a" : "#fff", cursor: "pointer", flexShrink: 0 }}>{st.status === "done" && <span style={{ color: "#fff", fontSize: 9 }}>✓</span>}</button>
              <span style={{ flex: 1, fontSize: 12, color: "#0f172a", textDecoration: st.status === "done" ? "line-through" : "none" }}>{st.name}</span>
              <button onClick={() => onDelete(st.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#dc2626" }}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()} placeholder="Add subtask..." style={{ ...inputStyle, flex: 1 }} className="sz-input" />
            <GreenButton small onClick={handleAddSubtask} disabled={!newSubtask.trim()}>+</GreenButton>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Comments ({comments.length})</label>
          {comments.map((c, i) => (
            <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: "#0f172a" }}>{c.text}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>{fmtDate(c.date)}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} placeholder="Add comment..." style={{ ...inputStyle, flex: 1 }} className="sz-input" />
            <GreenButton small onClick={handleAddComment} disabled={!newComment.trim()}>+</GreenButton>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
          <button onClick={() => { if (window.confirm("Delete task?")) { onDelete(task.id); onClose(); } }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>Delete</button>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#1C3820", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Done</button>
        </div>
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
    return { page: hash[0] || "overview", tab: hash[1] || null, subtab: hash[2] || null, detail: hash[3] || null };
  };

  const initialHash = parseHash();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeNav, setActiveNav] = useState(initialHash.page || "overview");
  const [activeTab, setActiveTab] = useState(initialHash.tab || null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
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
  const [savedLinks, setSavedLinks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [learningItems, setLearningItems] = useState([]);
  const [uploadLogs, setUploadLogs] = useState([]);
  const [businessReports, setBusinessReports] = useState([]);
  const [bizGoals, setBizGoals] = useState([]);
  const [bizMilestones, setBizMilestones] = useState([]);
  const [bizTeam, setBizTeam] = useState([]);
  const [funnelPresets, setFunnelPresets] = useState([]);
  const [funnelInflows, setFunnelInflows] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [robots, setRobots] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [orgInvites, setOrgInvites] = useState([]);
  const [projectCandidates, setProjectCandidates] = useState([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [contacts, setContacts] = useState([]);
  const [cuSpaces, setCuSpaces] = useState([]);
  const [cuFolders, setCuFolders] = useState([]);
  const [cuLists, setCuLists] = useState([]);
  const [cuTasks, setCuTasks] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
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
    // Try cache first for instant render
    try {
      const cached = localStorage.getItem(`sz_cache_${session.user.id}`);
      if (cached) {
        const c = JSON.parse(cached);
        if (c.accounts) setAccounts(c.accounts);
        if (c.transactions) setTransactions(c.transactions);
        if (c.assets) setAssets(c.assets);
        if (c.investments) setInvestments(c.investments);
        if (c.businesses) setBusinesses(c.businesses);
        if (c.companies) setCompanies(c.companies);
        if (c.policies) setPolicies(c.policies);
        if (c.homes) setHomes(c.homes);
        if (c.utilityBills) setUtilityBills(c.utilityBills);
        if (c.lifeExpenses) setLifeExpenses(c.lifeExpenses);
        if (c.plannerTasks) setPlannerTasks(c.plannerTasks);
        if (c.calendarEvents) setCalendarEvents(c.calendarEvents);
        if (c.kids) setKids(c.kids);
        if (c.monthlyBills) setMonthlyBills(c.monthlyBills);
        if (c.savedLinks) setSavedLinks(c.savedLinks);
        if (c.goals) setGoals(c.goals);
        if (c.habits) setHabits(c.habits);
        if (c.cuSpaces) setCuSpaces(c.cuSpaces);
        if (c.cuFolders) setCuFolders(c.cuFolders);
        if (c.cuLists) setCuLists(c.cuLists);
        if (c.cuTasks) setCuTasks(c.cuTasks);
        if (c.robots) setRobots(c.robots);
        // Show cached data immediately, refresh in background
        setDataLoading(false);
      } else {
        setDataLoading(true);
      }
    } catch (e) { setDataLoading(true); }

    const [acctRes, uploadRes, assetRes, txnRes, invRes, snapRes, bizRes, coRes, polRes, homeRes, utilRes, lifeRes, taskRes, eventRes, kidsRes, gradesRes, milesRes, scoreRes, prayerRes, famRes, checkinRes, suppRes, mealRes, bwRes, mbRes, dlRes, blRes, linksRes, goalsRes, habitsRes, habitLogsRes, learningRes, uploadLogsRes, bizReportsRes, bizGoalsRes, bizMilestonesRes, bizTeamRes, funnelPresetsRes, funnelInflowsRes, teamMembersRes, appUsersRes, robotsRes, staffRes, orgsRes, orgMembersRes, orgInvitesRes, candidatesRes, contactsRes, cuSpacesRes, cuFoldersRes, cuListsRes, cuTasksRes] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: true }),
      supabase.from("statement_uploads").select("*").order("uploaded_at", { ascending: false }).limit(50),
      supabase.from("assets").select("*").order("created_at", { ascending: true }),
      supabase.from("transactions").select("*").order("date", { ascending: false }).limit(2000),
      supabase.from("investments").select("*").order("created_at", { ascending: true }),
      supabase.from("net_worth_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(100),
      supabase.from("businesses").select("*").order("created_at", { ascending: true }),
      supabase.from("companies").select("*").order("name", { ascending: true }),
      supabase.from("insurance_policies").select("*").order("created_at", { ascending: true }),
      supabase.from("homes").select("*").order("created_at", { ascending: true }),
      supabase.from("utility_bills").select("*").order("created_at", { ascending: false }),
      supabase.from("life_expenses").select("*").order("date", { ascending: false }).limit(500),
      supabase.from("planner_tasks").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("calendar_events").select("*").order("event_date", { ascending: true }).limit(500),
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
      supabase.from("saved_links").select("*").order("created_at", { ascending: false }),
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("habits").select("*").order("created_at", { ascending: true }),
      supabase.from("habit_logs").select("*").order("date", { ascending: false }).limit(1000),
      supabase.from("learning_items").select("*").order("created_at", { ascending: false }),
      supabase.from("upload_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("business_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("business_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("business_milestones").select("*").order("date", { ascending: false }),
      supabase.from("business_team").select("*").order("created_at", { ascending: true }),
      supabase.from("funnel_presets").select("*").order("created_at", { ascending: true }),
      supabase.from("funnel_inflows").select("*").order("date", { ascending: false }),
      supabase.from("team_members").select("*").order("created_at", { ascending: true }),
      supabase.from("app_users").select("*").order("created_at", { ascending: true }),
      supabase.from("robots").select("*").order("created_at", { ascending: true }),
      supabase.from("staff_members").select("*").order("name", { ascending: true }),
      supabase.from("organizations").select("*"),
      supabase.from("org_members").select("*"),
      supabase.from("org_invites").select("*").order("created_at", { ascending: false }),
      supabase.from("project_candidates").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("name", { ascending: true }),
      supabase.from("cu_spaces").select("*").order("created_at", { ascending: true }),
      supabase.from("cu_folders").select("*").order("created_at", { ascending: true }),
      supabase.from("cu_lists").select("*").order("created_at", { ascending: true }),
      supabase.from("cu_tasks").select("*").order("created_at", { ascending: true }),
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
    if (linksRes.data) setSavedLinks(linksRes.data);
    if (goalsRes.data) setGoals(goalsRes.data);
    if (habitsRes.data) setHabits(habitsRes.data);
    if (habitLogsRes.data) setHabitLogs(habitLogsRes.data);
    if (learningRes.data) setLearningItems(learningRes.data);
    if (uploadLogsRes.data) setUploadLogs(uploadLogsRes.data);
    if (bizReportsRes.data) setBusinessReports(bizReportsRes.data);
    if (bizGoalsRes.data) setBizGoals(bizGoalsRes.data);
    if (bizMilestonesRes.data) setBizMilestones(bizMilestonesRes.data);
    if (bizTeamRes.data) setBizTeam(bizTeamRes.data);
    if (funnelPresetsRes.data) setFunnelPresets(funnelPresetsRes.data);
    if (funnelInflowsRes.data) setFunnelInflows(funnelInflowsRes.data);
    if (teamMembersRes.data) setTeamMembers(teamMembersRes.data);
    if (appUsersRes.data) setAppUsers(appUsersRes.data);
    if (robotsRes.data) setRobots(robotsRes.data);
    if (staffRes.data) setStaffMembers(staffRes.data);
    if (orgsRes.data) setOrgs(orgsRes.data);
    if (orgMembersRes.data) setOrgMembers(orgMembersRes.data);
    if (orgInvitesRes.data) setOrgInvites(orgInvitesRes.data);
    if (candidatesRes.data) setProjectCandidates(candidatesRes.data);
    if (contactsRes.data) setContacts(contactsRes.data);

    // Check Gmail connection
    try {
      const { data: gmailToken, error: gmailErr } = await supabase.from("gmail_tokens").select("email").eq("user_id", session.user.id).maybeSingle();
      console.log("Gmail check:", gmailToken, gmailErr);
      if (gmailToken?.email) { setGmailConnected(true); setGmailEmail(gmailToken.email); }
    } catch (e) { console.error("Gmail check failed:", e); }
    if (cuSpacesRes.data) setCuSpaces(cuSpacesRes.data);
    if (cuFoldersRes.data) setCuFolders(cuFoldersRes.data);
    if (cuListsRes.data) setCuLists(cuListsRes.data);
    if (cuTasksRes.data) setCuTasks(cuTasksRes.data);
    setDataLoading(false);

    // Save cache for instant load next time
    try {
      const cacheData = {
        accounts: acctRes.data || [],
        transactions: txnRes.data || [],
        assets: assetRes.data || [],
        investments: invRes.data || [],
        businesses: bizRes.data || [],
        companies: coRes.data || [],
        policies: polRes.data || [],
        homes: homeRes.data || [],
        utilityBills: utilRes.data || [],
        lifeExpenses: lifeRes.data || [],
        plannerTasks: taskRes.data || [],
        calendarEvents: eventRes.data || [],
        kids: kidsRes.data || [],
        monthlyBills: mbRes.data || [],
        savedLinks: linksRes.data || [],
        goals: goalsRes.data || [],
        habits: habitsRes.data || [],
        cuSpaces: cuSpacesRes.data || [],
        cuFolders: cuFoldersRes.data || [],
        cuLists: cuListsRes.data || [],
        cuTasks: cuTasksRes.data || [],
        robots: robotsRes.data || [],
      };
      localStorage.setItem(`sz_cache_${session.user.id}`, JSON.stringify(cacheData));
    } catch (e) { console.warn("Cache save failed:", e); }
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
  const handleUpdateTransaction = async (id, form) => { const { data, error } = await supabase.from("transactions").update(form).eq("id", id).select().single(); if (!error && data) setTransactions((p) => p.map((t) => t.id === id ? data : t)); };
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
  const handleAddKid = async (form) => { const { data, error } = await supabase.from("kids").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error("Add kid error:", error); alert("Error: " + error.message); } else if (data) setKids((p) => [...p, data]); };
  const handleUpdateKid = async (id, form) => { const { data, error } = await supabase.from("kids").update(form).eq("id", id).select().single(); if (!error && data) setKids((p) => p.map((k) => k.id === id ? data : k)); };
  const handleDeleteKid = async (id) => { const { error } = await supabase.from("kids").delete().eq("id", id); if (!error) { setKids((p) => p.filter((k) => k.id !== id)); setKidGrades((p) => p.filter((g) => g.kid_id !== id)); setKidMilestones((p) => p.filter((m) => m.kid_id !== id)); } };
  const handleAddKidGrade = async (form) => { const { data, error } = await supabase.from("kid_grades").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setKidGrades((p) => [data, ...p]); };
  const handleDeleteKidGrade = async (id) => { const { error } = await supabase.from("kid_grades").delete().eq("id", id); if (!error) setKidGrades((p) => p.filter((g) => g.id !== id)); };
  const handleAddKidMilestone = async (form) => { const { data, error } = await supabase.from("kid_milestones").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setKidMilestones((p) => [data, ...p]); };
  const handleDeleteKidMilestone = async (id) => { const { error } = await supabase.from("kid_milestones").delete().eq("id", id); if (!error) setKidMilestones((p) => p.filter((m) => m.id !== id)); };
  const handleUpdateKidMilestone = async (id, form) => { const { data, error } = await supabase.from("kid_milestones").update(form).eq("id", id).select().single(); if (!error && data) setKidMilestones((p) => p.map((m) => m.id === id ? data : m)); };
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
  const handleAddLink = async (form) => { const { data, error } = await supabase.from("saved_links").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setSavedLinks((p) => [data, ...p]); };
  const handleDeleteLink = async (id) => { const { error } = await supabase.from("saved_links").delete().eq("id", id); if (!error) setSavedLinks((p) => p.filter((l) => l.id !== id)); };
  const handleAddGoal = async (form) => { const { data, error } = await supabase.from("goals").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setGoals((p) => [data, ...p]); };
  const handleUpdateGoal = async (id, form) => { const { data, error } = await supabase.from("goals").update(form).eq("id", id).select().single(); if (!error && data) setGoals((p) => p.map((g) => g.id === id ? data : g)); };
  const handleDeleteGoal = async (id) => { const { error } = await supabase.from("goals").delete().eq("id", id); if (!error) setGoals((p) => p.filter((g) => g.id !== id)); };
  const handleAddHabit = async (form) => { const { data, error } = await supabase.from("habits").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setHabits((p) => [...p, data]); };
  const handleDeleteHabit = async (id) => { const { error } = await supabase.from("habits").delete().eq("id", id); if (!error) setHabits((p) => p.filter((h) => h.id !== id)); };
  const handleAddHabitLog = async (form) => { const { data, error } = await supabase.from("habit_logs").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setHabitLogs((p) => [data, ...p]); };
  const handleDeleteHabitLog = async (id) => { const { error } = await supabase.from("habit_logs").delete().eq("id", id); if (!error) setHabitLogs((p) => p.filter((l) => l.id !== id)); };
  const handleAddLearning = async (form) => { const { data, error } = await supabase.from("learning_items").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setLearningItems((p) => [data, ...p]); };
  const handleUpdateLearning = async (id, form) => { const { data, error } = await supabase.from("learning_items").update(form).eq("id", id).select().single(); if (!error && data) setLearningItems((p) => p.map((l) => l.id === id ? data : l)); };
  const handleDeleteLearning = async (id) => { const { error } = await supabase.from("learning_items").delete().eq("id", id); if (!error) setLearningItems((p) => p.filter((l) => l.id !== id)); };
  const handleLogUpload = async (form) => { const { data, error } = await supabase.from("upload_logs").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setUploadLogs((p) => [data, ...p]); };
  const handleAddReport = async (form) => { const { data, error } = await supabase.from("business_reports").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setBusinessReports((p) => [data, ...p]); };
  const handleUpdateReport = async (id, form) => { const { data, error } = await supabase.from("business_reports").update(form).eq("id", id).select().single(); if (!error && data) setBusinessReports((p) => p.map((r) => r.id === id ? data : r)); };
  const handleDeleteReport = async (id) => { const { error } = await supabase.from("business_reports").delete().eq("id", id); if (!error) setBusinessReports((p) => p.filter((r) => r.id !== id)); };
  const handleAddBizGoal = async (form) => { const { data, error } = await supabase.from("business_goals").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setBizGoals((p) => [data, ...p]); };
  const handleUpdateBizGoal = async (id, form) => { const { data, error } = await supabase.from("business_goals").update(form).eq("id", id).select().single(); if (!error && data) setBizGoals((p) => p.map((g) => g.id === id ? data : g)); };
  const handleDeleteBizGoal = async (id) => { const { error } = await supabase.from("business_goals").delete().eq("id", id); if (!error) setBizGoals((p) => p.filter((g) => g.id !== id)); };
  const handleAddBizMilestone = async (form) => { const { data, error } = await supabase.from("business_milestones").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setBizMilestones((p) => [data, ...p]); };
  const handleDeleteBizMilestone = async (id) => { const { error } = await supabase.from("business_milestones").delete().eq("id", id); if (!error) setBizMilestones((p) => p.filter((m) => m.id !== id)); };
  const handleAddBizTeam = async (form) => { const { data, error } = await supabase.from("business_team").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setBizTeam((p) => [...p, data]); };
  const handleUpdateBizTeam = async (id, form) => { const { data, error } = await supabase.from("business_team").update(form).eq("id", id).select().single(); if (!error && data) setBizTeam((p) => p.map((t) => t.id === id ? data : t)); };
  const handleDeleteBizTeam = async (id) => { const { error } = await supabase.from("business_team").delete().eq("id", id); if (!error) setBizTeam((p) => p.filter((t) => t.id !== id)); };

  // Money Funnel CRUD
  const handleAddFunnelPreset = async (form) => { const { data, error } = await supabase.from("funnel_presets").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setFunnelPresets((p) => [...p, data]); };
  const handleUpdateFunnelPreset = async (id, form) => { const { data, error } = await supabase.from("funnel_presets").update(form).eq("id", id).select().single(); if (!error && data) setFunnelPresets((p) => p.map((x) => x.id === id ? data : x)); };
  const handleDeleteFunnelPreset = async (id) => { const { error } = await supabase.from("funnel_presets").delete().eq("id", id); if (!error) setFunnelPresets((p) => p.filter((x) => x.id !== id)); };
  const handleAddFunnelInflow = async (form) => { const { data, error } = await supabase.from("funnel_inflows").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setFunnelInflows((p) => [data, ...p]); };
  const handleUpdateFunnelInflow = async (id, form) => { const { data, error } = await supabase.from("funnel_inflows").update(form).eq("id", id).select().single(); if (!error && data) setFunnelInflows((p) => p.map((x) => x.id === id ? data : x)); };
  const handleDeleteFunnelInflow = async (id) => { const { error } = await supabase.from("funnel_inflows").delete().eq("id", id); if (!error) setFunnelInflows((p) => p.filter((x) => x.id !== id)); };
  const handleAddTeamMember = async (form) => { const { data, error } = await supabase.from("team_members").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setTeamMembers((p) => [...p, data]); };
  const handleUpdateTeamMember = async (id, form) => { const { data, error } = await supabase.from("team_members").update(form).eq("id", id).select().single(); if (!error && data) setTeamMembers((p) => p.map((x) => x.id === id ? data : x)); };
  const handleDeleteTeamMember = async (id) => { const { error } = await supabase.from("team_members").delete().eq("id", id); if (!error) setTeamMembers((p) => p.filter((x) => x.id !== id)); };

  // Robots CRUD
  const handleAddRobot = async (form) => { const { data, error } = await supabase.from("robots").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setRobots((p) => [...p, data]); };
  const handleUpdateRobot = async (id, form) => { const { data, error } = await supabase.from("robots").update({ ...form, updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (!error && data) setRobots((p) => p.map((x) => x.id === id ? data : x)); };
  const handleDeleteRobot = async (id) => { const { error } = await supabase.from("robots").delete().eq("id", id); if (!error) setRobots((p) => p.filter((x) => x.id !== id)); };

  // Staff CRUD
  const handleAddStaff = async (form) => { const { data, error } = await supabase.from("staff_members").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setStaffMembers((p) => [...p, data]); };
  const handleUpdateStaff = async (id, form) => { const { data, error } = await supabase.from("staff_members").update({ ...form, updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (!error && data) setStaffMembers((p) => p.map((x) => x.id === id ? data : x)); };
  const handleDeleteStaff = async (id) => { const { error } = await supabase.from("staff_members").delete().eq("id", id); if (!error) setStaffMembers((p) => p.filter((x) => x.id !== id)); };

  // Org member CRUD
  const handleUpdateOrgMember = async (id, form) => { const { data, error } = await supabase.from("org_members").update(form).eq("id", id).select().single(); if (!error && data) setOrgMembers((p) => p.map((x) => x.id === id ? data : x)); };
  const handleRemoveOrgMember = async (id) => { const { error } = await supabase.from("org_members").delete().eq("id", id); if (!error) setOrgMembers((p) => p.filter((x) => x.id !== id)); };
  const handleInviteToOrg = async (form) => { const { data, error } = await supabase.from("org_invites").insert({ ...form, invited_by: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setOrgInvites((p) => [data, ...p]); };
  const handleDeleteInvite = async (id) => { const { error } = await supabase.from("org_invites").delete().eq("id", id); if (!error) setOrgInvites((p) => p.filter((x) => x.id !== id)); };
  const handleAddOrgMember = async (form) => { const { data, error } = await supabase.from("org_members").insert(form).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setOrgMembers((p) => [...p, data]); };

  // Project Candidates CRUD
  const handleAddCandidate = async (form) => { const { data, error } = await supabase.from("project_candidates").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setProjectCandidates((p) => [data, ...p]); };
  const handleUpdateCandidate = async (id, form) => { const { data, error } = await supabase.from("project_candidates").update(form).eq("id", id).select().single(); if (!error && data) setProjectCandidates((p) => p.map((x) => x.id === id ? data : x)); };
  const handleDeleteCandidate = async (id) => { const { error } = await supabase.from("project_candidates").delete().eq("id", id); if (!error) setProjectCandidates((p) => p.filter((x) => x.id !== id)); };

  // Contacts CRUD
  const handleAddContact = async (form) => { const { data, error } = await supabase.from("contacts").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert(error.message?.includes("duplicate") ? "Contact with this phone number already exists" : "Error: " + error.message); return null; } if (data) setContacts((p) => [...p, data]); return data; };
  const handleUpdateContact = async (id, form) => { const { data, error } = await supabase.from("contacts").update({ ...form, updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (!error && data) setContacts((p) => p.map((x) => x.id === id ? data : x)); };
  const handleDeleteContact = async (id) => { const { error } = await supabase.from("contacts").delete().eq("id", id); if (!error) setContacts((p) => p.filter((x) => x.id !== id)); };

  // ClickUp CRUD
  const handleAddSpace = async (form) => { const { data, error } = await supabase.from("cu_spaces").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setCuSpaces((p) => [...p, data]); };
  const handleUpdateSpace = async (id, form) => { const { data, error } = await supabase.from("cu_spaces").update(form).eq("id", id).select().single(); if (!error && data) setCuSpaces((p) => p.map((s) => s.id === id ? data : s)); };
  const handleDeleteSpace = async (id) => { const { error } = await supabase.from("cu_spaces").delete().eq("id", id); if (!error) setCuSpaces((p) => p.filter((s) => s.id !== id)); };
  const handleAddFolder = async (form) => { const { data, error } = await supabase.from("cu_folders").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setCuFolders((p) => [...p, data]); };
  const handleUpdateFolder = async (id, form) => { const { data, error } = await supabase.from("cu_folders").update(form).eq("id", id).select().single(); if (!error && data) setCuFolders((p) => p.map((f) => f.id === id ? data : f)); };
  const handleDeleteFolder = async (id) => { const { error } = await supabase.from("cu_folders").delete().eq("id", id); if (!error) setCuFolders((p) => p.filter((f) => f.id !== id)); };
  const handleAddList = async (form) => { const { data, error } = await supabase.from("cu_lists").insert({ ...form, user_id: session.user.id }).select().single(); if (!error && data) setCuLists((p) => [...p, data]); };
  const handleUpdateList = async (id, form) => { const { data, error } = await supabase.from("cu_lists").update(form).eq("id", id).select().single(); if (!error && data) setCuLists((p) => p.map((l) => l.id === id ? data : l)); };
  const handleDeleteList = async (id) => { const { error } = await supabase.from("cu_lists").delete().eq("id", id); if (!error) setCuLists((p) => p.filter((l) => l.id !== id)); };
  const handleAddTask2 = async (form) => { const { data, error } = await supabase.from("cu_tasks").insert({ ...form, user_id: session.user.id }).select().single(); if (error) { console.error(error); alert("Error: " + error.message); } else if (data) setCuTasks((p) => [...p, data]); return data; };
  const handleUpdateTask2 = async (id, form) => { const { data, error } = await supabase.from("cu_tasks").update(form).eq("id", id).select().single(); if (!error && data) setCuTasks((p) => p.map((t) => t.id === id ? data : t)); };
  const handleDeleteTask2 = async (id) => { const { error } = await supabase.from("cu_tasks").delete().eq("id", id); if (!error) setCuTasks((p) => p.filter((t) => t.id !== id && t.parent_task_id !== id)); };
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
    { id: "finance", label: "Finance", icon: <span style={{ fontSize: 18 }}>💰</span> },
    { id: "business", label: "Business", icon: <span style={{ fontSize: 18 }}>💼</span> },
    { id: "clickup", label: "ClickUp", icon: <span style={{ fontSize: 18 }}>📋</span> },
    { id: "growth", label: "Outreach", icon: <span style={{ fontSize: 18 }}>📡</span> },
    { id: "team", label: "Team", icon: <span style={{ fontSize: 18 }}>👥</span> },
    { id: "projects", label: "Special Projects", icon: <span style={{ fontSize: 18 }}>🎬</span> },
  ];

  const mobileNavItems = [
    { id: "life", label: "Life", icon: <span style={{ fontSize: 18 }}>🌳</span> },
    { id: "finance", label: "Finance", icon: <span style={{ fontSize: 18 }}>💰</span> },
    { id: "overview", label: "", featured: true, icon: <span style={{ fontSize: 20 }}>🌍</span> },
    { id: "clickup", label: "ClickUp", icon: <span style={{ fontSize: 18 }}>📋</span> },
    { id: "growth", label: "Outreach", icon: <span style={{ fontSize: 18 }}>📡</span> },
  ];

  const renderPage = () => {
    if (dataLoading) return (<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}><Spinner /></div>);
    if (showProfile) return <ProfileView session={session} isMobile={isMobile} onSignOut={handleSignOut} uploadLogs={uploadLogs} teamMembers={teamMembers} appUsers={appUsers} robots={robots} orgs={orgs} orgMembers={orgMembers} orgInvites={orgInvites} onAddTeamMember={handleAddTeamMember} onUpdateTeamMember={handleUpdateTeamMember} onDeleteTeamMember={handleDeleteTeamMember} onAddRobot={handleAddRobot} onUpdateRobot={handleUpdateRobot} onDeleteRobot={handleDeleteRobot} onUpdateOrgMember={handleUpdateOrgMember} onRemoveOrgMember={handleRemoveOrgMember} onInviteToOrg={handleInviteToOrg} onDeleteInvite={handleDeleteInvite} onAddOrgMember={handleAddOrgMember} />;
    switch (activeNav) {
      case "overview": return <OverviewView isMobile={isMobile} session={session} accounts={accounts} uploads={uploads} assets={assets} transactions={transactions} investments={investments} lifeExpenses={lifeExpenses} homes={homes} utilityBills={utilityBills} policies={policies} monthlyBills={monthlyBills} onNavigate={navigate} />;
      case "finance": return <FinanceView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} transactions={transactions} accounts={accounts} uploads={uploads} lifeExpenses={lifeExpenses} assets={assets} investments={investments} snapshots={snapshots} monthlyBills={monthlyBills} policies={policies} homes={homes} utilityBills={utilityBills} businesses={businesses} funnelPresets={funnelPresets} funnelInflows={funnelInflows} onAddFunnelPreset={handleAddFunnelPreset} onUpdateFunnelPreset={handleUpdateFunnelPreset} onDeleteFunnelPreset={handleDeleteFunnelPreset} onAddFunnelInflow={handleAddFunnelInflow} onUpdateFunnelInflow={handleUpdateFunnelInflow} onDeleteFunnelInflow={handleDeleteFunnelInflow} onAddAccount={handleAddAccount} onToggleAccount={handleToggleAccount} onDeleteAccount={handleDeleteAccount} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} onAddLifeExpense={handleAddLifeExpense} onDeleteLifeExpense={handleDeleteLifeExpense} onUpload={handleUpload} onDeleteUpload={handleDeleteUpload} onAddAsset={handleAddAsset} onUpdateAsset={handleUpdateAsset} onDeleteAsset={handleDeleteAsset} onAddInvestment={handleAddInvestment} onUpdateInvestment={handleUpdateInvestment} onDeleteInvestment={handleDeleteInvestment} onAddSnapshot={handleAddSnapshot} onDeleteSnapshot={handleDeleteSnapshot} onAddMonthlyBill={handleAddMonthlyBill} onUpdateMonthlyBill={handleUpdateMonthlyBill} onDeleteMonthlyBill={handleDeleteMonthlyBill} onAddPolicy={handleAddPolicy} onUpdatePolicy={handleUpdatePolicy} onDeletePolicy={handleDeletePolicy} onAddHome={handleAddHome} onUpdateHome={handleUpdateHome} onDeleteHome={handleDeleteHome} onAddBill={handleAddUtilityBill} onUpdateBill={handleUpdateUtilityBill} onDeleteBill={handleDeleteUtilityBill} onLogUpload={handleLogUpload} />;
      case "business": return <BusinessView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} businesses={businesses} transactions={transactions} companies={companies} policies={policies} reports={businessReports} bizGoals={bizGoals} bizMilestones={bizMilestones} bizTeam={bizTeam} session={session} onAddBusiness={handleAddBusiness} onUpdateBusiness={handleUpdateBusiness} onDeleteBusiness={handleDeleteBusiness} onAddCompany={handleAddCompany} onUpdateCompany={handleUpdateCompany} onDeleteCompany={handleDeleteCompany} onAddPolicy={handleAddPolicy} onUpdatePolicy={handleUpdatePolicy} onDeletePolicy={handleDeletePolicy} onAddReport={handleAddReport} onUpdateReport={handleUpdateReport} onDeleteReport={handleDeleteReport} onAddBizGoal={handleAddBizGoal} onUpdateBizGoal={handleUpdateBizGoal} onDeleteBizGoal={handleDeleteBizGoal} onAddBizMilestone={handleAddBizMilestone} onDeleteBizMilestone={handleDeleteBizMilestone} onAddTeam={handleAddBizTeam} onUpdateTeam={handleUpdateBizTeam} onDeleteTeam={handleDeleteBizTeam} />;
      case "life": return <LifeConsolidatedView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} homes={homes} utilityBills={utilityBills} calendarEvents={calendarEvents} plannerTasks={plannerTasks} monthlyBills={monthlyBills} kids={kids} grades={kidGrades} milestones={kidMilestones} prayers={prayers} session={session} familyMembers={familyMembers} checkins={healthCheckins} supplements={supplements} meals={mealEntries} bloodWork={bloodWork} scorecards={scorecards} doseLogs={doseLogs} bodyLogs={bodyLogs} onAddHome={handleAddHome} onUpdateHome={handleUpdateHome} onDeleteHome={handleDeleteHome} onAddBill={handleAddUtilityBill} onUpdateBill={handleUpdateUtilityBill} onDeleteBill={handleDeleteUtilityBill} onAddEvent={handleAddEvent} onDeleteEvent={handleDeleteEvent} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onAddMonthlyBill={handleAddMonthlyBill} onUpdateMonthlyBill={handleUpdateMonthlyBill} onDeleteMonthlyBill={handleDeleteMonthlyBill} onAddKid={handleAddKid} onUpdateKid={handleUpdateKid} onDeleteKid={handleDeleteKid} onAddGrade={handleAddKidGrade} onDeleteGrade={handleDeleteKidGrade} onAddMilestone={handleAddKidMilestone} onUpdateMilestone={handleUpdateKidMilestone} onDeleteMilestone={handleDeleteKidMilestone} onAddPrayer={handleAddPrayer} onUpdatePrayer={handleUpdatePrayer} onDeletePrayer={handleDeletePrayer} onAddMember={handleAddFamilyMember} onAddCheckin={handleAddCheckin} onDeleteCheckin={handleDeleteCheckin} onAddSupplement={handleAddSupplement} onUpdateSupplement={handleUpdateSupplement} onDeleteSupplement={handleDeleteSupplement} onAddMeal={handleAddMeal} onDeleteMeal={handleDeleteMeal} onAddBloodWork={handleAddBloodWork} onDeleteBloodWork={handleDeleteBloodWork} onAddScorecard={handleAddScorecard} onDeleteScorecard={handleDeleteScorecard} onAddDoseLog={handleAddDoseLog} onDeleteDoseLog={handleDeleteDoseLog} onAddBodyLog={handleAddBodyLog} onDeleteBodyLog={handleDeleteBodyLog} savedLinks={savedLinks} onAddLink={handleAddLink} onDeleteLink={handleDeleteLink} goals={goals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} habits={habits} habitLogs={habitLogs} onAddHabit={handleAddHabit} onDeleteHabit={handleDeleteHabit} onAddHabitLog={handleAddHabitLog} onDeleteHabitLog={handleDeleteHabitLog} learningItems={learningItems} onAddLearning={handleAddLearning} onUpdateLearning={handleUpdateLearning} onDeleteLearning={handleDeleteLearning} />;
      case "growth": return <OutreachView isMobile={isMobile} activeTab={activeTab} onTabChange={handleTabChange} companies={companies} onAddCompany={handleAddCompany} onUpdateCompany={handleUpdateCompany} onDeleteCompany={handleDeleteCompany} contacts={contacts} onAddContact={handleAddContact} onUpdateContact={handleUpdateContact} onDeleteContact={handleDeleteContact} session={session} robots={robots} gmailConnected={gmailConnected} gmailEmail={gmailEmail} onGmailConnect={() => {
        supabase.functions.invoke("gmail-auth", { body: { user_id: session.user.id } }).then(({ data }) => { if (data?.url) window.open(data.url, "_blank", "width=600,height=700"); });
      }} onGmailRefresh={async () => {
        const { data: gt } = await supabase.from("gmail_tokens").select("email").eq("user_id", session.user.id).single();
        if (gt?.email) { setGmailConnected(true); setGmailEmail(gt.email); }
      }} />;
      case "clickup": return <ClickUpView isMobile={isMobile} spaces={cuSpaces} folders={cuFolders} lists={cuLists} tasks={cuTasks} onAddSpace={handleAddSpace} onUpdateSpace={handleUpdateSpace} onDeleteSpace={handleDeleteSpace} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddList={handleAddList} onUpdateList={handleUpdateList} onDeleteList={handleDeleteList} onAddTask={handleAddTask2} onUpdateTask={handleUpdateTask2} onDeleteTask={handleDeleteTask2} />;
      case "team": return <TeamView isMobile={isMobile} staff={staffMembers} businesses={businesses} onAdd={handleAddStaff} onUpdate={handleUpdateStaff} onDelete={handleDeleteStaff} />;
      case "projects": return <SpecialProjectsView isMobile={isMobile} candidates={projectCandidates} onAdd={handleAddCandidate} onUpdate={handleUpdateCandidate} onDelete={handleDeleteCandidate} />;
      default: return null;
    }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100dvh", minHeight: "100vh", background: "#f8fafc", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
        {!isMobile && (
          <div style={{ width: 60, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 70px", flexShrink: 0, height: "100%", position: "relative" }}>
            <SuarezLogo size={36} />
            <div style={{ height: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%", overflowY: "auto", flex: 1 }}>
              {navItems.map((item) => (
                <button key={item.id} onClick={() => navigate(item.id)} title={item.label} style={{
                  width: 40, height: 40, borderRadius: 10, border: "none",
                  background: activeNav === item.id && !showProfile ? "linear-gradient(135deg, #16a34a, #15803d)" : "transparent",
                  color: activeNav === item.id && !showProfile ? "#fff" : "#94a3b8",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                  boxShadow: activeNav === item.id && !showProfile ? "0 2px 8px rgba(22,163,74,0.3)" : "none", flexShrink: 0,
                }}>{item.icon}</button>
              ))}
            </div>
            <button onClick={() => navigate("profile")} title={`${initials} · Owner`} style={{
              position: "absolute", bottom: "max(20px, env(safe-area-inset-bottom, 20px))", left: 10,
              width: 40, height: 40, borderRadius: 12,
              background: showProfile ? "linear-gradient(135deg, #1C3820, #15803d)" : "linear-gradient(135deg, #1C3820, #0f1f12)",
              border: showProfile ? "2px solid #D4C08C" : "2px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#D4C08C", fontFamily: "'Playfair Display', serif", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(28,56,32,0.4)", zIndex: 10,
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
            <button onClick={() => navigate("profile")} title="Profile" style={{
              width: 40, height: 40, borderRadius: 12,
              background: showProfile ? "linear-gradient(135deg, #1C3820, #15803d)" : "linear-gradient(135deg, #1C3820, #0f1f12)",
              border: showProfile ? "2px solid #D4C08C" : "2px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#D4C08C", fontFamily: "'Playfair Display', serif", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(28,56,32,0.25)", padding: 0,
            }}>{initials}</button>
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
// v2
