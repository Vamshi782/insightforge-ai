import { CleaningStep, ColumnMeta, ColumnType, Dataset } from "./types";

// ─── Logging ──────────────────────────────────────────────────────────────────

const LOG = "[InsightForge Cleaner]";
function log(msg: string, data?: unknown) {
  // eslint-disable-next-line no-console
  console.log(`${LOG} ${msg}`, data ?? "");
}

// ─── Date / number helpers ─────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}$/i,
];

function looksLikeDate(val: string): boolean {
  return DATE_PATTERNS.some((p) => p.test(val.trim()));
}

function looksLikeNumber(val: string): boolean {
  if (val === "") return false;
  return !isNaN(Number(val.replace(/,/g, "").replace(/\s/g, "")));
}

// ─── String sanitation ─────────────────────────────────────────────────────────

/**
 * Strips non-printable control characters (except tab and newline, which are
 * acceptable in cell values) from a string.
 */
function stripNonPrintable(s: string): string {
  // Remove 0x00–0x08, 0x0B, 0x0C, 0x0E–0x1F, 0x7F
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

/** Returns true if the string is predominantly binary/non-readable content. */
function looksLikeBinary(s: string): boolean {
  if (s.length === 0) return false;
  // Count printable ASCII characters (0x20–0x7E)
  let printable = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x20 && c <= 0x7e) printable++;
  }
  return printable / s.length < 0.6;
}

// ─── Header helpers ────────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Returns true if a header name looks like auto-generated garbage. */
function isGarbageHeader(h: string): boolean {
  const clean = stripNonPrintable(h);
  return (
    clean.length === 0 ||
    /^PK/.test(clean) ||            // ZIP signature leakage
    looksLikeBinary(clean) ||
    /[\x00-\x1F]/.test(clean)       // raw control chars remaining
  );
}

// ─── Column type detection ─────────────────────────────────────────────────────

function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v !== "" && v !== null);
  if (nonEmpty.length === 0) return "unknown";
  const numericCount = nonEmpty.filter(looksLikeNumber).length;
  const dateCount = nonEmpty.filter(looksLikeDate).length;
  const threshold = nonEmpty.length * 0.8;
  if (dateCount >= threshold) return "date";
  if (numericCount >= threshold) return "numeric";
  return "categorical";
}

// ─── Single-column delimiter detection ────────────────────────────────────────

/**
 * If the dataset has exactly one column, attempt to split every value by a
 * common delimiter. The first row is treated as the new header row.
 */
function detectAndSplit(
  rows: Record<string, unknown>[]
): { rows: Record<string, unknown>[]; detected: string | null } {
  if (rows.length < 2) return { rows, detected: null };
  const keys = Object.keys(rows[0]);
  if (keys.length !== 1) return { rows, detected: null };

  const sampleValues = rows.slice(0, 10).map((r) => String(r[keys[0]] ?? ""));
  const delimiters = [";", "\t", "|", ","];

  for (const delim of delimiters) {
    const counts = sampleValues.map((v) => v.split(delim).length);
    const consistent = counts.every((c) => c === counts[0] && c > 1);
    if (consistent && counts[0] > 1) {
      const headers = sampleValues[0].split(delim).map((h) => h.trim());
      const dataRows = rows.slice(1).map((row) => {
        const parts = String(row[keys[0]] ?? "").split(delim);
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          obj[h] = parts[i]?.trim() ?? "";
        });
        return obj;
      });
      return { rows: dataRows, detected: delim };
    }
  }
  return { rows, detected: null };
}

// ─── Main cleaner ──────────────────────────────────────────────────────────────

export function cleanDataset(
  rawRows: Record<string, unknown>[],
  fileName: string
): Dataset {
  const cleaningLog: CleaningStep[] = [];

  if (rawRows.length === 0) {
    return makeEmptyDataset(fileName, "File is empty or has no parseable rows");
  }

  const originalRowCount = rawRows.length;
  log("Starting clean", { file: fileName, rows: originalRowCount, columns: Object.keys(rawRows[0]).length });

  let rows = rawRows.map((r) => ({ ...r }));

  // ── Step 0: Sanitize all string cell values ──────────────────────────────────
  let sanitizeCount = 0;
  rows = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "string") {
        const clean = stripNonPrintable(v);
        if (clean !== v) sanitizeCount++;
        out[k] = clean;
      } else {
        out[k] = v;
      }
    }
    return out;
  });
  if (sanitizeCount > 0) {
    cleaningLog.push({
      id: "sanitize",
      description: `Stripped non-printable characters from ${sanitizeCount.toLocaleString()} cells`,
      count: sanitizeCount,
      icon: "trim",
    });
  }

  // ── Step 1: Drop garbage/binary columns ─────────────────────────────────────
  const allHeaders0 = Object.keys(rows[0] ?? {});
  const garbageColNames = allHeaders0.filter(isGarbageHeader);
  // Also drop columns where >60% of values look binary
  const binaryDataCols = allHeaders0.filter((h) => {
    if (garbageColNames.includes(h)) return false; // already caught
    const vals = rows.slice(0, 50).map((r) => String(r[h] ?? ""));
    const binaryCount = vals.filter((v) => v.length > 0 && looksLikeBinary(v)).length;
    const nonEmpty = vals.filter((v) => v.length > 0).length;
    return nonEmpty > 0 && binaryCount / nonEmpty > 0.6;
  });

  const dropCols = new Set([...garbageColNames, ...binaryDataCols]);
  if (dropCols.size > 0) {
    rows = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!dropCols.has(k)) out[k] = v;
      }
      return out;
    });
    cleaningLog.push({
      id: "drop_garbage",
      description: `Dropped ${dropCols.size} column${dropCols.size > 1 ? "s" : ""} with unreadable/binary content`,
      count: dropCols.size,
      icon: "remove",
    });
    log("Dropped garbage columns", [...dropCols]);
  }

  // After dropping garbage cols, if nothing remains → error
  if (rows.length === 0 || Object.keys(rows[0] ?? {}).length === 0) {
    return makeEmptyDataset(fileName, "All columns were corrupted or unreadable. Please check the file.");
  }

  // ── Step 2: Single-column delimiter detection ────────────────────────────────
  const { rows: splitRows, detected } = detectAndSplit(rows);
  if (detected) {
    rows = splitRows;
    cleaningLog.push({
      id: "split",
      description: `Re-split single-column data using "${detected === "\t" ? "\\t" : detected}" delimiter`,
      count: rows.length,
      icon: "split",
    });
    log("Delimiter split applied", { delimiter: detected, newColumns: Object.keys(rows[0] ?? {}).length });
  }

  // ── Step 3: Validate headers ─────────────────────────────────────────────────
  const rawHeaders = Object.keys(rows[0] ?? {});

  if (rawHeaders.length === 0) {
    return makeEmptyDataset(fileName, "No valid columns found after cleaning");
  }

  log("Columns before normalisation", { count: rawHeaders.length, columns: rawHeaders.slice(0, 10) });

  // ── Step 4: Normalize headers ────────────────────────────────────────────────
  const headerMap: Record<string, string> = {};
  const usedNames = new Set<string>();
  let headerChanges = 0;

  rawHeaders.forEach((h, idx) => {
    let normalized = normalizeHeader(h);
    if (!normalized) normalized = `column_${idx + 1}`;
    // Deduplicate
    let deduped = normalized;
    let suffix = 2;
    while (usedNames.has(deduped)) {
      deduped = `${normalized}_${suffix++}`;
    }
    usedNames.add(deduped);
    if (deduped !== h) headerChanges++;
    headerMap[h] = deduped;
  });

  rows = rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[headerMap[k] ?? k] = v;
    }
    return normalized;
  });

  if (headerChanges > 0) {
    cleaningLog.push({
      id: "headers",
      description: `Normalised ${headerChanges} column header${headerChanges > 1 ? "s" : ""} (lowercase, underscores)`,
      count: headerChanges,
      icon: "header",
    });
  }

  const headers = Object.keys(rows[0] ?? {});

  // ── Step 5: Trim whitespace ──────────────────────────────────────────────────
  let trimCount = 0;
  rows = rows.map((row) => {
    const trimmed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "string" && v !== v.trim()) {
        trimmed[k] = v.trim();
        trimCount++;
      } else {
        trimmed[k] = v;
      }
    }
    return trimmed;
  });
  if (trimCount > 0) {
    cleaningLog.push({
      id: "trim",
      description: `Trimmed whitespace in ${trimCount.toLocaleString()} cells`,
      count: trimCount,
      icon: "trim",
    });
  }

  // ── Step 6: Detect column types ──────────────────────────────────────────────
  const columnValues: Record<string, string[]> = {};
  headers.forEach((h) => {
    columnValues[h] = rows.map((r) => String(r[h] ?? ""));
  });

  const columnTypes: Record<string, ColumnType> = {};
  headers.forEach((h) => {
    columnTypes[h] = detectColumnType(columnValues[h]);
  });

  const dateCols = headers.filter((h) => columnTypes[h] === "date");
  const numericCols = headers.filter((h) => columnTypes[h] === "numeric");

  if (dateCols.length > 0) {
    cleaningLog.push({
      id: "dates",
      description: `Detected ${dateCols.length} date column${dateCols.length > 1 ? "s" : ""}: ${dateCols.join(", ")}`,
      count: dateCols.length,
      icon: "date",
    });
  }

  // ── Step 7: Convert numeric strings → numbers ────────────────────────────────
  let numericConversions = 0;
  rows = rows.map((row) => {
    const converted: Record<string, unknown> = { ...row };
    numericCols.forEach((col) => {
      const raw = String(row[col] ?? "")
        .replace(/,/g, "")
        .replace(/\s/g, "");
      if (raw !== "" && !isNaN(Number(raw))) {
        converted[col] = Number(raw);
        numericConversions++;
      }
    });
    return converted;
  });

  if (numericConversions > 0) {
    cleaningLog.push({
      id: "numeric",
      description: `Converted ${numericCols.length} column${numericCols.length > 1 ? "s" : ""} to numeric (${numericConversions.toLocaleString()} values)`,
      count: numericConversions,
      icon: "convert",
    });
  }

  // ── Step 8: Remove fully-empty rows ──────────────────────────────────────────
  const beforeNullRemove = rows.length;
  rows = rows.filter((row) =>
    Object.values(row).some(
      (v) => v !== "" && v !== null && v !== undefined && !Number.isNaN(v)
    )
  );
  const nullRowsRemoved = beforeNullRemove - rows.length;
  if (nullRowsRemoved > 0) {
    cleaningLog.push({
      id: "null_rows",
      description: `Removed ${nullRowsRemoved.toLocaleString()} fully empty row${nullRowsRemoved > 1 ? "s" : ""}`,
      count: nullRowsRemoved,
      icon: "remove",
    });
  }

  // ── Step 9: Drop columns that are entirely empty after cleaning ──────────────
  const emptyAfterClean = headers.filter((h) =>
    rows.every((r) => r[h] === "" || r[h] === null || r[h] === undefined)
  );
  if (emptyAfterClean.length > 0) {
    rows = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!emptyAfterClean.includes(k)) out[k] = v;
      }
      return out;
    });
    cleaningLog.push({
      id: "empty_cols",
      description: `Dropped ${emptyAfterClean.length} completely empty column${emptyAfterClean.length > 1 ? "s" : ""}`,
      count: emptyAfterClean.length,
      icon: "remove",
    });
  }

  const finalHeaders = Object.keys(rows[0] ?? {});
  log("Clean complete", {
    columnsIn: rawHeaders.length,
    columnsOut: finalHeaders.length,
    rowsIn: originalRowCount,
    rowsOut: rows.length,
  });

  // ── Build column metadata ────────────────────────────────────────────────────
  const columns: ColumnMeta[] = finalHeaders.map((h) => {
    const vals = rows.map((r) => r[h]);
    const nullCount = vals.filter(
      (v) => v === "" || v === null || v === undefined
    ).length;
    const strVals = vals.map((v) => String(v ?? ""));
    const uniqueCount = new Set(strVals).size;
    const sample = [...new Set(strVals.filter((v) => v !== ""))].slice(0, 3);

    const colMeta: ColumnMeta = {
      name: h,
      type: columnTypes[h] ?? "categorical",
      nullCount,
      uniqueCount,
      sample,
    };

    if ((columnTypes[h] ?? "categorical") === "numeric") {
      const nums = vals.filter((v) => typeof v === "number") as number[];
      if (nums.length > 0) {
        colMeta.min = Math.min(...nums);
        colMeta.max = Math.max(...nums);
      }
    }

    return colMeta;
  });

  return {
    id: crypto.randomUUID(),
    name: fileName,
    rawRows,
    rows,
    columns,
    cleaningLog,
    rowCount: rows.length,
    originalRowCount,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeEmptyDataset(fileName: string, reason: string): Dataset {
  return {
    id: crypto.randomUUID(),
    name: fileName,
    rawRows: [],
    rows: [],
    columns: [],
    cleaningLog: [{ id: "empty", description: reason, count: 0, icon: "remove" }],
    rowCount: 0,
    originalRowCount: 0,
  };
}
