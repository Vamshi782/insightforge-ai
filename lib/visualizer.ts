import { ChartSpec, ColumnMeta, Dataset } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aggregate(
  rows: Record<string, unknown>[],
  catKey: string,
  numKey: string,
  maxBuckets = 12
): Record<string, unknown>[] {
  const map = new Map<string, number[]>();
  rows.forEach((row) => {
    const k = String(row[catKey] ?? "Unknown");
    if (k === "" || k === "null" || k === "undefined") return;
    const v = Number(row[numKey] ?? 0);
    if (!isNaN(v)) {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(v);
    }
  });

  return [...map.entries()]
    .map(([k, vals]) => ({
      [catKey]: k,
      [numKey]: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
    }))
    .sort((a, b) => (b[numKey] as number) - (a[numKey] as number))
    .slice(0, maxBuckets);
}

/** Convert underscore_names → Human Readable Title */
export function humanize(key: string | undefined): string {
  if (!key) return "";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Chart generation ─────────────────────────────────────────────────────────

export function generateCharts(dataset: Dataset): ChartSpec[] {
  const { rows, columns } = dataset;
  if (rows.length === 0) return [];

  const charts: ChartSpec[] = [];

  // Role-filtered column sets
  const metricCols  = columns.filter((c) => c.role === "metric");
  const dimCols     = columns.filter((c) => c.role === "dimension" && c.uniqueCount >= 2 && c.uniqueCount <= 20);
  const dateCols    = columns.filter((c) => c.role === "date");

  // No fallback — only properly detected metric columns qualify
  if (metricCols.length === 0) return [];

  // ── KPI cards (up to 4 meaningful metrics) ────────────────────────────────────
  metricCols.slice(0, 4).forEach((col) => {
    const vals = rows.map((r) => Number(r[col.name])).filter((v) => !isNaN(v));
    if (vals.length === 0) return;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;

    charts.push({
      type: "kpi",
      title: col.name,
      dataKey: col.name,
      explanation: `${humanize(col.name)} — aggregate across ${vals.length.toLocaleString()} rows. Sum: ${sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}, Average: ${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`,
      data: [
        {
          label: "Total",
          value: Math.round(sum * 100) / 100,
          avg: Math.round(avg * 100) / 100,
          count: vals.length,
          min: col.min,
          max: col.max,
        },
      ],
    });
  });

  // ── Line: date × metric ───────────────────────────────────────────────────────
  if (dateCols.length > 0 && metricCols.length > 0) {
    const dateCol = dateCols[0];
    metricCols.slice(0, 2).forEach((numCol) => {
      const data = rows
        .filter((r) => r[dateCol.name] && r[numCol.name] !== "")
        .map((r) => ({
          [dateCol.name]: String(r[dateCol.name]),
          [numCol.name]: Number(r[numCol.name]),
        }))
        .filter((r) => !isNaN(r[numCol.name] as number))
        .sort((a, b) => String(a[dateCol.name]).localeCompare(String(b[dateCol.name])))
        .slice(0, 500);

      if (data.length >= 5) {
        charts.push({
          type: "line",
          title: `${humanize(numCol.name)} over Time`,
          xKey: dateCol.name,
          yKey: numCol.name,
          explanation: `${humanize(numCol.name)} plotted over ${humanize(dateCol.name)}. Line charts reveal trends, seasonality, and growth patterns over time.`,
          data,
        });
      }
    });
  }

  // ── Bar: dimension × metric ───────────────────────────────────────────────────
  if (dimCols.length > 0 && metricCols.length > 0) {
    const metricCol = metricCols[0];
    dimCols.slice(0, 2).forEach((dimCol) => {
      const data = aggregate(rows, dimCol.name, metricCol.name);
      if (data.length >= 2) {
        charts.push({
          type: "bar",
          title: `${humanize(metricCol.name)} by ${humanize(dimCol.name)}`,
          xKey: dimCol.name,
          yKey: metricCol.name,
          explanation: `${humanize(metricCol.name)} grouped by ${humanize(dimCol.name)} (${dimCol.uniqueCount} unique values). Values averaged per group, sorted descending to highlight top performers.`,
          data,
        });
      }
    });
  }

  // ── Pie: low-cardinality dimension ────────────────────────────────────────────
  const pieCandidates = dimCols.filter((c) => c.uniqueCount >= 2 && c.uniqueCount <= 8);
  if (pieCandidates.length > 0) {
    const dimCol = pieCandidates[0];
    const countMap = new Map<string, number>();
    rows.forEach((r) => {
      const k = String(r[dimCol.name] ?? "");
      if (k) countMap.set(k, (countMap.get(k) ?? 0) + 1);
    });
    const data = [...countMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (data.length >= 2) {
      charts.push({
        type: "pie",
        title: `${humanize(dimCol.name)} Distribution`,
        dataKey: dimCol.name,
        explanation: `${humanize(dimCol.name)} has ${dimCol.uniqueCount} distinct values — ideal for a pie chart showing proportional split across categories.`,
        data,
      });
    }
  }

  // ── Scatter: metric × metric ──────────────────────────────────────────────────
  if (metricCols.length >= 2) {
    const [xCol, yCol] = metricCols;
    const data = rows
      .map((r) => ({
        [xCol.name]: Number(r[xCol.name]),
        [yCol.name]: Number(r[yCol.name]),
      }))
      .filter((r) => !isNaN(r[xCol.name]) && !isNaN(r[yCol.name]))
      .slice(0, 1000);

    if (data.length >= 20) {
      // Require meaningful variance in both axes — reject near-constant columns
      const xVals = data.map((r) => r[xCol.name] as number);
      const yVals = data.map((r) => r[yCol.name] as number);
      const xRange = Math.max(...xVals) - Math.min(...xVals);
      const yRange = Math.max(...yVals) - Math.min(...yVals);
      const xMean = xVals.reduce((a, b) => a + b, 0) / xVals.length;
      const yMean = yVals.reduce((a, b) => a + b, 0) / yVals.length;
      const xVariance = xRange > 0 ? xRange / (Math.abs(xMean) || 1) : 0;
      const yVariance = yRange > 0 ? yRange / (Math.abs(yMean) || 1) : 0;
      if (xVariance > 0.01 && yVariance > 0.01) {
        charts.push({
          type: "scatter",
          title: `${humanize(yCol.name)} vs ${humanize(xCol.name)}`,
          xKey: xCol.name,
          yKey: yCol.name,
          explanation: `Scatter plot comparing ${humanize(xCol.name)} and ${humanize(yCol.name)}. Useful for detecting correlations, clusters, and outliers between two continuous metrics.`,
          data,
        });
      }
    }
  }

  return charts;
}

// ─── AI helpers ───────────────────────────────────────────────────────────────

export function buildSchema(dataset: Dataset): string {
  const lines: string[] = [
    `Table: ${dataset.name}`,
    `Rows: ${dataset.rowCount}`,
    "Columns:",
  ];
  dataset.columns.forEach((c) => {
    let meta = `  - ${c.name} (${c.type}, role:${c.role})`;
    if (c.type === "numeric" && c.min !== undefined) {
      meta += ` min=${c.min} max=${c.max}`;
    }
    if (c.type === "categorical") {
      meta += ` unique=${c.uniqueCount} samples=[${c.sample.join(", ")}]`;
    }
    lines.push(meta);
  });
  return lines.join("\n");
}

export function generateSuggestedQuestions(dataset: Dataset): string[] {
  const questions: string[] = [];
  const metrics  = dataset.columns.filter((c) => c.role === "metric");
  const dims     = dataset.columns.filter((c) => c.role === "dimension" && c.uniqueCount <= 20);
  const dates    = dataset.columns.filter((c) => c.role === "date");

  if (dims.length > 0 && metrics.length > 0) {
    questions.push(`What are the top 5 ${humanize(dims[0].name)} by ${humanize(metrics[0].name)}?`);
  }
  if (dates.length > 0 && metrics.length > 0) {
    questions.push(`Show the trend of ${humanize(metrics[0].name)} over ${humanize(dates[0].name)}`);
  }
  if (metrics.length > 0) {
    questions.push(`What are the outliers in ${humanize(metrics[0].name)}?`);
  }
  if (metrics.length >= 2) {
    questions.push(`Is there a correlation between ${humanize(metrics[0].name)} and ${humanize(metrics[1].name)}?`);
  }
  if (dims.length > 0) {
    questions.push(`What is the distribution of ${humanize(dims[0].name)}?`);
  }
  if (metrics.length > 0) {
    questions.push(`Summarise key statistics for ${humanize(metrics[0].name)}`);
  }

  return questions.slice(0, 5);
}
