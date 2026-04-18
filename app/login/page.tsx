"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { login, signup } from "./actions";
import { TrendingUp, TrendingDown, BarChart2, Activity, Lock, Mail, Eye, EyeOff } from "lucide-react";

const FLOATING_STOCKS = [
  { ticker: "AAPL", price: "175.43", change: "+1.24%", up: true },
  { ticker: "TSLA", price: "248.91", change: "+3.87%", up: true },
  { ticker: "NVDA", price: "892.54", change: "+2.15%", up: true },
  { ticker: "MSFT", price: "412.30", change: "+0.92%", up: true },
  { ticker: "META", price: "521.11", change: "-0.64%", up: false },
  { ticker: "GOOGL", price: "178.65", change: "-1.12%", up: false },
  { ticker: "AMZN", price: "198.43", change: "+1.54%", up: true },
  { ticker: "AMD",  price: "164.22", change: "-2.33%", up: false },
];

const POSITIONS = [
  { left: "5%",  top: "10%" },
  { left: "8%",  top: "60%" },
  { left: "75%", top: "12%" },
  { left: "80%", top: "58%" },
  { left: "6%",  top: "35%" },
  { left: "78%", top: "32%" },
  { left: "12%", top: "82%" },
  { left: "72%", top: "80%" },
];

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; info?: string };
}) {
  const errorMsg = searchParams?.error ? decodeURIComponent(searchParams.error) : null
  const infoMsg  = searchParams?.info  ? decodeURIComponent(searchParams.info)  : null
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);

  useEffect(() => { 
    setMounted(true); 
    const now = new Date();
    const opt: Intl.DateTimeFormatOptions = { timeZone: "America/New_York", hour12: false, weekday: "short", hour: "numeric", minute: "numeric" };
    const str = now.toLocaleString("en-US", opt);
    const parts = str.split(", ");
    if (parts.length >= 2) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const day = days.indexOf(parts[0]);
      const [hStr, mStr] = parts[1].split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const hours = h === 24 ? 0 : h;
      const mins = hours * 60 + m;
      setMarketOpen(day >= 1 && day <= 5 && mins >= 570 && mins < 960);
    }
  }, []);

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#fff",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    outline: "none",
    transition: "all 0.2s",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050508] relative overflow-hidden">

      {/* Gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob-1 absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)", filter: "blur(70px)", opacity: 0.6 }} />
        <div className="blob-2 absolute bottom-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)", filter: "blur(90px)", opacity: 0.5 }} />
        <div className="blob-3 absolute top-[40%] left-[40%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)", filter: "blur(60px)", opacity: 0.4 }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
      </div>

      {/* Floating stock decorations */}
      {mounted && FLOATING_STOCKS.map((s, i) => (
        <motion.div key={s.ticker}
          className="absolute hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl pointer-events-none select-none"
          style={{
            ...POSITIONS[i],
            background: "rgba(255,255,255,0.025)",
            border: `1px solid ${s.up ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
            backdropFilter: "blur(8px)",
          }}
          animate={{ opacity: [0.35, 0.65, 0.35], y: [0, -8, 0] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
        >
          <span className="font-mono-nums text-[11px] font-bold text-white/60">{s.ticker}</span>
          <span className="font-mono-nums text-[11px] text-white/40">${s.price}</span>
          <span className={`font-mono-nums text-[11px] font-bold ${s.up ? "text-green-400" : "text-red-400"}`}>{s.change}</span>
          {s.up ? <TrendingUp className="h-3 w-3 text-green-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
        </motion.div>
      ))}

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {/* Gradient border */}
        <div className="rounded-2xl p-[1px]"
          style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.55),rgba(139,92,246,0.35),rgba(59,130,246,0.1))" }}>
          <div className="rounded-2xl p-7 space-y-6"
            style={{ background: "linear-gradient(160deg,rgba(12,12,22,0.99),rgba(8,8,18,0.99))", backdropFilter: "blur(40px)" }}>

            {/* Logo */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}>
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight"
                  style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Market Pulse
                </h1>
              </div>
              <p className="text-sm text-white/35 font-medium">Real-Time AI Stock Intelligence</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="relative flex h-2 w-2">
                  {marketOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${marketOpen ? "bg-green-500" : "bg-red-500"}`} />
                </span>
                <span className={`text-xs font-medium ${marketOpen ? "text-green-400/70" : "text-red-400/70"}`}>
                  {marketOpen ? "Markets Active" : "Markets Closed"}
                </span>
                <Activity className={`h-3 w-3 ${marketOpen ? "text-green-400/50" : "text-red-400/50"}`} />
              </div>
            </div>

            {/* ── LOGIN FORM ── */}
            <div>
              <p className="text-xs text-white/35 uppercase tracking-widest font-semibold text-center mb-4">Sign In</p>
              <form action={login} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="block text-xs font-semibold text-white/40 uppercase tracking-widest">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 pointer-events-none" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      style={{ ...inputBase, paddingLeft: "2.5rem" }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(59,130,246,0.5)";
                        e.currentTarget.style.background = "rgba(59,130,246,0.07)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-white/40 uppercase tracking-widest">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 pointer-events-none" />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      style={{ ...inputBase, paddingLeft: "2.5rem", paddingRight: "3rem" }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(59,130,246,0.5)";
                        e.currentTarget.style.background = "rgba(59,130,246,0.07)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <button type="button" onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-red-300"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Info / success */}
                {infoMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-green-300"
                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                    {infoMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }}
                >
                  Sign In to Dashboard →
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-xs text-white/20 font-medium">or create account</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* ── SIGNUP FORM ── */}
            <div>
              <form action={signup} className="space-y-3">
                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  required
                  style={inputBase}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(139,92,246,0.5)";
                    e.currentTarget.style.background = "rgba(139,92,246,0.07)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Create password (min 6 chars)"
                  required
                  minLength={6}
                  style={inputBase}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(139,92,246,0.5)";
                    e.currentTarget.style.background = "rgba(139,92,246,0.07)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white/80 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  Create Free Account
                </button>
              </form>
            </div>

            {/* Feature badges */}
            <div className="pt-1 border-t grid grid-cols-3 gap-3 text-center"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {[
                { icon: Activity,   label: "Real-Time" },
                { icon: TrendingUp, label: "AI Signals" },
                { icon: BarChart2,  label: "Analytics"  },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 pt-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.1)" }}>
                    <Icon className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <span className="text-[10px] text-white/25 font-medium">{label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
