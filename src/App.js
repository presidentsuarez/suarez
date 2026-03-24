import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   SUAREZ — Life & Business Management App
   Clean working build — Demo Mode
   ═══════════════════════════════════════════════════════════ */

const DEMO_SESSION = {
  user: {
    email: "javier@suarez.com",
    user_metadata: { full_name: "Javier Suarez" },
    app_metadata: { provider: "email" },
    created_at: new Date().toISOString(),
  },
};

const fmtUserName = (email) => {
  if (!email) return "—";
  if (!email.includes("@")) return email;
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

/* ─── DEMO DATA ─────────────────────────────────────────── */

const DEMO_ACCOUNTS = [
  { id: "1", name: "Chase Business Checking", type: "Checking", institution: "Chase", visibility: "business", active: true },
  { id: "2", name: "Amex Platinum", type: "Credit Card", institution: "American Express", visibility: "business", active: true },
  { id: "3", name: "Personal Savings", type: "Savings", institution: "Ally Bank", visibility: "personal", active: true },
  { id: "4", name: "Schwab Brokerage", type: "Investment", institution: "Charles Schwab", visibility: "personal", active: true },
];

const DEMO_UPLOADS = [
  { id: "u1", account_id: "1", month: "January", quarter: "Q1", year: 2026, filename: "chase_jan_2026.pdf", uploaded_at: "2026-02-03T10:30:00Z" },
  { id: "u2", account_id: "1", month: "February", quarter: "Q1", year: 2026, filename: "chase_feb_2026.pdf", uploaded_at: "2026-03-05T14:15:00Z" },
  { id: "u3", account_id: "2", month: "January", quarter: "Q1", year: 2026, filename: "amex_jan_2026.pdf", uploaded_at: "2026-02-10T09:00:00Z" },
  { id: "u4", account_id: "3", month: "January", quarter: "Q1", year: 2026, filename: "ally_jan_2026.pdf", uploaded_at: "2026-02-08T11:45:00Z" },
];

/* ─── GLOBAL STYLES ─────────────────────────────────────── */

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; }
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
  <div style={{ width: size, height: size, borderRadius: size * 0.24, background: "linear-gradient(135deg, #16a34a, #15803d)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(22,163,74,0.3)", flexShrink: 0 }}>
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
  </div>
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

const GreenButton = ({ children, onClick, small, style: extraStyle }) => (
  <button onClick={onClick} style={{
    background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none",
    borderRadius: small ? 8 : 10, padding: small ? "9px 18px" : "12px 28px",
    color: "#fff", fontSize: small ? 13 : 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 6,
    boxShadow: "0 2px 10px rgba(22,163,74,0.35)", whiteSpace: "nowrap", ...extraStyle,
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
};

/* ═══════════════════════════════════════════════════════════
   AUTH SCREEN
   ═══════════════════════════════════════════════════════════ */

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error] = useState("");
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

  const doAuth = () => onAuth(DEMO_SESSION.user);
  const switchMode = (m) => { setMode(m); setSuccess(""); setEmail(""); setPassword(""); setName(""); };

  const inputStyle = { width: "100%", padding: "13px 16px", fontSize: 15, fontFamily: "'DM Sans', sans-serif", border: "1.5px solid #DCE4DF", borderRadius: 10, outline: "none", transition: "all 0.2s", background: "#fff", color: "#1A2E22", boxSizing: "border-box" };

  const formContent = (
    <div>
      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "#DC2626" }}>{error}</div>}
      {success && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "#0B3D2C" }}>{success}</div>}

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
          <input className="sz-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && doAuth()} style={inputStyle} />
        </div>
      )}

      <button onClick={mode === "forgot" ? () => setSuccess("Demo mode — no email sent.") : doAuth} onMouseEnter={() => setHoverBtn(true)} onMouseLeave={() => setHoverBtn(false)} style={{
        width: "100%", padding: "14px 20px", marginTop: 24,
        background: hoverBtn ? "#0E4D37" : "#0B3D2C", color: "#fff", fontSize: 15, fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif", border: "none", borderRadius: 10, cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)", display: "flex", alignItems: "center", justifyContent: "center",
        transform: hoverBtn ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hoverBtn ? "0 6px 20px rgba(11,61,44,0.35)" : "0 2px 8px rgba(11,61,44,0.15)",
      }}>
        {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
        <div style={{ flex: 1, height: 1, background: "#E8ECE9" }} />
        <span style={{ fontSize: 11, color: "#8A9B91", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "#E8ECE9" }} />
      </div>

      <button onClick={doAuth} onMouseEnter={() => setHoverGoogle(true)} onMouseLeave={() => setHoverGoogle(false)} style={{
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

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Profile & Settings" subtitle="Account information" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 640 }}>
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW
   ═══════════════════════════════════════════════════════════ */

function OverviewView({ isMobile, session, onNavigate }) {
  const userName = session?.user?.user_metadata?.full_name || fmtUserName(session?.user?.email) || "there";
  const firstName = userName.split(" ")[0];
  const quarter = getCurrentQuarter();
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const activeAccounts = DEMO_ACCOUNTS.filter((a) => a.active).length;
  const totalSlots = activeAccounts * 3;
  const uploaded = DEMO_UPLOADS.filter((u) => u.quarter === quarter).length;

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title={`${greeting}, ${firstName}`} subtitle={`${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${quarter}`} isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          <StatCard label="Active Accounts" value={activeAccounts} accent="#16a34a" />
          <StatCard label={`${quarter} Statements`} value={`${uploaded} / ${totalSlots}`} accent="#3b82f6" />
          <StatCard label="Business Items" value={DEMO_ACCOUNTS.filter((a) => a.visibility === "business").length} accent="#7c3aed" />
          <StatCard label="Personal Items" value={DEMO_ACCOUNTS.filter((a) => a.visibility === "personal").length} accent="#f59e0b" />
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20 }}>
          <SectionHeader text="Quick Actions" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "Upload Statement", desc: "Add a bank or credit card statement", nav: "financials", icon: Icons.upload(20) },
              { label: "Manage Accounts", desc: "Add or edit financial accounts", nav: "accounts", icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={1.8}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
              { label: "View Dashboard", desc: "See the full quarterly overview", nav: "dashboard", icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={1.8}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
            ].map((a, i) => (
              <div key={i} onClick={() => onNavigate(a.nav)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.background = "#f0fdf4"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{a.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px" }}>
          <SectionHeader text="Recent Activity" />
          {DEMO_UPLOADS.slice(0, 4).map((u) => {
            const acct = DEMO_ACCOUNTS.find((a) => a.id === u.account_id);
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icons.check}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{u.filename}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>{acct?.name} · {u.month} {u.year}</div>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>{fmtDate(u.uploaded_at)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACCOUNTS
   ═══════════════════════════════════════════════════════════ */

function AccountsView({ isMobile, accounts, onAdd, onToggle }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Checking", institution: "", visibility: "business" });

  const types = ["Checking", "Savings", "Credit Card", "Investment", "Business", "Other"];

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onAdd({ ...form, id: Date.now().toString(), active: true });
    setForm({ name: "", type: "Checking", institution: "", visibility: "business" });
    setShowForm(false);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Accounts" subtitle={`${accounts.length} account${accounts.length !== 1 ? "s" : ""} tracked`} isMobile={isMobile}>
        <GreenButton small onClick={() => setShowForm(!showForm)}>{Icons.plus} {isMobile ? "Add" : "Add Account"}</GreenButton>
      </PageHeader>
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #16a34a", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
            <SectionHeader text="New Account" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Account Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Business Checking" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Institution</label>
                <input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. Chase, Amex" style={inputStyle} className="sz-input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Visibility</label>
                <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <GreenButton small onClick={handleSubmit}>Save Account</GreenButton>
            </div>
          </div>
        )}

        {accounts.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={1.5}><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"/><path d="M16 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#16a34a"/></svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Add Your First Account</h3>
            <p style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>Track checking, savings, credit cards, investments, and business accounts — all in one place.</p>
            <GreenButton onClick={() => setShowForm(true)}>{Icons.plus} Add Account</GreenButton>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
            {accounts.map((acct) => (
              <div key={acct.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px", position: "relative", overflow: "hidden", opacity: acct.active ? 1 : 0.5, transition: "opacity 0.2s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: acct.visibility === "business" ? "#16a34a" : "#7c3aed" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{acct.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{acct.institution} · {acct.type}</div>
                  </div>
                  <VisibilityBadge visibility={acct.visibility} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <button onClick={() => onToggle(acct.id)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: acct.active ? "#f0fdf4" : "#f8fafc",
                    fontSize: 11, fontWeight: 600, color: acct.active ? "#16a34a" : "#94a3b8", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>{acct.active ? "● Active" : "○ Inactive"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════ */

function DashboardView({ isMobile, accounts, uploads }) {
  const quarter = getCurrentQuarter();
  const [selectedQ, setSelectedQ] = useState(quarter);
  const activeAccounts = accounts.filter((a) => a.active);
  const qUploads = uploads.filter((u) => u.quarter === selectedQ);
  const totalSlots = activeAccounts.length * 3;
  const pct = totalSlots > 0 ? Math.round((qUploads.length / totalSlots) * 100) : 0;

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Dashboard" subtitle={`Quarterly overview · ${new Date().getFullYear()}`} isMobile={isMobile}>
        <QuarterPicker selected={selectedQ} onChange={setSelectedQ} />
      </PageHeader>
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          <StatCard label="Accounts Tracked" value={activeAccounts.length} accent="#16a34a" />
          <StatCard label={`${selectedQ} Completion`} value={`${pct}%`} accent="#3b82f6" />
          <StatCard label="Uploaded" value={`${qUploads.length} / ${totalSlots}`} accent="#7c3aed" />
          <StatCard label="Remaining" value={totalSlots - qUploads.length} accent="#f59e0b" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{selectedQ} Upload Matrix</div>
            <div style={{ padding: 20, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>Account</th>
                    {QUARTERS[selectedQ].months.map((m) => (
                      <th key={m} style={{ textAlign: "center", padding: "8px 10px", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>{m.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeAccounts.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: "32px 10px", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>Add accounts to see the upload matrix</td></tr>
                  ) : activeAccounts.map((acct) => (
                    <tr key={acct.id}>
                      <td style={{ padding: "10px", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f8fafc", whiteSpace: "nowrap" }}>{acct.name}</td>
                      {QUARTERS[selectedQ].months.map((m) => {
                        const has = qUploads.some((u) => u.account_id === acct.id && u.month === m);
                        return (
                          <td key={m} style={{ padding: "10px", textAlign: "center", borderBottom: "1px solid #f8fafc" }}>
                            {has ? (
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f0fdf4", border: "1.5px solid #16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{Icons.check}</div>
                            ) : (
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f8fafc", border: "1.5px dashed #e2e8f0", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{Icons.clock}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>Recent Uploads</div>
            <div style={{ padding: "12px 20px" }}>
              {qUploads.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  {Icons.file}
                  <p style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", marginTop: 10 }}>No uploads for {selectedQ}</p>
                </div>
              ) : qUploads.map((u) => {
                const acct = accounts.find((a) => a.id === u.account_id);
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icons.check}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.filename}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{acct?.name} · {u.month}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FINANCIALS
   ═══════════════════════════════════════════════════════════ */

function FinancialsView({ isMobile, accounts, uploads, onUpload }) {
  const quarter = getCurrentQuarter();
  const [selectedQ, setSelectedQ] = useState(quarter);
  const activeAccounts = accounts.filter((a) => a.active);

  const handleUpload = (accountId, month) => {
    const acct = accounts.find((a) => a.id === accountId);
    const filename = `${acct?.institution?.toLowerCase() || "stmt"}_${month.toLowerCase().slice(0, 3)}_${new Date().getFullYear()}.pdf`;
    onUpload({
      id: Date.now().toString(),
      account_id: accountId,
      month,
      quarter: selectedQ,
      year: new Date().getFullYear(),
      filename,
      uploaded_at: new Date().toISOString(),
    });
  };

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Financials" subtitle="Upload and track statements by account" isMobile={isMobile}>
        <QuarterPicker selected={selectedQ} onChange={setSelectedQ} />
      </PageHeader>
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {activeAccounts.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>{Icons.upload(28)}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Start Uploading Statements</h3>
            <p style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>Add accounts first, then upload monthly statements here.</p>
          </div>
        ) : (
          activeAccounts.map((acct) => (
            <div key={acct.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 16, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{acct.name}</span>
                  <VisibilityBadge visibility={acct.visibility} />
                </div>
                <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{acct.type}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: 16 }}>
                {QUARTERS[selectedQ].months.map((m) => {
                  const existing = uploads.find((u) => u.account_id === acct.id && u.month === m && u.quarter === selectedQ);
                  return (
                    <div key={m} style={{ padding: 16, borderRadius: 12, border: `1.5px ${existing ? "solid" : "dashed"} ${existing ? "#bbf7d0" : "#e2e8f0"}`, background: existing ? "#f0fdf4" : "#f8fafc", textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>{m}</div>
                      {existing ? (
                        <>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dcfce7", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>{Icons.check}</div>
                          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Uploaded</div>
                          <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{existing.filename}</div>
                        </>
                      ) : (
                        <button onClick={() => handleUpload(acct.id, m)} style={{
                          marginTop: 4, padding: "6px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                          background: "#fff", fontSize: 12, fontWeight: 600, color: "#16a34a", cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                        }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#16a34a"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}>
                          Upload
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════════════════════ */

function SettingsView({ isMobile }) {
  return (
    <div style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
      <PageHeader title="Settings" subtitle="App configuration" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "16px 12px" : "24px 32px", maxWidth: 640 }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20 }}>
          <SectionHeader text="Status" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>Mode</div>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#16a34a", fontFamily: "'DM Mono', monospace" }}>✓ Demo Mode Active</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>Backend</div>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, fontWeight: 600, color: "#f59e0b", fontFamily: "'DM Mono', monospace" }}>⚡ Supabase Pending</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px", marginBottom: 20 }}>
          <SectionHeader text="Permissions Model" />
          <p style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, margin: 0 }}>
            As the owner, you see everything — both <strong style={{ color: "#7c3aed" }}>personal</strong> and <strong style={{ color: "#16a34a" }}>business</strong> data. When you share the app, other users will only see items tagged as business.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? "20px" : "24px 28px" }}>
          <SectionHeader text="Demo Data" />
          <p style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, margin: 0 }}>
            The app is running with sample data — 4 demo accounts and a few uploads. Add accounts, toggle them active/inactive, and simulate uploads from the Financials page. All data is in-memory and resets on reload.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */

export default function SuarezApp() {
  const [session, setSession] = useState(DEMO_SESSION);
  const [activeNav, setActiveNav] = useState("overview");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [accounts, setAccounts] = useState(DEMO_ACCOUNTS);
  const [uploads, setUploads] = useState(DEMO_UPLOADS);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const handleAddAccount = (acct) => setAccounts((prev) => [...prev, acct]);
  const handleToggleAccount = (id) => setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, active: !a.active } : a));
  const handleUpload = (upload) => setUploads((prev) => [...prev, upload]);
  const navigate = (page) => { setActiveNav(page); setShowProfile(false); };

  if (!session) return (
    <>
      <GlobalStyles />
      <AuthScreen onAuth={(user) => setSession({ user })} />
    </>
  );

  const userEmail = session?.user?.email || "";
  const userName = session?.user?.user_metadata?.full_name || fmtUserName(userEmail);
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = [
    { id: "overview", label: "Overview", icon: Icons.grid },
    { id: "accounts", label: "Accounts", icon: Icons.wallet },
    { id: "dashboard", label: "Dashboard", featured: true, icon: Icons.chart },
    { id: "financials", label: "Financials", icon: Icons.upload(18) },
    { id: "settings", label: "Settings", icon: Icons.gear },
  ];

  const renderPage = () => {
    if (showProfile) return <ProfileView session={session} isMobile={isMobile} onSignOut={() => setSession(null)} />;
    switch (activeNav) {
      case "overview": return <OverviewView isMobile={isMobile} session={session} onNavigate={navigate} />;
      case "accounts": return <AccountsView isMobile={isMobile} accounts={accounts} onAdd={handleAddAccount} onToggle={handleToggleAccount} />;
      case "dashboard": return <DashboardView isMobile={isMobile} accounts={accounts} uploads={uploads} />;
      case "financials": return <FinancialsView isMobile={isMobile} accounts={accounts} uploads={uploads} onUpload={handleUpload} />;
      case "settings": return <SettingsView isMobile={isMobile} />;
      default: return null;
    }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", background: "#f8fafc", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Desktop Sidebar */}
        {!isMobile && (
          <div style={{ width: 60, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 6, flexShrink: 0 }}>
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
            <button onClick={() => setShowProfile(true)} title="Profile" style={{
              width: 32, height: 32, borderRadius: "50%",
              background: showProfile ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #3b82f6, #2563eb)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            }}>{initials}</button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", paddingBottom: isMobile ? 70 : 0, paddingTop: isMobile ? 56 : 0 }}>
          {renderPage()}
        </div>

        {/* Mobile Bottom Nav */}
        {isMobile && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 70, background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 4px 6px", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
            {navItems.map((item) => {
              const isActive = activeNav === item.id && !showProfile;
              if (item.featured) {
                return (
                  <button key={item.id} onClick={() => navigate(item.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: -18, WebkitTapHighlightColor: "transparent" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: isActive ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(22,163,74,0.3)", color: "#fff", border: "3px solid #fff", transform: isActive ? "scale(1.08)" : "scale(1)", transition: "transform 0.2s" }}>{item.icon}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: "#16a34a" }}>{item.label}</span>
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

        {/* Mobile Top Header */}
        {isMobile && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 110, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <button onClick={() => setShowMobileMenu(true)} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f172a" }}>{Icons.menu}</button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SuarezLogo size={24} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em" }}>SUAREZ</span>
            </div>
            <div style={{ width: 40 }} />
          </div>
        )}

        {/* Mobile Drawer Overlay */}
        {isMobile && showMobileMenu && (
          <div onClick={() => setShowMobileMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", animation: "fadeIn 0.2s ease" }} />
        )}

        {/* Mobile Drawer */}
        {isMobile && showMobileMenu && (
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 280, background: "#fff", zIndex: 210, display: "flex", flexDirection: "column", animation: "slideInLeft 0.25s cubic-bezier(0.25, 1, 0.5, 1)", boxShadow: "4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SuarezLogo />
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em" }}>SUAREZ</span>
              </div>
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
              <button onClick={() => { setShowProfile(true); setShowMobileMenu(false); }} style={{
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
