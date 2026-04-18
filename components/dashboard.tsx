"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, TrendingUp, TrendingDown, Activity, Newspaper, LogOut,
  Plus, X, RefreshCw, BarChart2, Zap, Globe, Star,
  ChevronRight, Volume2, DollarSign, Clock,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import PulseBot from "@/components/PulseBot";

// ══════════════════════════
//  TypeScript Interfaces
// ══════════════════════════
interface QuoteData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  market_cap: number;
  pe_ratio: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  open: number | null;
  day_high: number | null;
  day_low: number | null;
  prev_close: number;
}

interface IndexData {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
  sparkline: number[];
}

interface StockHistory {
  Date: string;
  Close: number;
}

interface VolumeHistory {
  Date: string;
  Volume: number;
}

interface StockData {
  ticker: string;
  current_price: number;
  history: StockHistory[];
  volume: VolumeHistory[];
}

interface PredictionData {
  trend: string;
  predictions: { Date: string; Predicted: number }[];
}

interface SentimentItem {
  title: string;
  publisher: string;
  link: string;
  sentiment: string;
}

interface SentimentData {
  sentiment: string;
  score: number;
  news: SentimentItem[];
}

interface RecommendationData {
  action: string;
  confidence: number;
  ticker: string;
}

interface MarqueeQuote {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
}

// ══════════════════════════════
//  Constants
// ══════════════════════════════
const MARQUEE_TICKERS = [
  "AAPL", "TSLA", "GOOGL", "MSFT", "AMZN", "META",
  "NVDA", "NFLX", "AMD", "ORCL", "INTC", "PYPL",
  "SPY", "QQQ", "BRK-B",
];

const DEFAULT_WATCHLIST = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN"];

const PERIODS = [
  { label: "1W", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
];

const PIE_COLORS = ["#22c55e", "#ef4444", "#6b7280"];

// ══════════════════════════════
//  Helper Functions
// ══════════════════════════════
function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtVolume(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function fmtMarketCap(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function checkMarketOpen(): boolean {
  const now = new Date();
  const opt: Intl.DateTimeFormatOptions = { timeZone: "America/New_York", hour12: false, weekday: "short", hour: "numeric", minute: "numeric" };
  const str = now.toLocaleString("en-US", opt);
  const parts = str.split(", ");
  if (parts.length < 2) return false;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days.indexOf(parts[0]);
  const [hStr, mStr] = parts[1].split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const hours = h === 24 ? 0 : h;
  const mins = hours * 60 + m;
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960; // 9:30–16:00
}

// Mini SVG sparkline for index cards
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = positive ? "#22c55e" : "#ef4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

// Custom recharts tooltip
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-xl text-xs space-y-1"
      style={{
        background: "rgba(10,10,20,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div className="text-white/40 font-medium mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="font-bold text-white font-mono-nums">${p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════
//  Main Dashboard Component
// ══════════════════════════════
export default function Dashboard() {
  const [ticker, setTicker]                     = useState("AAPL");
  const [searchInput, setSearchInput]           = useState("AAPL");
  const [quoteData, setQuoteData]               = useState<QuoteData | null>(null);
  const [stockData, setStockData]               = useState<StockData | null>(null);
  const [predData, setPredData]                 = useState<PredictionData | null>(null);
  const [sentData, setSentData]                 = useState<SentimentData | null>(null);
  const [recData, setRecData]                   = useState<RecommendationData | null>(null);
  const [indices, setIndices]                   = useState<IndexData[]>([]);
  const [marquee, setMarquee]                   = useState<MarqueeQuote[]>([]);
  const [watchlist, setWatchlist]               = useState<string[]>(DEFAULT_WATCHLIST);
  const [watchlistInput, setWatchlistInput]     = useState("");
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [error, setError]                       = useState("");
  const [lastUpdated, setLastUpdated]           = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo]             = useState(0);
  const [period, setPeriod]                     = useState("1mo");
  const [marketOpen]                            = useState(checkMarketOpen());
  const router                                  = useRouter();
  const supabase                                = createClient();
  const autoRefreshRef                          = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef                            = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Logout ──────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ── Fetch main stock (quote + history + pred + sent + rec) ──
  const fetchStock = useCallback(async (sym: string, per: string) => {
    setError("");
    try {
      const [qRes, sRes, pRes, stRes, rRes] = await Promise.all([
        fetch(`/api/py/quote?ticker=${sym}`),
        fetch(`/api/py/sentiment?ticker=${sym}`),
        fetch(`/api/py/predict?ticker=${sym}`),
        fetch(`/api/py/stock?ticker=${sym}&period=${per}`),
        fetch(`/api/py/recommendation?ticker=${sym}`),
      ]);
      if (!qRes.ok) throw new Error(`Invalid ticker: ${sym}`);
      const [q, s, p, st, r] = await Promise.all([
        qRes.json(), sRes.json(), pRes.json(), stRes.json(), rRes.json(),
      ]);
      setQuoteData(q);
      setSentData(s);
      setPredData(p);
      setStockData(st);
      setRecData(r);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load stock data";
      setError(msg);
    }
  }, []);

  // ── Fetch market indices ─────────────────────
  const fetchIndices = useCallback(async () => {
    try {
      const res = await fetch("/api/py/market-overview");
      if (res.ok) setIndices((await res.json()).indices ?? []);
    } catch { /* silent */ }
  }, []);

  // ── Fetch marquee data ───────────────────────
  const fetchMarquee = useCallback(async () => {
    try {
      const res = await fetch(`/api/py/batch-quote?tickers=${MARQUEE_TICKERS.join(",")}`);
      if (res.ok) setMarquee((await res.json()).quotes ?? []);
    } catch { /* silent */ }
  }, []);

  // ── Load watchlist from Supabase ─────────────
  const loadWatchlist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("watchlist")
      .select("ticker")
      .eq("user_id", user.id)
      .order("added_at");
    if (data && data.length > 0) {
      setWatchlist(data.map((r: { ticker: string }) => r.ticker));
    }
  }, [supabase]);

  // ── Add to watchlist ─────────────────────────
  const addToWatchlist = async (t: string) => {
    const sym = t.toUpperCase().trim();
    if (!sym || watchlist.includes(sym)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("watchlist").upsert({ user_id: user.id, ticker: sym });
    }
    setWatchlist((prev) => [...prev, sym]);
    setWatchlistInput("");
  };

  // ── Remove from watchlist ────────────────────
  const removeFromWatchlist = async (t: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("ticker", t);
    }
    setWatchlist((prev) => prev.filter((x) => x !== t));
  };

  // ── Manual refresh ───────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStock(ticker, period);
    setRefreshing(false);
  };

  // ── Search submit ────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = searchInput.toUpperCase().trim();
    if (!sym) return;
    setTicker(sym);
    setLoading(true);
    fetchStock(sym, period).finally(() => setLoading(false));
  };

  // ── Period change ────────────────────────────
  const changePeriod = (p: string) => {
    setPeriod(p);
    fetchStock(ticker, p);
  };

  // ── Initial load ─────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchStock(ticker, period),
      fetchIndices(),
      fetchMarquee(),
      loadWatchlist(),
    ]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-refresh every 30s ───────────────────
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(() => {
      fetchStock(ticker, period);
    }, 30000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [ticker, period, fetchStock]);

  // ── Countdown since last update ──────────────
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [lastUpdated]);

  // ── Chart data preparation ───────────────────
  const chartData    = (stockData?.history ?? []).map((h) => ({ name: h.Date, price: h.Close }));
  const predChartData = (predData?.predictions ?? []).map((p) => ({ name: p.Date, predicted: p.Predicted }));
  const combinedData = [...chartData.slice(-25), ...predChartData];
  const volumeData   = (stockData?.volume ?? []).map((v) => ({ name: v.Date, volume: v.Volume }));
  const pieData      = [
    { name: "Positive", value: sentData?.sentiment === "Positive" ? 65 : 17 },
    { name: "Negative", value: sentData?.sentiment === "Negative" ? 65 : 17 },
    { name: "Neutral",  value: sentData?.sentiment === "Neutral"  ? 65 : 17 },
  ];

  const isUp = (quoteData?.change_pct ?? 0) >= 0;
  const accentColor = isUp ? "#22c55e" : "#ef4444";
  const accentBg    = isUp ? "rgba(34,197,94,0.1)"  : "rgba(239,68,68,0.1)";

  // ── Recommendation color ─────────────────────
  const recColor =
    recData?.action === "BUY"  ? "#22c55e" :
    recData?.action === "SELL" ? "#ef4444" : "#f59e0b";

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#050508] text-white relative">

      {/* ── Background ambience ────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[700px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)", filter: "blur(80px)" }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }} />
      </div>

      {/* ══════════════════════════════════════════
          HEADER
          ════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(5,5,8,0.92)",
          backdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4 px-4 md:px-6 py-3.5">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 16px rgba(59,130,246,0.4)" }}>
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none"
                style={{
                  background: "linear-gradient(135deg,#60a5fa,#a78bfa)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                Market Pulse
              </h1>
              <p className="text-[10px] text-white/30 font-medium leading-none mt-0.5">AI Stock Intelligence</p>
            </div>
          </div>

          {/* Market status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: marketOpen ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${marketOpen ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
            <span className={`h-1.5 w-1.5 rounded-full ${marketOpen ? "live-dot-green bg-green-500" : "live-dot-red bg-red-500"}`} />
            <span className={`text-xs font-bold ${marketOpen ? "text-green-400" : "text-red-400"}`}>
              {marketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
            </span>
            <Globe className={`h-3 w-3 ${marketOpen ? "text-green-400/60" : "text-red-400/60"}`} />
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search ticker…"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(59,130,246,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)", boxShadow: "0 0 12px rgba(59,130,246,0.3)" }}
            >
              Go
            </button>
          </form>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Last updated */}
            {lastUpdated && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/25">
                <Clock className="h-3 w-3" />
                {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`}
              </div>
            )}
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg transition-all hover:bg-white/5 active:scale-95 text-white/40 hover:text-white/70"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(252,165,165,0.8)" }}
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          TICKER MARQUEE
          ════════════════════════════════════════ */}
      <div className="overflow-hidden border-b z-40 relative"
        style={{ background: "rgba(0,0,0,0.6)", borderColor: "rgba(255,255,255,0.04)" }}>
        {marquee.length > 0 ? (
          <div className="ticker-track py-2.5">
            {[...marquee, ...marquee].map((q, i) => (
              <button
                key={`${q.ticker}-${i}`}
                onClick={() => {
                  setTicker(q.ticker);
                  setSearchInput(q.ticker);
                  setLoading(true);
                  fetchStock(q.ticker, period).finally(() => setLoading(false));
                }}
                className="inline-flex items-center gap-2 px-5 shrink-0 border-r hover:opacity-80 transition-opacity cursor-pointer"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <span className="text-xs font-bold text-white/70 tracking-wider">{q.ticker}</span>
                <span className="text-xs font-mono-nums text-white/90">${q.price.toFixed(2)}</span>
                <span className={`text-xs font-bold font-mono-nums ${q.change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {q.change_pct >= 0 ? "▲" : "▼"} {Math.abs(q.change_pct).toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-2.5 px-6 text-xs text-white/20 animate-pulse">
            Loading market data…
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          MAIN CONTENT
          ════════════════════════════════════════ */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 space-y-6 relative z-10">

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
            >
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              {error}
              <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-400">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Market Indices Row ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {indices.length > 0
            ? indices.map((idx) => {
                const pos = idx.change_pct >= 0;
                return (
                  <div
                    key={idx.ticker}
                    className="glass-hover rounded-xl p-4 border"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{idx.name}</p>
                        <p className="text-xl font-black mt-1 font-mono-nums">{idx.price.toLocaleString()}</p>
                        <p className={`text-xs font-bold mt-0.5 font-mono-nums ${pos ? "text-green-400" : "text-red-400"}`}>
                          {pos ? "▲" : "▼"} {Math.abs(idx.change_pct).toFixed(2)}%
                        </p>
                      </div>
                      <Sparkline data={idx.sparkline} positive={pos} />
                    </div>
                  </div>
                );
              })
            : // Loading skeletons
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl p-4 border shimmer"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)", height: 88 }} />
              ))}
        </motion.div>

        {/* ── Main 2-col grid: Watchlist + Stock Detail ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">

          {/* ────────────────────────────────────
              WATCHLIST PANEL
              ──────────────────────────────────── */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border space-y-0 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400/80" />
                <span className="text-sm font-bold text-white/80">Watchlist</span>
              </div>
              <span className="text-xs text-white/30 font-mono-nums">{watchlist.length} stocks</span>
            </div>

            {/* Add ticker input */}
            <div className="px-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addToWatchlist(watchlistInput);
                }}
                className="flex gap-2"
              >
                <input
                  value={watchlistInput}
                  onChange={(e) => setWatchlistInput(e.target.value)}
                  placeholder="Add ticker…"
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs text-white placeholder-white/20 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(59,130,246,0.4)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)"; }}
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg transition-all active:scale-95"
                  style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Watchlist items */}
            <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.03)" } as React.CSSProperties}>
              {watchlist.map((wTicker) => {
                const q = marquee.find((m) => m.ticker === wTicker);
                const active = wTicker === ticker;
                const wPos = (q?.change_pct ?? 0) >= 0;
                return (
                  <div
                    key={wTicker}
                    onClick={() => {
                      setTicker(wTicker);
                      setSearchInput(wTicker);
                      setLoading(true);
                      fetchStock(wTicker, period).finally(() => setLoading(false));
                    }}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer transition-all group"
                    style={{
                      background: active ? "rgba(59,130,246,0.08)" : "transparent",
                      borderLeft: active ? "2px solid #3b82f6" : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {active ? (
                        <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-white/10"
                          style={{ background: "rgba(255,255,255,0.04)" }} />
                      )}
                      <span className={`text-sm font-bold ${active ? "text-blue-400" : "text-white/70 group-hover:text-white/90"} transition-colors`}>
                        {wTicker}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {q && (
                        <div className="text-right">
                          <p className="text-xs font-bold font-mono-nums text-white/80">${q.price.toFixed(2)}</p>
                          <p className={`text-[10px] font-bold font-mono-nums ${wPos ? "text-green-400" : "text-red-400"}`}>
                            {wPos ? "+" : ""}{q.change_pct.toFixed(2)}%
                          </p>
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(wTicker); }}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all ml-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>

          {/* ────────────────────────────────────
              RIGHT: STOCK DETAIL
              ──────────────────────────────────── */}
          <div className="space-y-5 min-w-0">

            {/* ── Stock Header Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border p-5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              {loading ? (
                <div className="space-y-3">
                  <div className="h-6 w-48 rounded-lg shimmer" />
                  <div className="h-14 w-64 rounded-xl shimmer" />
                  <div className="h-4 w-32 rounded-lg shimmer" />
                </div>
              ) : quoteData ? (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Name + ticker */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-black tracking-widest px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd" }}>
                        {quoteData.ticker}
                      </span>
                      {/* Live indicator */}
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ background: accentColor }} />
                          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: accentColor }} />
                        </span>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Live</span>
                      </div>
                    </div>
                    <p className="text-sm text-white/40 font-medium mb-2 truncate max-w-xs">{quoteData.name}</p>
                    {/* Price */}
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black tracking-tighter font-mono-nums" style={{ color: "#fff" }}>
                        ${quoteData.price.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: accentBg, border: `1px solid ${accentColor}30` }}>
                        {isUp
                          ? <TrendingUp className="h-4 w-4" style={{ color: accentColor }} />
                          : <TrendingDown className="h-4 w-4" style={{ color: accentColor }} />}
                        <span className="text-base font-black font-mono-nums" style={{ color: accentColor }}>
                          {isUp ? "+" : ""}{quoteData.change.toFixed(2)} ({isUp ? "+" : ""}{quoteData.change_pct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation badge */}
                  <div className="text-center px-6 py-4 rounded-2xl border flex flex-col gap-1"
                    style={{
                      background: `${recColor}10`,
                      borderColor: `${recColor}30`,
                      boxShadow: `0 0 24px ${recColor}15`,
                    }}>
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">AI Signal</span>
                    <span className="text-3xl font-black" style={{ color: recColor }}>{recData?.action ?? "—"}</span>
                    <span className="text-xs font-bold" style={{ color: `${recColor}90` }}>
                      {recData?.confidence ?? 0}% confidence
                    </span>
                  </div>
                </div>
              ) : null}
            </motion.div>

            {/* ── Key Metrics Grid ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
            >
              {loading
                ? [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-xl p-3 shimmer" style={{ height: 72, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }} />
                  ))
                : [
                    { label: "Open",      icon: DollarSign, value: fmtPrice(quoteData?.open),          color: "#60a5fa" },
                    { label: "Day High",  icon: TrendingUp, value: fmtPrice(quoteData?.day_high),       color: "#22c55e" },
                    { label: "Day Low",   icon: TrendingDown, value: fmtPrice(quoteData?.day_low),      color: "#ef4444" },
                    { label: "Volume",    icon: Volume2,    value: fmtVolume(quoteData?.volume),         color: "#a78bfa" },
                    { label: "Mkt Cap",   icon: BarChart2,  value: fmtMarketCap(quoteData?.market_cap), color: "#f59e0b" },
                    { label: "P/E Ratio", icon: Activity,   value: quoteData?.pe_ratio != null ? quoteData.pe_ratio.toFixed(1) : "—", color: "#06b6d4" },
                  ].map(({ label, icon: Icon, value, color }) => (
                    <div key={label} className="metric-card group">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                        <span className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">{label}</span>
                      </div>
                      <p className="text-base font-black font-mono-nums text-white/90">{value}</p>
                    </div>
                  ))}
            </motion.div>

            {/* ── 52-week bar ── */}
            {!loading && quoteData?.week_52_low != null && quoteData?.week_52_high != null && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
                className="rounded-xl p-4 border"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/35 font-semibold uppercase tracking-widest">52-Week Range</span>
                  <span className="text-xs text-white/50 font-mono-nums">
                    {fmtPrice(quoteData.week_52_low)} — {fmtPrice(quoteData.week_52_high)}
                  </span>
                </div>
                <div className="relative h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {(() => {
                    const lo = quoteData.week_52_low!;
                    const hi = quoteData.week_52_high!;
                    const pct = Math.max(0, Math.min(100, ((quoteData.price - lo) / (hi - lo)) * 100));
                    return (
                      <>
                        <div className="absolute left-0 top-0 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)" }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg"
                          style={{ left: `${pct}%`, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }} />
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* ── Chart Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="rounded-2xl border overflow-hidden"
              style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              {/* Chart header */}
              <div className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <span className="font-bold text-sm text-white/80">Price Chart</span>
                  <span className="text-xs text-white/30">— AI Prediction overlay</span>
                </div>
                {/* Period tabs */}
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => changePeriod(p.value)}
                      className={`period-tab ${period === p.value ? "active" : ""}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="p-2 pb-0">
                {loading ? (
                  <div className="h-72 shimmer rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }} />
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="rgba(255,255,255,0.15)"
                          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.15)"
                          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${v.toFixed(0)}`}
                          domain={["auto", "auto"]}
                          width={56}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fill="url(#gradPrice)"
                          dot={false}
                          activeDot={{ r: 5, fill: "#60a5fa", stroke: "rgba(59,130,246,0.3)", strokeWidth: 8 }}
                          name="Price"
                        />
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          fill="url(#gradPred)"
                          dot={false}
                          activeDot={{ r: 5, fill: "#a78bfa", stroke: "rgba(139,92,246,0.3)", strokeWidth: 8 }}
                          name="Predicted"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Volume chart */}
              {!loading && volumeData.length > 0 && (
                <div className="h-20 px-2 pb-2 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData.slice(-20)} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v: number) => [fmtVolume(v), "Volume"]}
                        contentStyle={{
                          background: "rgba(10,10,20,0.95)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          fontSize: 11,
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="volume" fill="rgba(59,130,246,0.2)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-5 px-5 py-3 border-t"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 rounded" style={{ background: "#3b82f6" }} />
                  <span className="text-xs text-white/30">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 rounded" style={{ background: "#8b5cf6", borderStyle: "dashed" }} />
                  <span className="text-xs text-white/30">AI Prediction</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <Zap className="h-3.5 w-3.5 text-purple-400/60" />
                  <span className="text-xs text-white/25">
                    Trend: <span className={`font-bold ${predData?.trend === "Up" ? "text-green-400" : predData?.trend === "Down" ? "text-red-400" : "text-yellow-400"}`}>
                      {predData?.trend ?? "—"}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ── Sentiment + News ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-5"
            >
              {/* Sentiment donut */}
              <div className="rounded-2xl border p-5"
                style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-bold text-white/80">Sentiment</span>
                </div>
                {loading ? (
                  <div className="h-48 shimmer rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
                ) : (
                  <>
                    <div className="relative h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius={52} outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "rgba(10,10,20,0.95)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 12, fontSize: 11, color: "#fff",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-white">{sentData?.sentiment ?? "—"}</span>
                        <span className={`text-xs font-bold font-mono-nums ${
                          (sentData?.score ?? 0) > 0 ? "text-green-400" : (sentData?.score ?? 0) < 0 ? "text-red-400" : "text-white/30"
                        }`}>
                          {(sentData?.score ?? 0).toFixed(3)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {[
                        { label: "Positive", color: "#22c55e" },
                        { label: "Negative", color: "#ef4444" },
                        { label: "Neutral",  color: "#6b7280" },
                      ].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                          <span className="text-[10px] text-white/35">{label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* News feed */}
              <div className="lg:col-span-2 rounded-2xl border overflow-hidden"
                style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 px-5 py-4 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                  <Newspaper className="h-4 w-4 text-blue-400" />
                  <span className="font-bold text-sm text-white/80">News Sentiment Feed</span>
                </div>
                <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" } as React.CSSProperties}>
                  {loading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="h-4 w-3/4 rounded shimmer mb-2.5" />
                        <div className="h-3 w-1/4 rounded shimmer" />
                      </div>
                    ))
                  ) : sentData?.news && sentData.news.length > 0 ? (
                    sentData.news.map((item, i) => {
                      const nColor =
                        item.sentiment === "Positive" ? { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", text: "#4ade80" } :
                        item.sentiment === "Negative" ? { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", text: "#f87171" } :
                        { bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)", text: "#9ca3af" };
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-start sm:items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.015] transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-white/70 hover:text-blue-400 transition-colors line-clamp-2 group-hover:text-white/90"
                            >
                              {item.title}
                            </a>
                            <p className="text-[10px] text-white/25 mt-1 uppercase tracking-wider font-semibold">
                              {item.publisher}
                            </p>
                          </div>
                          <span
                            className="shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
                            style={{ background: nColor.bg, border: `1px solid ${nColor.border}`, color: nColor.text }}
                          >
                            {item.sentiment}
                          </span>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Newspaper className="h-10 w-10 text-white/10 mb-3" />
                      <p className="text-sm text-white/25">No recent news found for {ticker}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>{/* end right col */}
        </div>{/* end main grid */}

        {/* ── Footer ────────────────────────────── */}
        <div className="text-center text-[11px] text-white/15 pb-4 space-y-1">
          <p>Market data provided via Yahoo Finance · Prices may be 15-min delayed · Auto-refreshes every 30 seconds</p>
          <p>© {new Date().getFullYear()} Market Pulse · AI predictions are for informational purposes only</p>
        </div>

        <PulseBot />
      </div>{/* end content */}
    </div>
  );
}
