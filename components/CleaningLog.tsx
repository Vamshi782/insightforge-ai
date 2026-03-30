"use client";

import { CleaningStep } from "@/lib/types";
import {
  RefreshCw,
  Trash2,
  Scissors,
  Calendar,
  Tag,
  Split,
  CheckCircle2,
} from "lucide-react";

const ICONS: Record<CleaningStep["icon"], React.ReactNode> = {
  convert: <RefreshCw className="w-3.5 h-3.5 text-accent" />,
  remove:  <Trash2    className="w-3.5 h-3.5 text-danger" />,
  trim:    <Scissors  className="w-3.5 h-3.5 text-yellow-500" />,
  date:    <Calendar  className="w-3.5 h-3.5 text-success" />,
  header:  <Tag       className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />,
  split:   <Split     className="w-3.5 h-3.5 text-accent" />,
};

interface Props {
  steps: CleaningStep[];
  rowCount: number;
  originalRowCount: number;
}

function buildSummary(steps: CleaningStep[], rowCount: number, originalRowCount: number): string {
  const parts: string[] = [];

  const removedRows = originalRowCount - rowCount;
  if (removedRows > 0) {
    parts.push(`removed ${removedRows.toLocaleString()} duplicate/empty row${removedRows !== 1 ? "s" : ""}`);
  }

  const convertTotal = steps
    .filter((s) => s.icon === "convert")
    .reduce((sum, s) => sum + s.count, 0);
  if (convertTotal > 0) {
    parts.push(`converted ${convertTotal.toLocaleString()} value${convertTotal !== 1 ? "s" : ""} to numeric`);
  }

  const identifierStep = steps.find((s) => s.icon === "header");
  if (identifierStep && identifierStep.count > 0) {
    parts.push(`excluded ${identifierStep.count} identifier column${identifierStep.count !== 1 ? "s" : ""} from charts`);
  }

  const dateTotal = steps
    .filter((s) => s.icon === "date")
    .reduce((sum, s) => sum + s.count, 0);
  if (dateTotal > 0) {
    parts.push(`parsed ${dateTotal.toLocaleString()} date value${dateTotal !== 1 ? "s" : ""}`);
  }

  if (parts.length === 0) return "Dataset is already clean — no changes needed.";
  return parts.join(" · ");
}

export default function CleaningLog({ steps, rowCount, originalRowCount }: Props) {
  if (steps.length === 0) return null;

  const summary = buildSummary(steps, rowCount, originalRowCount);

  return (
    <div className="bg-surface border border-stroke rounded-xl p-4 animate-fade-in space-y-3">
      {/* Summary banner */}
      <div className="flex items-start gap-2.5 bg-success/8 border border-success/20 rounded-lg px-3 py-2.5">
        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-fg mb-0.5">Data cleaned successfully</p>
          <p className="text-xs text-muted leading-relaxed">{summary}</p>
        </div>
        <span className="text-xs text-muted shrink-0 font-mono">
          {rowCount.toLocaleString()} / {originalRowCount.toLocaleString()} rows
        </span>
      </div>

      {/* Step-by-step log */}
      <div>
        <h3 className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Applied Steps</h3>
        <ol className="space-y-1">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className="flex items-start gap-2.5 text-xs text-fg bg-surface2 rounded-lg px-3 py-2"
            >
              <span className="text-muted font-mono w-4 shrink-0 mt-0.5">{i + 1}</span>
              <span className="mt-0.5 shrink-0">{ICONS[step.icon]}</span>
              <span className="flex-1">{step.description}</span>
              {step.count > 0 && (
                <span className="text-muted font-mono shrink-0">{step.count.toLocaleString()}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
