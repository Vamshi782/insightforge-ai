"use client";

// Static dashboard preview shown on the landing page.
// All data is fake — it just illustrates what users will see after uploading.

const KPIS = [
  { label: "Revenue", value: "$2.4M", change: "+12.3%", up: true },
  { label: "Customers", value: "18.4K", change: "+8.1%", up: true },
  { label: "Avg Order", value: "$130", change: "-2.4%", up: false },
  { label: "Retention", value: "94.2%", change: "+1.8%", up: true },
];

const BARS = [
  { label: "Electronics", pct: 85 },
  { label: "Clothing", pct: 62 },
  { label: "Home & Garden", pct: 48 },
  { label: "Sports", pct: 35 },
  { label: "Books", pct: 22 },
];

const TABLE_ROWS = [
  { id: "001", customer: "Acme Corp", amount: "$12,450", status: "Paid" },
  { id: "002", customer: "Globex Inc", amount: "$8,320", status: "Paid" },
  { id: "003", customer: "Initech LLC", amount: "$5,640", status: "Pending" },
];

// Smooth, realistic-looking revenue curve
const LINE_D =
  "M0,58 C15,52 25,62 40,44 C55,28 70,50 90,36 C110,22 130,40 150,28 C165,18 185,30 200,18 C215,8 228,20 240,12";

export default function DemoPreview() {
  return (
    <div className="relative mx-auto max-w-2xl mt-10 mb-2 animate-fade-in" style={{ animationDelay: "200ms" }}>
      {/* Outer glow */}
      <div className="absolute -inset-6 rounded-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12), transparent 70%)" }}
      />

      <div className="relative rounded-xl border border-stroke overflow-hidden shadow-2xl shadow-black/10">
        {/* Browser chrome bar */}
        <div className="flex items-center gap-1.5 bg-surface2 border-b border-stroke px-4 py-2.5 select-none">
          <div className="w-2.5 h-2.5 rounded-full bg-danger/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-success/50" />
          <div className="ml-2 flex-1 bg-surface border border-stroke rounded-md px-3 py-0.5 text-[10px] text-muted flex items-center gap-1.5">
            <span className="text-success">🔒</span>
            insightforge.ai/dashboard
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
            Live
          </div>
        </div>

        {/* Dashboard body */}
        <div className="bg-surface p-3 space-y-2.5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-24 skeleton rounded" />
              <div className="h-5 w-16 skeleton rounded" />
            </div>
            <div className="h-5 w-20 skeleton rounded" />
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2">
            {KPIS.map((kpi, i) => (
              <div
                key={i}
                className="bg-surface2 border border-stroke rounded-lg p-2.5 hover:border-accent/30 transition-colors"
              >
                <p className="text-[9px] text-muted mb-1">{kpi.label}</p>
                <p className="text-sm font-bold text-fg leading-none mb-1">{kpi.value}</p>
                <p className={`text-[9px] font-semibold ${kpi.up ? "text-success" : "text-danger"}`}>
                  {kpi.change}
                </p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-[1fr_140px] gap-2.5">
            {/* Line chart */}
            <div className="bg-surface2 border border-stroke rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-semibold text-muted">Revenue over time</p>
                <span className="text-[8px] text-success bg-success/10 rounded px-1.5 py-0.5">+12.3%</span>
              </div>
              <svg viewBox="0 0 240 70" className="w-full" style={{ height: 56 }} aria-hidden>
                <defs>
                  <linearGradient id="demoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[20, 40, 60].map((y) => (
                  <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="var(--stroke)" strokeWidth="0.5" />
                ))}
                {/* Area fill */}
                <path
                  d={LINE_D + " L240,70 L0,70 Z"}
                  fill="url(#demoGrad)"
                />
                {/* Line */}
                <path
                  d={LINE_D}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* End dot */}
                <circle cx="240" cy="12" r="3" fill="var(--accent)" />
              </svg>
            </div>

            {/* Bar chart */}
            <div className="bg-surface2 border border-stroke rounded-lg p-2.5">
              <p className="text-[9px] font-semibold text-muted mb-2">By category</p>
              <div className="space-y-1.5">
                {BARS.map((bar) => (
                  <div key={bar.label} className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted w-14 truncate text-right shrink-0">
                      {bar.label}
                    </span>
                    <div className="flex-1 bg-stroke/60 rounded-full h-1.5">
                      <div
                        className="bg-accent rounded-full h-1.5 transition-all"
                        style={{ width: `${bar.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mini data table */}
          <div className="bg-surface2 border border-stroke rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 gap-0 text-[8px] font-semibold text-muted bg-surface border-b border-stroke px-3 py-1.5 uppercase tracking-wide">
              {["#", "Customer", "Amount", "Status"].map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {TABLE_ROWS.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-4 gap-0 text-[9px] text-fg px-3 py-1.5 border-b border-stroke/40 last:border-0 hover:bg-accent/4 transition-colors"
              >
                <span className="text-muted font-mono">{row.id}</span>
                <span className="truncate">{row.customer}</span>
                <span className="font-semibold text-success">{row.amount}</span>
                <span
                  className={`font-medium ${
                    row.status === "Paid" ? "text-success" : "text-amber-500"
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fade-out overlay + label */}
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--bg) 20%, transparent)" }}
        />
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[10px] text-muted bg-surface/90 border border-stroke rounded-full px-3 py-1 shadow-sm">
            Your data will look like this
          </span>
        </div>
      </div>
    </div>
  );
}
