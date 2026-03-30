"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FileUpload from "@/components/FileUpload";
import CleaningLog from "@/components/CleaningLog";
import DraggableDashboard from "@/components/DraggableDashboard";
import KpiCards from "@/components/KpiCards";
import VirtualTable from "@/components/VirtualTable";
import AIChat from "@/components/AIChat";
import DatasetSwitcher from "@/components/DatasetSwitcher";
import FilterBar from "@/components/FilterBar";
import JoinPanel from "@/components/JoinPanel";
import HealthScore from "@/components/HealthScore";
import DemoPreview from "@/components/DemoPreview";
import BackgroundVideo from "@/components/BackgroundVideo";
import { DashboardSkeleton } from "@/components/Skeleton";
import { parseFile } from "@/lib/parsers";
import { cleanDataset } from "@/lib/cleaner";
import { generateCharts } from "@/lib/visualizer";
import { Dataset, FilterState } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import {
  AlertCircle,
  GitMerge,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles,
  Shield,
  Zap,
  Check,
  Share2,
  Copy,
  BarChart2,
  Database,
  Layers,
  ArrowRight,
  TrendingUp,
  Filter,
  Table2,
  Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotState {
  loading: boolean;
  error: string | null;
  fileName?: string;
}

const EMPTY_FILTERS: FilterState = { categorical: {}, numeric: {} };

// ─── Fade-up animation preset ─────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay },
  }),
};

// ─── Primary / Secondary buttons ──────────────────────────────────────────────

function PrimaryBtn({
  onClick,
  children,
  className = "",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-primary-glow inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm ${className}`}
    >
      <span className="glow-layer" />
      {children}
    </button>
  );
}

function SecondaryBtn({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-secondary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm"
    >
      {children}
    </button>
  );
}

// ─── Social proof avatars ──────────────────────────────────────────────────────

const AVATAR_COLORS = ["#6366f1", "#10b981", "#f59e0b"];
const AVATAR_INITIALS = ["A", "B", "C"];

function SocialProof() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2.5">
        {AVATAR_COLORS.map((color, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border-2 border-white/80 flex items-center justify-center text-white text-xs font-bold shadow-sm"
            style={{ background: color, zIndex: 3 - i }}
          >
            {AVATAR_INITIALS[i]}
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center gap-0.5 mb-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-xs text-white/80 font-medium">
          Trusted by <span className="text-white font-bold">210k+</span> data professionals
        </p>
      </div>
    </div>
  );
}

// ─── Features data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: "Auto Data Cleaning",
    desc: "Nulls, types, encoding — all fixed automatically before your first chart loads.",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: TrendingUp,
    title: "AI Insights",
    desc: "Ask plain-English questions and get direct, data-backed answers instantly.",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
  {
    icon: BarChart2,
    title: "Instant Charts",
    desc: "Line, bar, pie, scatter — generated and explained automatically from your data.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    icon: Database,
    title: "Multi-Dataset Join",
    desc: "Upload two files, detect common columns, and merge with one click.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: Table2,
    title: "SQL Generation",
    desc: "Get ready-to-run SQL queries for any question you ask the AI analyst.",
    color: "text-accent",
    bg: "bg-accent/10 border-accent/20",
  },
  {
    icon: Filter,
    title: "KPI Detection",
    desc: "Smart role detection separates real metrics from IDs, so KPIs are always meaningful.",
    color: "text-rose-400",
    bg: "bg-rose-400/10 border-rose-400/20",
  },
];

// ─── Fake reviews ─────────────────────────────────────────────────────────────

const REVIEWS = [
  {
    name: "Sarah K.",
    role: "Data Analyst @ Stripe",
    text: "InsightForge cut my reporting time by 70%. I upload a CSV and the dashboard is ready in seconds.",
    rating: 5,
    color: "#6366f1",
  },
  {
    name: "Marcus T.",
    role: "Business Intelligence Lead",
    text: "The AI chat is genuinely useful. It understands my data context and gives specific, accurate answers.",
    rating: 5,
    color: "#10b981",
  },
  {
    name: "Priya M.",
    role: "Product Manager @ Scale",
    text: "I sent this to our entire ops team. No more waiting for the data team to build reports.",
    rating: 5,
    color: "#f59e0b",
  },
];

// ─── Onboarding steps ─────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Upload data" },
  { n: 2, label: "Auto-analyse" },
  { n: 3, label: "Explore" },
];

function OnboardingSteps({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 animate-fade-in py-1">
      {STEPS.map((s, i) => {
        const done   = s.n < step;
        const active = s.n === step;
        return (
          <div key={s.n} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                done   ? "text-success"
                : active ? "bg-accent/10 text-accent border border-accent/30"
                : "text-muted"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  done   ? "bg-success text-white"
                  : active ? "bg-accent text-accent-fg"
                  : "bg-surface2 text-muted border border-stroke"
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : s.n}
              </div>
              <span className={active ? "font-semibold" : ""}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px mx-1 ${done ? "bg-success/50" : "bg-stroke"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Share modal ──────────────────────────────────────────────────────────────

function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const fakeUrl = "https://insightforge.ai/share/demo-abc123";

  function copy() {
    navigator.clipboard.writeText(fakeUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-stroke rounded-2xl p-6 w-[380px] shadow-2xl animate-scale-in">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center">
            <Share2 className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">Share Dashboard</p>
            <p className="text-xs text-muted">Anyone with the link can view</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-surface2 border border-stroke rounded-xl px-3 py-2 mb-4">
          <span className="text-xs text-muted flex-1 truncate font-mono">{fakeUrl}</span>
          <button
            onClick={copy}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              copied
                ? "bg-success/10 text-success border border-success/20"
                : "bg-accent text-accent-fg hover:bg-accent-hover"
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="text-xs text-muted bg-surface2 border border-stroke rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
          🔒 Shared views are read-only. Data is embedded in the link — no account required.
        </p>

        <button
          onClick={onClose}
          className="w-full text-xs text-muted hover:text-fg transition-colors py-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard section heading ─────────────────────────────────────────────────

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="text-sm font-semibold text-fg section-title">{title}</h2>
      {sub && <span className="text-xs text-muted">{sub}</span>}
      <div className="flex-1 h-px bg-stroke" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [datasets, setDatasets]     = useState<Dataset[]>([]);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [slots, setSlots]           = useState<[SlotState, SlotState]>([
    { loading: false, error: null },
    { loading: false, error: null },
  ]);
  const [filters, setFilters]       = useState<FilterState>(EMPTY_FILTERS);
  const [showJoin, setShowJoin]     = useState(false);
  const [showShare, setShowShare]   = useState(false);

  const uploadZoneRef = useRef<HTMLDivElement>(null);

  const isLoading     = slots.some((s) => s.loading);
  const showLanding   = datasets.length === 0 && !isLoading;
  const onboardingStep = isLoading ? 2 : datasets.length > 0 ? 3 : 1;

  const debouncedFilters = useDebounce(filters, 120);

  const activeDataset = useMemo(
    () => datasets.find((d) => d.id === activeId) ?? datasets[0] ?? null,
    [datasets, activeId]
  );

  const filteredRows = useMemo(() => {
    if (!activeDataset) return [];
    let rows = activeDataset.rows;
    Object.entries(debouncedFilters.categorical).forEach(([col, vals]) => {
      if (vals.length > 0)
        rows = rows.filter((r) => vals.includes(String(r[col] ?? "")));
    });
    Object.entries(debouncedFilters.numeric).forEach(([col, [lo, hi]]) => {
      rows = rows.filter((r) => {
        const v = Number(r[col]);
        return !isNaN(v) && v >= lo && v <= hi;
      });
    });
    return rows;
  }, [activeDataset, debouncedFilters]);

  const filteredDataset = useMemo(
    () =>
      activeDataset
        ? { ...activeDataset, rows: filteredRows, rowCount: filteredRows.length }
        : null,
    [activeDataset, filteredRows]
  );

  const charts   = useMemo(() => (filteredDataset ? generateCharts(filteredDataset) : []), [filteredDataset]);
  const kpiCards = useMemo(() => charts.filter((c) => c.type === "kpi"), [charts]);

  const handleFile = useCallback(async (file: File, slot: 0 | 1) => {
    setSlots((prev) => {
      const next = [...prev] as [SlotState, SlotState];
      next[slot] = { loading: true, error: null, fileName: file.name };
      return next;
    });
    setFilters(EMPTY_FILTERS);

    try {
      const { rows, error } = await parseFile(file);
      if (error) throw new Error(error);
      if (rows.length === 0) throw new Error("File parsed but contains no data rows.");

      const dataset = cleanDataset(rows, file.name);
      if (dataset.rowCount === 0) {
        throw new Error(dataset.cleaningLog[0]?.description ?? "Dataset is empty after cleaning.");
      }

      setDatasets((prev) => {
        const next = [...prev];
        if (next.length > slot) next[slot] = dataset;
        else next.push(dataset);
        return next;
      });
      setActiveId(dataset.id);
      setSlots((prev) => {
        const next = [...prev] as [SlotState, SlotState];
        next[slot] = { loading: false, error: null, fileName: file.name };
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process file";
      setSlots((prev) => {
        const next = [...prev] as [SlotState, SlotState];
        next[slot] = { loading: false, error: msg, fileName: undefined };
        return next;
      });
    }
  }, []);

  const clearSlot = useCallback((slot: 0 | 1) => {
    setDatasets((prev) => {
      const next = [...prev];
      if (next.length > slot) next.splice(slot, 1);
      return next;
    });
    setSlots((prev) => {
      const next = [...prev] as [SlotState, SlotState];
      next[slot] = { loading: false, error: null };
      return next;
    });
    setActiveId(null);
    setFilters(EMPTY_FILTERS);
    setShowJoin(false);
  }, []);

  const handleJoin = useCallback((joined: Dataset) => {
    setDatasets((prev) => {
      const idx  = prev.findIndex((d) => d.name.includes("⋈"));
      const next = [...prev];
      if (idx >= 0) next[idx] = joined;
      else next.push(joined);
      return next;
    });
    setActiveId(joined.id);
    setShowJoin(false);
    setFilters(EMPTY_FILTERS);
  }, []);

  const baseDatasets = useMemo(
    () => datasets.filter((d) => !d.name.includes("⋈")),
    [datasets]
  );

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar />

      <main className="flex-1 w-full">

        {/* ═══════════════════════════════════════════════════════════════════
            LANDING PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showLanding && (
            <div className="relative">
              {/* Full-screen background video */}
              <BackgroundVideo />

              {/* ── Hero ──────────────────────────────────────────────────── */}
              <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 pt-10 pb-24">
                {/* Badge */}
                <motion.div
                  variants={fadeUp} initial="hidden" animate="visible" custom={0}
                  className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
                >
                  <Sparkles className="w-3 h-3" />
                  Powered by Gemini AI
                </motion.div>

                {/* Headline */}
                <motion.h1
                  variants={fadeUp} initial="hidden" animate="visible" custom={0.08}
                  className="font-switzer text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.06] tracking-[-0.03em] mb-5 max-w-4xl"
                >
                  Manage your data workflows
                  <br />
                  while saving{" "}
                  <span className="gradient-text-orange">3× analysis time</span>
                </motion.h1>

                {/* Subhead */}
                <motion.p
                  variants={fadeUp} initial="hidden" animate="visible" custom={0.16}
                  className="text-base sm:text-lg text-white/75 max-w-xl mx-auto mb-10 leading-relaxed"
                >
                  InsightForge turns messy datasets into clean, actionable dashboards
                  instantly — no code, no sign-up required.
                </motion.p>

                {/* CTA buttons */}
                <motion.div
                  variants={fadeUp} initial="hidden" animate="visible" custom={0.24}
                  className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
                >
                  <PrimaryBtn
                    onClick={() => uploadZoneRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="group"
                  >
                    <Upload className="w-4 h-4" />
                    Upload your data — it&apos;s free
                    <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                  </PrimaryBtn>

                  <SecondaryBtn
                    onClick={() => uploadZoneRef.current?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <BarChart2 className="w-4 h-4" />
                    See live demo
                  </SecondaryBtn>
                </motion.div>

                {/* Social proof */}
                <motion.div
                  variants={fadeUp} initial="hidden" animate="visible" custom={0.32}
                  className="flex justify-center"
                >
                  <SocialProof />
                </motion.div>
              </section>

              {/* ── Demo preview (mock dashboard) ─────────────────────────── */}
              <section className="relative max-w-7xl mx-auto px-4 pb-16">
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <DemoPreview />
                </motion.div>
              </section>

              {/* ── Upload zone ───────────────────────────────────────────── */}
              <section
                ref={uploadZoneRef}
                className="relative max-w-7xl mx-auto px-4 pb-16"
                id="upload"
              >
                <div className="text-center mb-8">
                  <h2 className="font-switzer text-2xl font-bold text-white mb-2 tracking-tight">
                    Try it now — upload any CSV or Excel
                  </h2>
                  <p className="text-white/60 text-sm">No sign-up. Processed entirely in your browser.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUpload
                    label="Upload Dataset 1"
                    loading={slots[0].loading}
                    fileName={slots[0].fileName}
                    onFile={(f) => handleFile(f, 0)}
                    onClear={() => clearSlot(0)}
                  />
                  <FileUpload
                    label="Upload Dataset 2 (optional)"
                    loading={slots[1].loading}
                    fileName={slots[1].fileName}
                    onFile={(f) => handleFile(f, 1)}
                    onClear={() => clearSlot(1)}
                  />
                </div>
                {slots.map((s, i) =>
                  s.error ? (
                    <div
                      key={i}
                      className="mt-3 flex items-start gap-2.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 animate-slide-down"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-semibold">Dataset {i + 1}:</span> {s.error}
                      </span>
                    </div>
                  ) : null
                )}
              </section>

              {/* ── Features section ──────────────────────────────────────── */}
              <section id="features" className="relative max-w-7xl mx-auto px-4 pb-20">
                <div className="text-center mb-10">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                    Everything you need
                  </p>
                  <h2 className="font-switzer text-3xl font-bold text-white tracking-tight">
                    Your complete data analysis platform
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {FEATURES.map((f, i) => (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      className={`bg-white/8 backdrop-blur-sm border rounded-xl p-4 hover:bg-white/12 hover:scale-[1.02] transition-all duration-200 group ${f.bg}`}
                    >
                      <div
                        className={`w-9 h-9 ${f.bg} border rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                      >
                        <f.icon className={`w-4.5 h-4.5 ${f.color}`} />
                      </div>
                      <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                      <p className="text-xs text-white/60 leading-relaxed">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* ── Trust chips ───────────────────────────────────────────── */}
              <section className="relative max-w-7xl mx-auto px-4 pb-12">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
                  {[
                    "CSV & XLSX",
                    "100k+ rows",
                    "Auto-clean",
                    "AI analysis",
                    "Private by default",
                    "No sign-up",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Reviews section ───────────────────────────────────────── */}
              <section id="reviews" className="relative max-w-7xl mx-auto px-4 pb-20">
                <div className="text-center mb-10">
                  <h2 className="font-switzer text-3xl font-bold text-white tracking-tight mb-2">
                    Loved by data professionals
                  </h2>
                  <p className="text-white/60 text-sm">Join 210k+ analysts saving hours every week</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {REVIEWS.map((r, i) => (
                    <motion.div
                      key={r.name}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/12 transition-colors"
                    >
                      <div className="flex items-center gap-0.5 mb-3">
                        {[...Array(r.rating)].map((_, j) => (
                          <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-sm text-white/85 leading-relaxed mb-4">&ldquo;{r.text}&rdquo;</p>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: r.color }}
                        >
                          {r.name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{r.name}</p>
                          <p className="text-[10px] text-white/50">{r.role}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* ── Final CTA ─────────────────────────────────────────────── */}
              <section className="relative max-w-3xl mx-auto px-4 pb-24 text-center">
                <h2 className="font-switzer text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                  Start analysing your data today
                </h2>
                <p className="text-white/60 mb-8">
                  Free forever · No sign-up · Runs in your browser
                </p>
                <PrimaryBtn
                  onClick={() => uploadZoneRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Upload className="w-4 h-4" />
                  Upload your first dataset
                  <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
              </section>
            </div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════════
            DASHBOARD (after upload)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="max-w-7xl w-full mx-auto px-4 py-8 space-y-6">

          {/* Upload zone + onboarding (dashboard mode) */}
          {!showLanding && (
            <>
              <OnboardingSteps step={onboardingStep} />

              <div ref={uploadZoneRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload
                  label="Upload Dataset 1"
                  loading={slots[0].loading}
                  fileName={slots[0].fileName}
                  onFile={(f) => handleFile(f, 0)}
                  onClear={() => clearSlot(0)}
                />
                <FileUpload
                  label="Upload Dataset 2 (optional)"
                  loading={slots[1].loading}
                  fileName={slots[1].fileName}
                  onFile={(f) => handleFile(f, 1)}
                  onClear={() => clearSlot(1)}
                />
              </div>

              {slots.map((s, i) =>
                s.error ? (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 animate-slide-down"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold">Dataset {i + 1}:</span> {s.error}
                    </span>
                  </div>
                ) : null
              )}
            </>
          )}

          {/* Loading skeleton */}
          {isLoading && <DashboardSkeleton />}

          {/* Dashboard */}
          {activeDataset && !isLoading && (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <DatasetSwitcher
                    datasets={datasets}
                    activeId={activeDataset.id}
                    onSwitch={(id) => { setActiveId(id); setFilters(EMPTY_FILTERS); }}
                  />

                  {baseDatasets.length >= 2 && (
                    <button
                      onClick={() => setShowJoin((v) => !v)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        showJoin
                          ? "bg-accent text-accent-fg border-accent"
                          : "border-stroke text-muted hover:border-accent/40 hover:text-fg"
                      }`}
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      Join datasets
                      {showJoin ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {filteredRows.length.toLocaleString()} /{" "}
                    {activeDataset.rowCount.toLocaleString()} rows ·{" "}
                    {activeDataset.columns.length} columns
                  </span>
                  <button
                    onClick={() => setShowShare(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-stroke text-muted hover:border-accent/40 hover:text-fg transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                </div>
              </div>

              {/* Multi-dataset hint */}
              {baseDatasets.length === 2 && !showJoin && (
                <div className="flex items-center gap-2 text-xs text-muted bg-surface2 border border-stroke rounded-xl px-4 py-2.5 animate-fade-in">
                  <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    Two datasets loaded —{" "}
                    <strong className="text-fg">{baseDatasets[0].name}</strong>{" "}
                    ({baseDatasets[0].rowCount.toLocaleString()} rows) &amp;{" "}
                    <strong className="text-fg">{baseDatasets[1].name}</strong>{" "}
                    ({baseDatasets[1].rowCount.toLocaleString()} rows).{" "}
                    <button onClick={() => setShowJoin(true)} className="text-accent hover:underline font-medium">
                      Join them →
                    </button>
                  </span>
                </div>
              )}

              {/* Join panel */}
              {showJoin && baseDatasets.length >= 2 && (
                <JoinPanel datasets={baseDatasets.slice(0, 2)} onJoin={handleJoin} />
              )}

              {/* Health + Cleaning log */}
              <div>
                <SectionHeading title="Data Quality" sub={`${activeDataset.cleaningLog.length} cleaning steps`} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <HealthScore dataset={activeDataset} />
                  <CleaningLog
                    steps={activeDataset.cleaningLog}
                    rowCount={activeDataset.rowCount}
                    originalRowCount={activeDataset.originalRowCount}
                  />
                </div>
              </div>

              {/* Filters */}
              <FilterBar
                dataset={activeDataset}
                filters={filters}
                onChange={setFilters}
                resultCount={filteredRows.length}
              />

              {/* KPI cards */}
              {kpiCards.length > 0 && (
                <div>
                  <SectionHeading title="Key Metrics" sub={`${kpiCards.length} KPI${kpiCards.length !== 1 ? "s" : ""}`} />
                  <div className="mt-3">
                    <KpiCards cards={kpiCards} />
                  </div>
                </div>
              )}

              {/* Charts */}
              {charts.some((c) => c.type !== "kpi") && (
                <div>
                  <SectionHeading title="Charts" sub="Drag to rearrange · Click chart type to switch" />
                  <div className="mt-3">
                    <DraggableDashboard
                      charts={charts}
                      storageKey={`insightforge-layout-${activeDataset.id}`}
                    />
                  </div>
                </div>
              )}

              {/* Data table */}
              <div>
                <SectionHeading title="Data Preview" sub={`${filteredRows.length.toLocaleString()} rows`} />
                <div className="mt-3">
                  <VirtualTable dataset={activeDataset} rows={filteredRows} />
                </div>
              </div>
            </>
          )}

          {/* Spacer when landing zone shows inside dashboard wrapper */}
          {showLanding && <div className="h-1" />}
        </div>
      </main>

      <Footer />
      <AIChat datasets={datasets} />
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}
