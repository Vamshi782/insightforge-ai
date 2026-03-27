"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotState {
  loading: boolean;
  error: string | null;
  fileName?: string;
}

const EMPTY_FILTERS: FilterState = { categorical: {}, numeric: {} };

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Upload,
    title: "CSV & XLSX",
    desc: "Auto-detect delimiters, headers, and data types from any file",
    color: "text-accent",
    bg: "bg-accent/10 border-accent/20",
  },
  {
    icon: Sparkles,
    title: "AI cleaning",
    desc: "Nulls removed, types fixed, encoding issues repaired automatically",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: BarChart2,
    title: "Instant charts",
    desc: "Line, bar, pie, scatter — generated and explained by AI",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    icon: Zap,
    title: "AI chat analyst",
    desc: "Ask questions in plain English, get actionable answers instantly",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
  {
    icon: Database,
    title: "Multi-dataset",
    desc: "Upload two files and join them on common columns with one click",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: Shield,
    title: "Private by default",
    desc: "Your data never leaves your browser — 100% client-side processing",
    color: "text-rose-400",
    bg: "bg-rose-400/10 border-rose-400/20",
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
        const done = s.n < step;
        const active = s.n === step;
        return (
          <div key={s.n} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                done
                  ? "text-success"
                  : active
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-muted"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  done
                    ? "bg-success text-white"
                    : active
                    ? "bg-accent text-accent-fg"
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [slots, setSlots] = useState<[SlotState, SlotState]>([
    { loading: false, error: null },
    { loading: false, error: null },
  ]);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showJoin, setShowJoin] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Ref so the CTA button can scroll to the upload zone
  const uploadZoneRef = useRef<HTMLDivElement>(null);

  const isLoading = slots.some((s) => s.loading);
  const showLanding = datasets.length === 0 && !isLoading;

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

  const charts = useMemo(
    () => (filteredDataset ? generateCharts(filteredDataset) : []),
    [filteredDataset]
  );

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
      if (rows.length === 0)
        throw new Error("File parsed but contains no data rows.");

      const dataset = cleanDataset(rows, file.name);

      if (dataset.rowCount === 0) {
        throw new Error(
          dataset.cleaningLog[0]?.description ?? "Dataset is empty after cleaning."
        );
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
      const idx = prev.findIndex((d) => d.name.includes("⋈"));
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-5">

        {/* ── Hero (landing only) ─────────────────────────────────────────── */}
        {showLanding && (
          <div className="relative overflow-hidden">
            {/* Glow backdrop */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[400px] pointer-events-none animate-glow-pulse"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 65%)",
              }}
            />
            <div
              className="absolute top-16 right-1/4 w-[300px] h-[300px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.06) 0%, transparent 60%)",
              }}
            />

            {/* Hero content */}
            <div className="relative text-center pt-10 pb-8 animate-float-up">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Sparkles className="w-3 h-3" />
                Powered by Gemini AI
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-fg tracking-tight mb-5 leading-[1.08]">
                Turn raw data into
                <br />
                <span className="gradient-text">instant dashboards</span>
              </h1>

              {/* Sub-headline */}
              <p className="text-base sm:text-lg text-muted max-w-xl mx-auto mb-8 leading-relaxed">
                Upload any CSV or Excel file. InsightForge automatically cleans
                your data, generates visualisations, and answers questions
                about it with AI.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                <button
                  onClick={() =>
                    uploadZoneRef.current?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="flex items-center gap-2 bg-accent text-accent-fg px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-accent-hover transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload className="w-4 h-4" />
                  Upload your data — it&apos;s free
                </button>
                <span className="text-xs text-muted">
                  No sign-up · Runs in browser · Free forever
                </span>
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
                {[
                  "CSV & XLSX",
                  "100k+ rows",
                  "Auto-clean",
                  "AI analysis",
                  "Private",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-success shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Onboarding steps (visible once upload has started) ─────────── */}
        {!showLanding && <OnboardingSteps step={onboardingStep} />}

        {/* ── Upload zone ─────────────────────────────────────────────────── */}
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

        {/* ── Errors ──────────────────────────────────────────────────────── */}
        {slots.map(
          (s, i) =>
            s.error && (
              <div
                key={i}
                className="flex items-start gap-2.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 animate-slide-down"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold">Dataset {i + 1}:</span>{" "}
                  {s.error}
                </span>
              </div>
            )
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {isLoading && <DashboardSkeleton />}

        {/* ── Dashboard ───────────────────────────────────────────────────── */}
        {activeDataset && !isLoading && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <DatasetSwitcher
                  datasets={datasets}
                  activeId={activeDataset.id}
                  onSwitch={(id) => {
                    setActiveId(id);
                    setFilters(EMPTY_FILTERS);
                  }}
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
                    {showJoin ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
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

            {/* Multi-dataset comparison hint */}
            {baseDatasets.length === 2 && !showJoin && (
              <div className="flex items-center gap-2 text-xs text-muted bg-surface2 border border-stroke rounded-xl px-4 py-2.5 animate-fade-in">
                <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>
                  Two datasets loaded —{" "}
                  <strong className="text-fg">
                    {baseDatasets[0].name}
                  </strong>{" "}
                  ({baseDatasets[0].rowCount.toLocaleString()} rows) &amp;{" "}
                  <strong className="text-fg">
                    {baseDatasets[1].name}
                  </strong>{" "}
                  ({baseDatasets[1].rowCount.toLocaleString()} rows).{" "}
                  <button
                    onClick={() => setShowJoin(true)}
                    className="text-accent hover:underline font-medium"
                  >
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HealthScore dataset={activeDataset} />
              <CleaningLog
                steps={activeDataset.cleaningLog}
                rowCount={activeDataset.rowCount}
                originalRowCount={activeDataset.originalRowCount}
              />
            </div>

            {/* Filter bar */}
            <FilterBar
              dataset={activeDataset}
              filters={filters}
              onChange={setFilters}
              resultCount={filteredRows.length}
            />

            {/* KPI cards */}
            <KpiCards cards={kpiCards} />

            {/* Charts */}
            <DraggableDashboard
              charts={charts}
              storageKey={`insightforge-layout-${activeDataset.id}`}
            />

            {/* Virtualised table */}
            <VirtualTable dataset={activeDataset} rows={filteredRows} />
          </>
        )}

        {/* ── Demo preview + features (landing only) ──────────────────────── */}
        {showLanding && (
          <>
            <DemoPreview />

            <div className="pt-8 animate-float-up" style={{ animationDelay: "280ms" }}>
              <p className="text-center text-xs font-semibold text-muted uppercase tracking-widest mb-6">
                Everything you need to analyse data
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.title}
                    className={`bg-surface border rounded-xl p-4 hover:shadow-sm hover:scale-[1.01] transition-all duration-200 group animate-float-up ${f.bg}`}
                    style={{ animationDelay: `${320 + i * 50}ms` }}
                  >
                    <div
                      className={`w-8 h-8 ${f.bg} border rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                    >
                      <f.icon className={`w-4 h-4 ${f.color}`} />
                    </div>
                    <p className="text-sm font-semibold text-fg mb-1">{f.title}</p>
                    <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* Floating AI chat */}
      <AIChat datasets={datasets} />

      {/* Share modal */}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}
