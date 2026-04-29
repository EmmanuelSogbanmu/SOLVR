  import { useState, useRef, useEffect } from "react";

const ACCENT = "#00E5A0";
const SCREENS = { LANDING: "landing", AUTH: "auth", PRICING: "pricing", APP: "app" };

const SUPABASE_URL = "https://jueovehsnxtkluyaiqeh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZW92ZWhzbnh0a2x1eWFpcWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjM2OTAsImV4cCI6MjA5Mjg5OTY5MH0.CD9fosokC5n3xMzTekICvap838YxT0B7twPNTT8gjzw";
const PAYSTACK_KEY = "pk_live_15d0e3bdc67102c9719b93f6ae3356f72240fde9";

// Supabase helpers
const sb = {
  async signUp(email, password, name) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password, data: { name } })
    });
    return res.json();
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },
  async getProfile(userId, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    return data[0];
  },
  async createProfile(userId, name, email, token) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id: userId, name, email, plan: "free" })
    });
  },
  async updatePlan(userId, plan, token) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ plan })
    });
  },
  async getHistory(userId, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/history?user_id=eq.${userId}&order=created_at.desc&select=*`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
    return res.json();
  },
  async saveHistory(userId, question, answer, category, token) {
    await fetch(`${SUPABASE_URL}/rest/v1/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, question, answer, category })
    });
  }
};

const features = [
  { icon: "⚡", title: "Instant Answers", desc: "Paste any problem. Get a sharp solution in seconds." },
  { icon: "🎯", title: "Any Category", desc: "Math, Science, Life, Tech, School — we handle all of it." },
  { icon: "🧠", title: "AI-Powered", desc: "Built on Claude, the most intelligent AI assistant available." },
];

const categories = [
  { icon: "📐", label: "Math" },
  { icon: "🧬", label: "Science" },
  { icon: "💡", label: "Life" },
  { icon: "💻", label: "Tech" },
  { icon: "📚", label: "School" },
  { icon: "🔥", label: "Other" },
];

function CountdownTimer() {
  const [time, setTime] = useState({ h: 5, m: 59, s: 47 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const pad = n => String(n).padStart(2, "0");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", padding: "10px 14px", background: "rgba(255,100,80,0.08)", border: "1px solid rgba(255,100,80,0.2)", borderRadius: "10px" }}>
      <span style={{ fontSize: "12px", color: "#ff8866" }}>Offer ends in:</span>
      <span style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 900, fontSize: "16px", color: "#ffaa88", letterSpacing: "2px" }}>
        {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
      </span>
    </div>
  );
}

export default function SolvrApp() {
  const [screen, setScreen] = useState(SCREENS.LANDING);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  const handleAuth = async (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    setDailyCount(0);
    const hist = await sb.getHistory(userData.id, accessToken);
    setHistory(Array.isArray(hist) ? hist : []);
    setScreen(SCREENS.APP);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setHistory([]);
    setDailyCount(0);
    setShowHistory(false);
    setScreen(SCREENS.LANDING);
  };

  const addToHistory = async (question, answer, category) => {
    if (user && token) {
      await sb.saveHistory(user.id, question, answer, category, token);
      const hist = await sb.getHistory(user.id, token);
      setHistory(Array.isArray(hist) ? hist : []);
    }
  };

  const handleUpgrade = async () => {
    if (!user || !token) return;
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_KEY,
      email: user.email,
      amount: 199900,
      currency: "NGN",
      ref: "SOLVR_" + Date.now(),
      metadata: { name: user.name },
      callback: async (response) => {
        if (response.status === "success") {
          await sb.updatePlan(user.id, "pro", token);
          setUser(u => ({ ...u, plan: "pro" }));
          setScreen(SCREENS.APP);
          alert("Welcome to Pro! Enjoy unlimited solves 🔥");
        }
      },
      onClose: () => {}
    });
    handler.openIframe();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#08090d", color: "#e8eaf0", fontFamily: "'DM Sans', sans-serif" }}>
      <script src="https://js.paystack.co/v1/inline.js" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Cabinet+Grotesk:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; background: rgba(8,9,13,0.92); backdrop-filter: blur(14px); z-index: 100; }
        .logo { font-family: 'Cabinet Grotesk', sans-serif; font-weight: 900; font-size: 22px; letter-spacing: -1px; cursor: pointer; user-select: none; }
        .logo span { color: ${ACCENT}; }
        .btn-primary { background: ${ACCENT}; color: #08090d; border: none; border-radius: 12px; padding: 14px 32px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px ${ACCENT}55; }
        .btn-secondary { background: transparent; color: #aaa; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px 28px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.25); color: #fff; }
        .nav-ghost { background: transparent; color: #aaa; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; margin-right: 8px; }
        .nav-ghost:hover { color: #fff; }
        .nav-cta { background: ${ACCENT}; color: #08090d; border: none; border-radius: 8px; padding: 9px 20px; font-weight: 700; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .nav-cta:hover { transform: translateY(-1px); }
        .hero { max-width: 760px; margin: 0 auto; padding: 100px 32px 80px; text-align: center; }
        .badge { display: inline-block; background: rgba(0,229,160,0.1); border: 1px solid rgba(0,229,160,0.25); color: ${ACCENT}; font-size: 11px; font-weight: 700; letter-spacing: 2px; padding: 6px 16px; border-radius: 100px; margin-bottom: 28px; text-transform: uppercase; }
        .hero-title { font-family: 'Cabinet Grotesk', sans-serif; font-size: clamp(40px, 7vw, 72px); font-weight: 900; line-height: 1.0; letter-spacing: -2px; margin-bottom: 24px; }
        .hero-title em { font-style: normal; color: ${ACCENT}; }
        .hero-sub { font-size: 17px; color: #667; line-height: 1.75; margin-bottom: 44px; max-width: 500px; margin-left: auto; margin-right: auto; }
        .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 56px; }
        .preview-bar { display: flex; gap: 10px; padding: 16px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; max-width: 560px; margin: 0 auto; text-align: left; }
        .preview-dot { width: 9px; height: 9px; border-radius: 50%; background: ${ACCENT}; flex-shrink: 0; margin-top: 5px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .preview-text { font-size: 13px; color: #556; line-height: 1.65; }
        .features-grid { max-width: 900px; margin: 0 auto; padding: 80px 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
        .feature-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 28px; transition: all 0.22s; }
        .feature-card:hover { border-color: rgba(0,229,160,0.18); transform: translateY(-3px); }
        .f-icon { font-size: 26px; margin-bottom: 14px; }
        .f-title { font-family: 'Cabinet Grotesk', sans-serif; font-size: 17px; font-weight: 800; margin-bottom: 8px; }
        .f-desc { font-size: 13px; color: #556; line-height: 1.65; }
        .divider { border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 0 32px; }
        .cta-section { text-align: center; padding: 80px 32px; }
        .cta-title { font-family: 'Cabinet Grotesk', sans-serif; font-size: clamp(26px, 5vw, 46px); font-weight: 900; letter-spacing: -1px; margin-bottom: 14px; }
        .cta-sub { color: #445; font-size: 15px; margin-bottom: 32px; }
        .footer { text-align: center; padding: 28px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #334; }
        .footer span { color: ${ACCENT}; font-weight: 700; }
        .pricing-page { max-width: 860px; margin: 0 auto; padding: 80px 32px; }
        .pricing-header { text-align: center; margin-bottom: 56px; }
        .pricing-title { font-family: 'Cabinet Grotesk', sans-serif; font-size: clamp(32px, 6vw, 56px); font-weight: 900; letter-spacing: -2px; margin-bottom: 14px; }
        .pricing-sub { color: #556; font-size: 16px; }
        .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 48px; }
        .plan-card { border-radius: 20px; padding: 36px 32px; position: relative; transition: transform 0.2s; }
        .plan-card:hover { transform: translateY(-4px); }
        .plan-free { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); }
        .plan-pro { background: rgba(0,229,160,0.06); border: 2px solid ${ACCENT}44; box-shadow: 0 0 60px ${ACCENT}18; }
        .popular-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: #ff7744; color: #fff; font-size: 11px; font-weight: 800; padding: 5px 16px; border-radius: 100px; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; }
        .plan-name { font-family: 'Cabinet Grotesk', sans-serif; font-size: 20px; font-weight: 900; margin-bottom: 8px; }
        .old-price-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .old-price { font-size: 14px; color: #445; text-decoration: line-through; }
        .off-badge { background: rgba(255,100,60,0.15); color: #ff8866; font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 100px; }
        .plan-price { font-family: 'Cabinet Grotesk', sans-serif; font-size: 42px; font-weight: 900; letter-spacing: -2px; margin-bottom: 4px; }
        .plan-price span { font-size: 16px; font-weight: 500; color: #556; letter-spacing: 0; }
        .plan-desc { font-size: 13px; color: #556; margin-bottom: 20px; }
        .plan-features-list { list-style: none; margin-bottom: 28px; display: flex; flex-direction: column; gap: 12px; }
        .plan-feat { font-size: 14px; color: #aab; display: flex; align-items: center; gap: 10px; }
        .plan-feat-on { font-size: 14px; color: #e8eaf0; display: flex; align-items: center; gap: 10px; }
        .chk-yes { width: 18px; height: 18px; border-radius: 50%; background: rgba(0,229,160,0.15); border: 1px solid ${ACCENT}44; color: ${ACCENT}; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        .chk-no { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #334; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        .plan-btn-free { background: rgba(255,255,255,0.06); color: #ccc; border: 1px solid rgba(255,255,255,0.1); width: 100%; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .plan-btn-free:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .plan-btn-pro { background: ${ACCENT}; color: #08090d; border: none; box-shadow: 0 0 28px ${ACCENT}44; width: 100%; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .plan-btn-pro:hover { transform: translateY(-1px); box-shadow: 0 8px 32px ${ACCENT}66; }
        .pricing-note { text-align: center; font-size: 13px; color: #445; }
        .pricing-note a { color: ${ACCENT}; cursor: pointer; }
        .auth-wrap { min-height: calc(100vh - 65px); display: flex; align-items: center; justify-content: center; padding: 32px; }
        .auth-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 44px 40px; width: 100%; max-width: 420px; }
        .auth-logo { font-family: 'Cabinet Grotesk', sans-serif; font-weight: 900; font-size: 24px; letter-spacing: -1px; text-align: center; margin-bottom: 6px; }
        .auth-logo span { color: ${ACCENT}; }
        .auth-tagline { text-align: center; color: #445; font-size: 13px; margin-bottom: 32px; }
        .auth-tabs { display: flex; background: rgba(255,255,255,0.04); border-radius: 10px; padding: 4px; margin-bottom: 28px; gap: 4px; }
        .auth-tab { flex: 1; padding: 10px; text-align: center; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 7px; transition: all 0.2s; color: #556; border: none; background: transparent; font-family: 'DM Sans', sans-serif; }
        .auth-tab-active { flex: 1; padding: 10px; text-align: center; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 7px; background: ${ACCENT}; color: #08090d; border: none; font-family: 'DM Sans', sans-serif; }
        .field-group { margin-bottom: 16px; }
        .field-label { font-size: 12px; color: #667; font-weight: 600; margin-bottom: 7px; display: block; letter-spacing: 0.5px; text-transform: uppercase; }
        .field-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 13px 14px; color: #e8eaf0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: all 0.2s; }
        .field-input:focus { border-color: ${ACCENT}55; }
        .field-input::placeholder { color: #334; }
        .auth-btn { width: 100%; background: ${ACCENT}; color: #08090d; border: none; border-radius: 11px; padding: 14px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; margin-top: 6px; }
        .auth-btn:hover { transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .auth-error { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.18); color: #ff8888; border-radius: 8px; padding: 11px 14px; font-size: 13px; margin-bottom: 16px; }
        .auth-success { background: rgba(0,229,160,0.08); border: 1px solid rgba(0,229,160,0.2); color: ${ACCENT}; border-radius: 8px; padding: 11px 14px; font-size: 13px; margin-bottom: 16px; }
        .auth-switch { text-align: center; margin-top: 20px; font-size: 13px; color: #445; }
        .auth-switch a { color: ${ACCENT}; cursor: pointer; font-weight: 600; }
        .back-link { text-align: center; margin-top: 16px; font-size: 12px; color: #334; cursor: pointer; }
        .back-link:hover { color: #778; }
        .app-wrap { display: flex; flex-direction: column; height: 100vh; }
        .app-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; max-width: 100vw; overflow: hidden; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; background: ${ACCENT}18; border: 1px solid ${ACCENT}33; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: ${ACCENT}; flex-shrink: 0; }
        .icon-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #778; border-radius: 8px; padding: 5px 8px; font-size: 11px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; white-space: nowrap; }
        .icon-btn:hover { color: #fff; }
        .icon-btn-active { background: rgba(0,229,160,0.07); border: 1px solid ${ACCENT}44; color: ${ACCENT}; border-radius: 8px; padding: 7px 13px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
        .logout-btn { background: transparent; border: 1px solid rgba(255,255,255,0.07); color: #556; border-radius: 7px; padding: 7px 13px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .logout-btn:hover { color: #ff8888; }
        .pro-badge { background: ${ACCENT}18; border: 1px solid ${ACCENT}33; color: ${ACCENT}; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 100px; text-transform: uppercase; }
        .cat-bar { display: flex; gap: 7px; padding: 12px 20px; overflow-x: auto; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .cat-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); color: #667; border-radius: 20px; padding: 7px 15px; font-size: 12px; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
        .cat-btn:hover { color: #ddd; }
        .cat-btn-active { background: ${ACCENT}; color: #08090d; border: none; border-radius: 20px; padding: 7px 15px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap; font-weight: 700; }
        .messages { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 14px; }
        .msg-user { align-self: flex-end; background: rgba(0,229,160,0.09); border: 1px solid rgba(0,229,160,0.18); border-radius: 16px 16px 4px 16px; padding: 13px 17px; max-width: 76%; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
        .msg-ai { align-self: flex-start; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-left: 3px solid ${ACCENT}; border-radius: 4px 16px 16px 16px; padding: 15px 19px; max-width: 87%; font-size: 14px; line-height: 1.75; white-space: pre-wrap; }
        .input-area { padding: 14px 16px; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.05); }
        .input-box { display: flex; gap: 10px; align-items: flex-end; background: rgba(255,255,255,0.04); border: 1px solid ${ACCENT}33; border-radius: 14px; padding: 11px 14px; }
        textarea.main { background: transparent; border: none; outline: none; color: #e8eaf0; font-size: 14px; font-family: 'DM Sans', sans-serif; resize: none; flex: 1; min-height: 22px; max-height: 110px; line-height: 1.6; }
        textarea.main::placeholder { color: #334; }
        .send-btn { background: ${ACCENT}; color: #08090d; border: none; border-radius: 9px; padding: 11px 20px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; flex-shrink: 0; }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .limit-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .limit-text { font-size: 11px; color: #334; }
        .limit-warn { font-size: 11px; color: #ff9966; }
        .upgrade-strip { background: rgba(0,229,160,0.07); border: 1px solid ${ACCENT}22; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
        .upgrade-strip span { font-size: 13px; color: #778; }
        .upgrade-strip button { background: ${ACCENT}; color: #08090d; border: none; border-radius: 7px; padding: 7px 16px; font-size: 12px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .history-panel { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .history-header-bar { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .history-title { font-family: 'Cabinet Grotesk', sans-serif; font-size: 18px; font-weight: 900; }
        .history-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 18px 20px; }
        .history-q { font-size: 14px; font-weight: 600; color: #dde; margin-bottom: 8px; }
        .history-a { font-size: 13px; color: #556; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .history-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .history-cat { font-size: 10px; font-weight: 700; background: rgba(0,229,160,0.1); color: ${ACCENT}; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; }
        .history-time { font-size: 11px; color: #334; }
        .empty-state { margin: auto; text-align: center; color: #334; padding-bottom: 40px; }
        .dots { display: inline-flex; gap: 5px; align-items: center; padding: 13px 17px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: ${ACCENT}; animation: bop 1s infinite; }
        .dot:nth-child(2){animation-delay:.15s} .dot:nth-child(3){animation-delay:.3s}
        @keyframes bop { 0%,80%,100%{transform:translateY(0);opacity:.3} 40%{transform:translateY(-5px);opacity:1} }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:4px}
      `}</style>

      {screen === SCREENS.LANDING && (
        <LandingPage
          onLogin={() => { setAuthMode("login"); setScreen(SCREENS.AUTH); }}
          onSignup={() => { setAuthMode("signup"); setScreen(SCREENS.AUTH); }}
          onPricing={() => setScreen(SCREENS.PRICING)}
        />
      )}
      {screen === SCREENS.AUTH && (
        <AuthScreen mode={authMode} setMode={setAuthMode} onAuth={handleAuth} onBack={() => setScreen(SCREENS.LANDING)} />
      )}
      {screen === SCREENS.PRICING && (
        <PricingPage
          user={user}
          onBack={() => setScreen(user ? SCREENS.APP : SCREENS.LANDING)}
          onSelectFree={() => setScreen(user ? SCREENS.APP : SCREENS.AUTH)}
          onSelectPro={user ? handleUpgrade : () => { setAuthMode("signup"); setScreen(SCREENS.AUTH); }}
        />
      )}
      {screen === SCREENS.APP && (
        <AppScreen
          user={user} token={token} history={history}
          dailyCount={dailyCount} setDailyCount={setDailyCount}
          addToHistory={addToHistory} onLogout={handleLogout}
          onPricing={() => setScreen(SCREENS.PRICING)}
          onUpgrade={handleUpgrade}
          showHistory={showHistory} setShowHistory={setShowHistory}
        />
      )}
    </div>
  );
}

function LandingPage({ onLogin, onSignup, onPricing }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav className="nav">
        <div className="logo">Solv<span>R</span></div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button className="nav-ghost" onClick={onPricing}>Pricing</button>
          <button className="nav-ghost" onClick={onLogin}>Log in</button>
          <button className="nav-cta" onClick={onSignup}>Get started</button>
        </div>
      </nav>
      <section className="hero">
        <div className="badge">AI Problem Solver</div>
        <h1 className="hero-title">Every problem.<br /><em>Solved instantly.</em></h1>
        <p className="hero-sub">Drop any problem — math, science, life decisions, code. SOLVR breaks it down and hands you the answer in seconds.</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={onSignup}>Start solving free</button>
          <button className="btn-secondary" onClick={onPricing}>See pricing</button>
        </div>
        <div className="preview-bar">
          <div className="preview-dot" />
          <p className="preview-text">"If a train travels 120km in 1.5 hours, what is its average speed?" <strong style={{ color: "#ccd" }}>80 km/h. Here's the step-by-step...</strong></p>
        </div>
      </section>
      <hr className="divider" />
      <section className="features-grid">
        {features.map(f => (
          <div className="feature-card" key={f.title}>
            <div className="f-icon">{f.icon}</div>
            <div className="f-title">{f.title}</div>
            <p className="f-desc">{f.desc}</p>
          </div>
        ))}
      </section>
      <hr className="divider" />
      <section className="cta-section">
        <h2 className="cta-title">Ready to stop guessing?</h2>
        <p className="cta-sub">Free to use. Takes 10 seconds to sign up.</p>
        <button className="btn-primary" onClick={onSignup}>Create free account</button>
      </section>
      <footer className="footer">Built with <span>SOLVR</span> · Powered by Claude AI · 2025</footer>
    </div>
  );
}

function PricingPage({ user, onBack, onSelectFree, onSelectPro }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav className="nav">
        <div className="logo">Solv<span>R</span></div>
        <button className="nav-ghost" onClick={onBack}>Back</button>
      </nav>
      <div className="pricing-page">
        <div className="pricing-header">
          <div className="badge">Simple Pricing</div>
          <h1 className="pricing-title">Pick your plan</h1>
          <p className="pricing-sub">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="plans-grid">
          <div className="plan-card plan-free">
            <div className="plan-name">Free</div>
            <div className="plan-price">0<span style={{ fontSize: "22px", fontWeight: 700, letterSpacing: 0 }}> NGN</span><span> / forever</span></div>
            <p className="plan-desc">Perfect for getting started</p>
            <ul className="plan-features-list">
              {["5 problems per day", "All categories", "Basic solutions", "No history saved"].map(f => (
                <li key={f} className="plan-feat"><div className="chk-no">-</div>{f}</li>
              ))}
            </ul>
            <button className="plan-btn-free" onClick={onSelectFree}>{user ? "Continue with Free" : "Get started free"}</button>
          </div>
          <div className="plan-card plan-pro">
            <div className="popular-badge">LIMITED OFFER</div>
            <div className="plan-name">Pro</div>
            <div className="old-price-row">
              <span className="old-price">NGN 2,500</span>
              <span className="off-badge">20% OFF</span>
            </div>
            <div className="plan-price">1,999<span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: 0 }}> NGN</span><span> / month</span></div>
            <p className="plan-desc">Limited time — grab it before it ends!</p>
            <CountdownTimer />
            <ul className="plan-features-list">
              {["Unlimited problems", "All categories", "Detailed solutions", "Full history saved", "Priority AI speed"].map(f => (
                <li key={f} className="plan-feat-on"><div className="chk-yes">✓</div>{f}</li>
              ))}
            </ul>
            <button className="plan-btn-pro" onClick={onSelectPro}>{user ? "Upgrade to Pro" : "Claim Offer"}</button>
          </div>
        </div>
        <p className="pricing-note">Payments powered by Paystack · <a onClick={onBack}>Go back</a></p>
      </div>
    </div>
  );
}

function AuthScreen({ mode, setMode, onAuth, onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!isLogin && !name) { setError("Please enter your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const data = await sb.signIn(email, password);
        if (data.error) { setError(data.error.message || "Login failed. Check your details."); setLoading(false); return; }
        const profile = await sb.getProfile(data.user.id, data.access_token);
        onAuth({ id: data.user.id, name: profile?.name || email, email, plan: profile?.plan || "free" }, data.access_token);
      } else {
        const data = await sb.signUp(email, password, name);
        if (data.error) { setError(data.error.message || "Signup failed. Try again."); setLoading(false); return; }
        setSuccess("Account created! Logging you in...");
        await new Promise(r => setTimeout(r, 1000));
        const loginData = await sb.signIn(email, password);
        if (loginData.error) { setError("Account created but login failed. Please log in."); setLoading(false); return; }
        await sb.createProfile(loginData.user.id, name, email, loginData.access_token);
        onAuth({ id: loginData.user.id, name, email, plan: "free" }, loginData.access_token);
      }
    } catch (e) {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      <nav className="nav"><div className="logo">Solv<span>R</span></div></nav>
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">Solv<span>R</span></div>
          <p className="auth-tagline">{isLogin ? "Welcome back. Let's solve something." : "Join thousands solving problems faster."}</p>
          <div className="auth-tabs">
            <button className={isLogin ? "auth-tab-active" : "auth-tab"} onClick={() => { setMode("login"); setError(""); }}>Log In</button>
            <button className={!isLogin ? "auth-tab-active" : "auth-tab"} onClick={() => { setMode("signup"); setError(""); }}>Sign Up</button>
          </div>
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          {!isLogin && (
            <div className="field-group">
              <label className="field-label">Full Name</label>
              <input className="field-input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Log In" : "Create Account"}
          </button>
          <p className="auth-switch">
            {isLogin ? "No account? " : "Already registered? "}
            <a onClick={() => { setMode(isLogin ? "signup" : "login"); setError(""); }}>{isLogin ? "Sign up free" : "Log in"}</a>
          </p>
          <p className="back-link" onClick={onBack}>Back to home</p>
        </div>
      </div>
    </div>
  );
}

function AppScreen({ user, token, history, dailyCount, setDailyCount, addToHistory, onLogout, onPricing, onUpgrade, showHistory, setShowHistory }) {
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("Other");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const taRef = useRef(null);
  const isPro = user?.plan === "pro";
  const remaining = 5 - dailyCount;
  const hitLimit = !isPro && dailyCount >= 5;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSolve = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || hitLimit) return;
    setMessages(p => [...p, { role: "user", text: trimmed, category }]);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);
    setDailyCount(c => c + 1);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a brilliant, direct problem solver. User: ${user.name}. Category: "${category}". Be concise, structured, practical. Show steps for math. Give real advice for life. No preamble.`,
          messages: [{ role: "user", content: trimmed }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "Couldn't solve that. Try again.";
      setMessages(p => [...p, { role: "assistant", text, category }]);
      await addToHistory(trimmed, text, category);
    } catch {
      setMessages(p => [...p, { role: "assistant", text: "Something went wrong. Try again.", category }]);
    }
    setLoading(false);
  };

  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="app-wrap">
      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="logo" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 900, fontSize: "19px", letterSpacing: "-0.5px" }}>
            Solv<span style={{ color: ACCENT }}>R</span>
          </div>
          {isPro && <div className="pro-badge">Pro</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button className={showHistory ? "icon-btn-active" : "icon-btn"} onClick={() => setShowHistory(s => !s)}>
            {showHistory ? "Solver" : "History"}
          </button>
          {!isPro && <button className="icon-btn" onClick={onUpgrade}>Upgrade</button>}
          <div className="avatar">{initials}</div>
          
          <button className="logout-btn" onClick={onLogout}>Out</button>
        </div>
      </div>

      {showHistory ? (
        <>
          <div className="history-header-bar">
            <div className="history-title">History</div>
            <span style={{ fontSize: "12px", color: "#445" }}>{history.length} solution{history.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="history-panel">
            {history.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
                <div style={{ fontSize: "14px" }}>No history yet. Solve something first!</div>
              </div>
            ) : history.map((h, i) => (
              <div key={i} className="history-card">
                <div className="history-meta">
                  <div className="history-cat">{h.category}</div>
                  <div className="history-time">{new Date(h.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="history-q">Q: {h.question}</div>
                <div className="history-a">{h.answer}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="cat-bar">
            {categories.map(c => (
              <button key={c.label} className={category === c.label ? "cat-btn-active" : "cat-btn"} onClick={() => setCategory(c.label)}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <div style={{ fontSize: "42px", marginBottom: "12px" }}>🧠</div>
                <div style={{ fontSize: "14px", color: "#445" }}>Hey {user.name.split(" ")[0]}! What are we solving today?</div>
                {!isPro && <div style={{ fontSize: "12px", color: "#334", marginTop: "8px" }}>{remaining} free solve{remaining !== 1 ? "s" : ""} left today</div>}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "msg-user" : "msg-ai"}>{msg.text}</div>
            ))}
            {loading && (
              <div className="dots" style={{ alignSelf: "flex-start" }}>
                <div className="dot" /><div className="dot" /><div className="dot" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="input-area">
            {hitLimit ? (
              <div className="upgrade-strip">
                <span>You have used all 5 free solves today</span>
                <button onClick={onUpgrade}>Go Pro</button>
              </div>
            ) : (
              <>
                <div className="input-box">
                  <textarea ref={taRef} className="main" rows={1}
                    placeholder="What's your problem?"
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
                    }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSolve(); } }}
                  />
                  <button className="send-btn" onClick={handleSolve} disabled={loading || !input.trim()}>
                    {loading ? "..." : "Solve"}
                  </button>
                </div>
                <div className="limit-bar">
                  <span className="limit-text">Enter to send</span>
                  {!isPro && <span className={remaining <= 1 ? "limit-warn" : "limit-text"}>{remaining} solve{remaining !== 1 ? "s" : ""} left today</span>}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
