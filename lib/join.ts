import { cleanDataset } from "./cleaner";
import { Dataset } from "./types";

export function findCommonColumns(ds1: Dataset, ds2: Dataset): string[] {
  const set1 = new Set(ds1.columns.map((c) => c.name));
  return ds2.columns.map((c) => c.name).filter((n) => set1.has(n));
}

export function joinDatasets(
  ds1: Dataset,
  ds2: Dataset,
  key: string
): Dataset {
  // Build lookup from ds1
  const map = new Map<string, Record<string, unknown>>();
  ds1.rows.forEach((row) => {
    const k = String(row[key] ?? "");
    if (k) map.set(k, row);
  });

  // Get ds2 column names excluding join key (for prefix)
  const ds2OtherCols = ds2.columns
    .map((c) => c.name)
    .filter((n) => n !== key);

  const joined = ds2.rows
    .filter((row) => map.has(String(row[key] ?? "")))
    .map((row2) => {
      const row1 = map.get(String(row2[key] ?? ""))!;
      const prefixed: Record<string, unknown> = {};
      ds2OtherCols.forEach((col) => {
        const safeKey = `${ds2.name.replace(/[^a-z0-9]/gi, "_")}_${col}`;
        prefixed[safeKey] = row2[col];
      });
      return { ...row1, ...prefixed };
    });

  return cleanDataset(
    joined,
    `${ds1.name} ⋈ ${ds2.name}`
  );
}
