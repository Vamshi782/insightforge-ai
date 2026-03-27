import { Dataset, HealthReport } from "./types";

function sortedNums(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function calculateHealth(dataset: Dataset): HealthReport {
  const { rows, columns } = dataset;
  const totalCells = rows.length * columns.length;
  const issues: string[] = [];

  // --- Null rate ---
  const nullCells = columns.reduce((sum, col) => sum + col.nullCount, 0);
  const nullRate = totalCells > 0 ? nullCells / totalCells : 0;

  // --- Duplicate rate (sample first 5000 rows for perf) ---
  const sampleRows = rows.slice(0, 5000);
  const rowStrings = new Set(sampleRows.map((r) => JSON.stringify(r)));
  const duplicateRate = sampleRows.length > 0
    ? 1 - rowStrings.size / sampleRows.length
    : 0;

  // --- Outlier count (IQR method on numeric cols) ---
  let outlierCount = 0;
  columns
    .filter((c) => c.type === "numeric" && c.min !== undefined)
    .forEach((col) => {
      const vals = rows
        .map((r) => Number(r[col.name]))
        .filter((v) => !isNaN(v));
      if (vals.length < 4) return;
      const sorted = sortedNums(vals);
      const q1 = percentile(sorted, 25);
      const q3 = percentile(sorted, 75);
      const iqr = q3 - q1;
      if (iqr === 0) return;
      const lo = q1 - 1.5 * iqr;
      const hi = q3 + 1.5 * iqr;
      outlierCount += vals.filter((v) => v < lo || v > hi).length;
    });

  // --- Score deductions ---
  let score = 100;

  if (nullRate > 0.01) {
    const pen = Math.min(nullRate * 40, 30);
    score -= pen;
    issues.push(
      `${(nullRate * 100).toFixed(1)}% of cells are empty (${nullCells.toLocaleString()} cells)`
    );
  }
  if (duplicateRate > 0.01) {
    const pen = Math.min(duplicateRate * 40, 25);
    score -= pen;
    const dupCount = Math.round(duplicateRate * sampleRows.length);
    issues.push(`~${dupCount.toLocaleString()} duplicate rows detected`);
  }
  if (outlierCount > 0) {
    const outlierRate = outlierCount / rows.length;
    const pen = Math.min(outlierRate * 40, 20);
    score -= pen;
    issues.push(
      `${outlierCount.toLocaleString()} statistical outlier${outlierCount > 1 ? "s" : ""} found`
    );
  }

  score = Math.max(0, Math.round(score));

  const grade =
    score >= 90
      ? "A"
      : score >= 75
        ? "B"
        : score >= 60
          ? "C"
          : score >= 40
            ? "D"
            : "F";

  return {
    score,
    grade,
    nullRate,
    duplicateRate,
    outlierCount,
    totalCells,
    issues,
  };
}
