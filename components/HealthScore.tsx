"use client";

import { useMemo } from "react";
import { Dataset } from "@/lib/types";
import { calculateHealth } from "@/lib/health";
import { ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react";
import { useState } from "react";

interface Props {
  dataset: Dataset;
}

const GRADE_CONFIG = {
  A: { color: "text-success", bg: "bg-success/10 border-success/20", icon: ShieldCheck, label: "Excellent" },
  B: { color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", icon: ShieldCheck, label: "Good" },
  C: { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", icon: ShieldAlert, label: "Fair" },
  D: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", icon: ShieldAlert, label: "Poor" },
  F: { color: "text-danger", bg: "bg-danger/10 border-danger/20", icon: ShieldX, label: "Critical" },
};

export default function HealthScore({ dataset }: Props) {
  const [expanded, setExpanded] = useState(false);
  const health = useMemo(() => calculateHealth(dataset), [dataset]);
  const cfg = GRADE_CONFIG[health.grade];
  const Icon = cfg.icon;

  return (
    <div className={`border rounded-xl p-3 ${cfg.bg} animate-fade-in`}>
      <div
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="relative shrink-0">
          {/* Circular progress */}
          <svg width="44" height="44" className="-rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--stroke)" strokeWidth="4" />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              strokeWidth="4"
              stroke="currentColor"
              className={cfg.color}
              strokeDasharray={`${(health.score / 100) * 113} 113`}
              strokeLinecap="round"
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${cfg.color}`}>
            {health.grade}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
            <span className="text-xs font-semibold text-fg">
              Data Health: {health.score}/100
            </span>
            <span className={`text-xs ${cfg.color}`}>({cfg.label})</span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {health.issues.length === 0
              ? "No issues detected"
              : `${health.issues.length} issue${health.issues.length > 1 ? "s" : ""} found`}
          </p>
        </div>

        <Info className="w-3.5 h-3.5 text-muted shrink-0" />
      </div>

      {expanded && health.issues.length > 0 && (
        <div className="mt-3 space-y-1.5 animate-slide-down">
          {health.issues.map((issue, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-fg bg-surface/50 rounded-lg px-3 py-2"
            >
              <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
              {issue}
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Null rate", value: `${(health.nullRate * 100).toFixed(1)}%` },
              { label: "Duplicates", value: `${(health.duplicateRate * 100).toFixed(1)}%` },
              { label: "Outliers", value: health.outlierCount.toLocaleString() },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={`text-base font-bold ${cfg.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
