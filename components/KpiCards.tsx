"use client";

import { ChartSpec } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { humanize } from "@/lib/visualizer";

/**
 * Context-aware number formatter.
 * - Count/quantity columns → plain integer (no K/M abbreviation)
 * - Rate/percentage columns → show as %
 * - Default → M/K abbreviation for large financial values
 */
function fmtMetric(n: number, colName: string): string {
  const lower = colName.toLowerCase();

  if (/\b(count|qty|quantity|units|items|orders|transactions|records|num|number|year|month|quarter|week|day)\b/.test(lower)) {
    return Math.round(n).toLocaleString();
  }
  // Year-range values (1900–2200) → show as raw integer, never K/M
  if (Number.isInteger(n) && n >= 1900 && n <= 2200) {
    return String(Math.round(n));
  }
  if (/\b(rate|ratio|percent|pct|share|fraction|discount)\b/.test(lower)) {
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    return `${pct.toFixed(1)}%`;
  }
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 10_000)    return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtAvg(n: number, colName: string): string {
  const lower = colName.toLowerCase();
  if (/\b(count|qty|quantity|units|items|orders|transactions|records|num|number|year|month|quarter|week|day)\b/.test(lower)) {
    return Math.round(n).toLocaleString();
  }
  if (Number.isInteger(n) && n >= 1900 && n <= 2200) return String(Math.round(n));
  if (/\b(rate|ratio|percent|pct|share|fraction|discount)\b/.test(lower)) {
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    return `${pct.toFixed(1)}%`;
  }
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface Props {
  cards: ChartSpec[];
}

const ACCENT_BORDER = ["border-accent/30",      "border-emerald-400/30", "border-amber-400/30",  "border-cyan-400/30"];
const ACCENT_BG     = ["bg-accent/8",            "bg-emerald-400/8",      "bg-amber-400/8",       "bg-cyan-400/8"];
const ACCENT_TEXT   = ["text-accent",            "text-emerald-400",      "text-amber-400",       "text-cyan-400"];
const ACCENT_ICON   = ["bg-accent/15",           "bg-emerald-400/15",     "bg-amber-400/15",      "bg-cyan-400/15"];

export default function KpiCards({ cards }: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const d = card.data[0] as {
          value: number;
          avg: number;
          count: number;
          min?: number;
          max?: number;
        };

        const trend: "up" | "down" | "neutral" =
          d.value > d.avg * 1.05 ? "up"
          : d.value < d.avg * 0.95 ? "down"
          : "neutral";

        const label = humanize(card.title);

        return (
          <div
            key={card.title}
            className={`relative bg-surface border rounded-xl p-4 animate-fade-in hover:scale-[1.015] transition-all duration-200 overflow-hidden group ${ACCENT_BORDER[i % 4]}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Hover glow */}
            <div className={`absolute inset-0 ${ACCENT_BG[i % 4]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`} />

            <div className="relative">
              {/* Title row */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted font-medium truncate flex-1 pr-2" title={label}>
                  {label}
                </span>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${ACCENT_ICON[i % 4]} ${
                    trend === "up" ? "text-success"
                    : trend === "down" ? "text-danger"
                    : ACCENT_TEXT[i % 4]
                  }`}
                >
                  {trend === "up"   ? <TrendingUp   className="w-3.5 h-3.5" /> :
                   trend === "down" ? <TrendingDown  className="w-3.5 h-3.5" /> :
                                      <Minus         className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Primary value */}
              <p className={`text-2xl font-bold leading-none mb-2 ${ACCENT_TEXT[i % 4]}`}>
                {fmtMetric(d.value, card.title)}
              </p>

              {/* Secondary stats */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Avg</span>
                  <span className="text-fg font-medium">{fmtAvg(d.avg, card.title)}</span>
                </div>
                {d.min !== undefined && (
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Range</span>
                    <span className="text-fg font-medium font-mono text-[10px]">
                      {fmtAvg(d.min, card.title)} – {fmtAvg(d.max!, card.title)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Rows</span>
                  <span className="text-fg font-medium">{d.count.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
