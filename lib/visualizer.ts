import { ChartSpec, ColumnMeta, Dataset } from "./types";

function aggregate(
  rows: Record<string, unknown>[],
  catKey: string,
  numKey: string,
  maxBuckets = 15
): Record<string, unknown>[] {
  const map = new Map<string, number[]>();
  rows.forEach((row) => {
    const k = String(row[catKey] ?? "");
    const v = Number(row[numKey] ?? 0);
    if (!isNaN(v)) {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(v);
    }
  });

  return [...map.entries()]
    .map(([k, vals]) => ({
      [catKey]: k,
      [numKey]:
        Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) /
        100,
    }))
    .sort((a, b) => (b[numKey] as number) - (a[numKey] as number))
    .slice(0, maxBuckets);
}

export function generateCharts(dataset: Dataset): ChartSpec[] {
  const { rows, columns } = dataset;
  if (rows.length === 0) return [];

  const charts: ChartSpec[] = [];
  const dateCols = columns.filter((c) => c.type === "date");
  const numericCols = columns.filter((c) => c.type === "numeric");
  const catCols = columns.filter(
    (c) => c.type === "categorical" && c.uniqueCount >= 2 && c.uniqueCount <= 50
  );

  // KPI cards (top 4 numeric)
  numericCols.slice(0, 4).forEach((col) => {
    const vals = rows.map((r) => Number(r[col.name])).filter((v) => !isNaN(v));
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length ? sum / vals.length : 0;
    charts.push({
      type: "kpi",
      title: col.name,
      dataKey: col.name,
      explanation: `Numeric summary card for "${col.name}" — showing aggregate totals across ${vals.length.toLocaleString()} non-null values.`,
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

  // Line: date × numeric
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    numericCols.slice(0, 2).forEach((numCol) => {
      const data = rows
        .filter((r) => r[dateCol.name] && r[numCol.name] !== "")
        .map((r) => ({
          [dateCol.name]: String(r[dateCol.name]),
          [numCol.name]: Number(r[numCol.name]),
        }))
        .sort((a, b) =>
          String(a[dateCol.name]).localeCompare(String(b[dateCol.name]))
        )
        .slice(0, 500);

      if (data.length >= 2) {
        charts.push({
          type: "line",
          title: `${numCol.name} over ${dateCol.name}`,
          xKey: dateCol.name,
          yKey: numCol.name,
          explanation: `Line chart chosen because "${dateCol.name}" was detected as a date/time column. Line charts are best for showing trends and changes over time. Auto-sorted chronologically.`,
          data,
        });
      }
    });
  }

  // Bar: categorical × numeric
  if (catCols.length > 0 && numericCols.length > 0) {
    catCols.slice(0, 2).forEach((catCol) => {
      const numCol = numericCols[0];
      const data = aggregate(rows, catCol.name, numCol.name);
      if (data.length >= 2) {
        charts.push({
          type: "bar",
          title: `${numCol.name} by ${catCol.name}`,
          xKey: catCol.name,
          yKey: numCol.name,
          explanation: `Horizontal bar chart chosen because "${catCol.name}" is categorical with ${catCol.uniqueCount} unique values. Sorted by ${numCol.name} descending to highlight top performers. Values are averaged per category.`,
          data,
        });
      }
    });
  }

  // Pie: low-cardinality categorical
  const pieCandidates = catCols.filter(
    (c) => c.uniqueCount >= 2 && c.uniqueCount <= 10
  );
  if (pieCandidates.length > 0) {
    const catCol = pieCandidates[0];
    const countMap = new Map<string, number>();
    rows.forEach((r) => {
      const k = String(r[catCol.name] ?? "");
      countMap.set(k, (countMap.get(k) ?? 0) + 1);
    });
    const data = [...countMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    charts.push({
      type: "pie",
      title: `Distribution of ${catCol.name}`,
      dataKey: catCol.name,
      explanation: `Pie chart chosen because "${catCol.name}" has only ${catCol.uniqueCount} unique values (≤10), making it ideal for showing proportional distribution at a glance.`,
      data,
    });
  }

  // Scatter: two numeric columns
  if (numericCols.length >= 2) {
    const [xCol, yCol] = numericCols;
    const data = rows
      .map((r) => ({
        [xCol.name]: Number(r[xCol.name]),
        [yCol.name]: Number(r[yCol.name]),
      }))
      .filter((r) => !isNaN(r[xCol.name]) && !isNaN(r[yCol.name]))
      .slice(0, 1000);

    if (data.length >= 3) {
      charts.push({
        type: "scatter",
        title: `${yCol.name} vs ${xCol.name}`,
        xKey: xCol.name,
        yKey: yCol.name,
        explanation: `Scatter plot chosen because two numeric columns ("${xCol.name}" and "${yCol.name}") were detected. Scatter plots reveal correlations, clusters, and outliers between two continuous variables.`,
        data,
      });
    }
  }

  return charts;
}

export function buildSchema(dataset: Dataset): string {
  const lines: string[] = [
    `Table: ${dataset.name}`,
    `Rows: ${dataset.rowCount}`,
    "Columns:",
  ];
  dataset.columns.forEach((c) => {
    let meta = `  - ${c.name} (${c.type})`;
    if (c.type === "numeric" && c.min !== undefined) {
      meta += ` min=${c.min} max=${c.max}`;
    }
    if (c.type === "categorical") {
      meta += ` unique_values=${c.uniqueCount} samples=[${c.sample.join(", ")}]`;
    }
    lines.push(meta);
  });
  return lines.join("\n");
}

export function generateSuggestedQuestions(dataset: Dataset): string[] {
  const questions: string[] = [];
  const numCols = dataset.columns.filter((c) => c.type === "numeric");
  const catCols = dataset.columns.filter((c) => c.type === "categorical" && c.uniqueCount <= 20);
  const dateCols = dataset.columns.filter((c) => c.type === "date");

  if (catCols.length > 0 && numCols.length > 0) {
    questions.push(
      `What are the top 5 ${catCols[0].name} by ${numCols[0].name}?`
    );
  }
  if (dateCols.length > 0 && numCols.length > 0) {
    questions.push(
      `Show the trend of ${numCols[0].name} over ${dateCols[0].name}`
    );
  }
  if (numCols.length > 0) {
    questions.push(`What are the outliers in ${numCols[0].name}?`);
    questions.push(`Summarize the key statistics for ${numCols[0].name}`);
  }
  if (catCols.length > 0) {
    questions.push(
      `What is the distribution of ${catCols[0].name}?`
    );
  }
  if (numCols.length >= 2) {
    questions.push(
      `Is there a correlation between ${numCols[0].name} and ${numCols[1].name}?`
    );
  }

  return questions.slice(0, 5);
}
