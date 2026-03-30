"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type LayoutItem } from "react-grid-layout";
import { ChartSpec, ChartType } from "@/lib/types";
import {
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  ScatterChart as ScatterIcon,
  Table2,
  Download,
  HelpCircle,
  X,
  GripVertical,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter as ScatterPlot,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type PieLabelRenderProps,
} from "recharts";
import { humanize } from "@/lib/visualizer";

const COLORS = [
  "#6366f1","#22d3ee","#f59e0b","#10b981","#ef4444","#a855f7","#f97316","#14b8a6",
];

const TYPE_OPTS: { type: ChartType; icon: React.ReactNode; label: string }[] = [
  { type: "line",    icon: <TrendingUp  className="w-3.5 h-3.5" />, label: "Line"    },
  { type: "bar",     icon: <BarChart2   className="w-3.5 h-3.5" />, label: "Bar"     },
  { type: "pie",     icon: <PieIcon     className="w-3.5 h-3.5" />, label: "Pie"     },
  { type: "scatter", icon: <ScatterIcon className="w-3.5 h-3.5" />, label: "Scatter" },
  { type: "kpi",     icon: <Table2      className="w-3.5 h-3.5" />, label: "Table"   },
];

function fmt(val: unknown): string {
  if (typeof val === "number") {
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + "M";
    if (Math.abs(val) >= 1_000)     return (val / 1_000).toFixed(1) + "K";
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  const s = String(val);
  return s.length > 12 ? s.slice(0, 11) + "…" : s;
}

async function exportPng(el: HTMLDivElement | null, title: string) {
  const svg = el?.querySelector("svg");
  if (!svg) return;
  const data = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width  = svg.clientWidth  || 600;
    canvas.height = svg.clientHeight || 300;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.download = `${title}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--stroke)",
  borderRadius: 8,
  fontSize: 11,
  color: "var(--fg)",
};

function ChartBody({ chart, type }: { chart: ChartSpec; type: ChartType }) {
  if (type === "kpi") {
    const headers = chart.data.length > 0 ? Object.keys(chart.data[0]) : [];
    return (
      <div className="overflow-auto h-full rounded border border-stroke">
        <table className="text-xs w-full">
          <thead className="bg-surface2 sticky top-0">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-2 py-1.5 text-left text-muted font-semibold border-b border-stroke">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.data.slice(0, 30).map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-surface" : "bg-surface2/30"}>
                {headers.map((h) => (
                  <td key={h} className="px-2 py-1 text-fg truncate max-w-[120px]">{String(row[h] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (type === "line" && chart.xKey && chart.yKey) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data} margin={{ top: 8, right: 16, left: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" />
          <XAxis
            dataKey={chart.xKey}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={fmt}
            interval="preserveStartEnd"
            label={{ value: humanize(chart.xKey), position: "insideBottom", offset: -16, fontSize: 10, fill: "var(--muted)" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={fmt}
            label={{ value: humanize(chart.yKey), angle: -90, position: "insideLeft", offset: 8, fontSize: 10, fill: "var(--muted)" }}
            width={52}
          />
          <Tooltip
            formatter={(v, name) => [fmt(v), humanize(String(name))]}
            labelFormatter={(l) => String(l)}
            contentStyle={tooltipStyle}
          />
          <Line type="monotone" dataKey={chart.yKey} stroke={COLORS[0]} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (type === "bar" && chart.xKey && chart.yKey) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={fmt}
            label={{ value: humanize(chart.yKey), position: "insideBottom", offset: -4, fontSize: 10, fill: "var(--muted)" }}
          />
          <YAxis type="category" dataKey={chart.xKey} tick={{ fontSize: 10, fill: "var(--muted)" }} tickFormatter={fmt} width={90} />
          <Tooltip
            formatter={(v, name) => [fmt(v), humanize(String(name))]}
            labelFormatter={(l) => humanize(String(l))}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey={chart.yKey} fill={COLORS[1]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chart.data} dataKey="value" nameKey="name"
            cx="50%" cy="50%" outerRadius="65%"
            label={({ name, percent }: PieLabelRenderProps) =>
              `${String(name ?? "").slice(0, 10)} ${((Number(percent) || 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (type === "scatter" && chart.xKey && chart.yKey) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" />
          <XAxis
            dataKey={chart.xKey}
            name={humanize(chart.xKey)}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={fmt}
            label={{ value: humanize(chart.xKey), position: "insideBottom", offset: -16, fontSize: 10, fill: "var(--muted)" }}
          />
          <YAxis
            dataKey={chart.yKey}
            name={humanize(chart.yKey)}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={fmt}
            label={{ value: humanize(chart.yKey), angle: -90, position: "insideLeft", offset: 8, fontSize: 10, fill: "var(--muted)" }}
            width={52}
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
          <ScatterPlot data={chart.data} fill={COLORS[4]} fillOpacity={0.65} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
  return (
    <div className="flex items-center justify-center h-full text-xs text-muted">
      Select a compatible chart type above.
    </div>
  );
}

function ChartWidget({ chart }: { chart: ChartSpec }) {
  const [type, setType]             = useState<ChartType>(chart.type);
  const [showInfo, setShowInfo]     = useState(false);
  const containerRef                = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-surface border border-stroke rounded-xl flex flex-col h-full overflow-hidden group hover:shadow-md hover:shadow-black/5 transition-shadow">
      {/* Drag handle + header */}
      <div className="drag-handle flex items-center gap-1.5 px-3 py-2 border-b border-stroke cursor-grab active:cursor-grabbing select-none shrink-0 bg-surface2/30">
        <GripVertical className="w-3.5 h-3.5 text-muted/40 group-hover:text-muted/80 transition-colors" />
        <h4 className="text-xs font-semibold text-fg flex-1 truncate">{chart.title}</h4>

        <div className="flex items-center gap-0.5">
          {TYPE_OPTS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setType(opt.type)}
              title={opt.label}
              className={`p-1 rounded transition-colors ${
                type === opt.type
                  ? "bg-accent text-accent-fg"
                  : "text-muted hover:text-fg hover:bg-surface2"
              }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        {chart.explanation && (
          <button
            onClick={() => setShowInfo((v) => !v)}
            title="Why this chart?"
            className={`p-1 rounded transition-colors ${showInfo ? "text-accent" : "text-muted hover:text-fg"}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => exportPng(containerRef.current, chart.title)}
          title="Export PNG"
          className="p-1 rounded text-muted hover:text-fg hover:bg-surface2 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Explanation */}
      {showInfo && chart.explanation && (
        <div className="flex items-start gap-2 px-3 py-2 bg-accent/8 border-b border-accent/20 text-xs text-fg animate-slide-down shrink-0">
          <HelpCircle className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
          <span className="flex-1">{chart.explanation}</span>
          <button onClick={() => setShowInfo(false)} className="text-muted hover:text-fg shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div ref={containerRef} className="flex-1 p-2 min-h-0">
        <ChartBody chart={chart} type={type} />
      </div>
    </div>
  );
}

// --- Layout helpers ---
function buildDefaultLayout(charts: ChartSpec[]): LayoutItem[] {
  let y = 0;
  return charts.map((chart, i) => {
    const isKpi = chart.type === "kpi";
    if (!isKpi && i > 0 && i % 2 === 0) y += 5;
    return {
      i: String(i),
      x: isKpi ? (i % 4) * 3 : (i % 2) * 6,
      y: isKpi ? Math.floor(i / 4) * 3 : y,
      w: isKpi ? 3 : 6,
      h: isKpi ? 3 : 5,
      minW: 2,
      minH: 2,
    };
  });
}

interface Props {
  charts: ChartSpec[];
  storageKey: string;
}

export default function DraggableDashboard({ charts, storageKey }: Props) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [GridComp, setGridComp] = useState<React.ComponentType<any> | null>(null);

  const nonKpi = useMemo(() => charts.filter((c) => c.type !== "kpi"), [charts]);

  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    if (typeof window === "undefined") return buildDefaultLayout(nonKpi);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as LayoutItem[];
    } catch { /* ignore */ }
    return buildDefaultLayout(nonKpi);
  });

  useEffect(() => { setMounted(true); }, []);

  // Lazy-load grid to avoid SSR issues
  useEffect(() => {
    import("react-grid-layout").then((mod) => {
      setGridComp(() => mod.ResponsiveGridLayout);
    });
  }, []);

  // Rebuild layout when chart count changes
  useEffect(() => {
    setLayout(buildDefaultLayout(nonKpi));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonKpi.length]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleLayoutChange(newLayout: any) {
    const items = newLayout as LayoutItem[];
    setLayout(items);
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* ignore */ }
  }

  if (nonKpi.length === 0) return null;

  // Fallback grid before RGL loads
  if (!mounted || !GridComp) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nonKpi.map((chart, i) => (
          <div key={i} className="h-80 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <ChartWidget chart={chart} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="-mx-1">
      <GridComp
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1024, md: 768, sm: 480, xs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 2 }}
        rowHeight={60}
        dragConfig={{ handle: ".drag-handle" }}
        onLayoutChange={handleLayoutChange}
      >
        {nonKpi.map((chart, i) => (
          <div key={String(i)} className="animate-fade-in">
            <ChartWidget chart={chart} />
          </div>
        ))}
      </GridComp>
    </div>
  );
}
