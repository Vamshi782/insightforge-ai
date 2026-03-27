"use client";

import { CleaningStep } from "@/lib/types";
import {
  RefreshCw,
  Trash2,
  Scissors,
  Calendar,
  Tag,
  Split,
} from "lucide-react";

const ICONS: Record<CleaningStep["icon"], React.ReactNode> = {
  convert: <RefreshCw className="w-3.5 h-3.5 text-accent" />,
  remove: <Trash2 className="w-3.5 h-3.5 text-danger" />,
  trim: <Scissors className="w-3.5 h-3.5 text-yellow-500" />,
  date: <Calendar className="w-3.5 h-3.5 text-success" />,
  header: <Tag className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />,
  split: <Split className="w-3.5 h-3.5 text-accent" />,
};

interface Props {
  steps: CleaningStep[];
  rowCount: number;
  originalRowCount: number;
}

export default function CleaningLog({
  steps,
  rowCount,
  originalRowCount,
}: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="bg-surface border border-stroke rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-fg">Applied Steps</h3>
        <span className="text-xs text-muted">
          {rowCount.toLocaleString()} /{" "}
          {originalRowCount.toLocaleString()} rows
        </span>
      </div>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className="flex items-start gap-2.5 text-xs text-fg bg-surface2 rounded-lg px-3 py-2"
          >
            <span className="text-muted font-mono w-4 shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="mt-0.5 shrink-0">{ICONS[step.icon]}</span>
            <span>{step.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
