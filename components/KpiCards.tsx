"use client";

import { ChartSpec } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function fmt(n: unknown): string {
  const num = Number(n);
  if (isNaN(num)) return String(n);
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface Props {
  cards: ChartSpec[];
}

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

        // Trend: compare max to avg as a rough signal
        const spread = d.max !== undefined ? (d.max - (d.min ?? 0)) / Math.max(Math.abs(d.avg), 1) : 0;
        const trend: "up" | "down" | "neutral" =
          d.value > d.avg * 1.05 ? "up" : d.value < d.avg * 0.95 ? "down" : "neutral";

        const ACCENT_BG = ["bg-accent/10", "bg-success/10", "bg-amber-400/10", "bg-cyan-400/10"];
        const ACCENT_BORDER = ["border-accent/30", "border-success/30", "border-amber-400/30", "border-cyan-400/30"];
        const ACCENT_TEXT = ["text-accent", "text-success", "text-amber-400", "text-cyan-400"];

        return (
          <div
            key={card.title}
            className={`relative bg-surface/80 backdrop-blur-sm border rounded-xl p-4 animate-fade-in hover:scale-[1.02] transition-all duration-200 overflow-hidden group ${ACCENT_BORDER[i % 4]}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Subtle glow background */}
            <div className={`absolute inset-0 ${ACCENT_BG[i % 4]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`} />

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted truncate flex-1 pr-2">{card.title}</span>
                <div className={`flex items-center gap-0.5 ${
                  trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-muted"
                }`}>
                  {trend === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : trend === "down" ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>

              <p className={`text-2xl font-bold ${ACCENT_TEXT[i % 4]}`}>{fmt(d.value)}</p>

              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-muted">
                  avg <span className="text-fg font-medium">{fmt(d.avg)}</span>
                </p>
                {d.min !== undefined && (
                  <p className="text-xs text-muted">
                    <span className="text-fg font-medium">{fmt(d.min)}</span>
                    {" – "}
                    <span className="text-fg font-medium">{fmt(d.max)}</span>
                  </p>
                )}
                <p className="text-xs text-muted">
                  {d.count.toLocaleString()} rows
                  {spread > 2 && <span className="ml-1 text-amber-400">· high variance</span>}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
