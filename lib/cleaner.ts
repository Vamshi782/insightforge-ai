import { CleaningStep, ColumnMeta, ColumnRole, ColumnType, Dataset } from "./types";

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

function stripNonPrintable(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

function looksLikeBinary(s: string): boolean {
  if (s.length === 0) return false;
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

function isGarbageHeader(h: string): boolean {
  const clean = stripNonPrintable(h);
  return (
    clean.length === 0 ||
    /^PK/.test(clean) ||
    looksLikeBinary(clean) ||
    /[\x00-\x1F]/.test(clean)
  );
}

// ─── Column role detection ─────────────────────────────────────────────────────

/**
 * Determines the semantic role of a column — mirrors Power BI auto-classify logic.
 *
 * identifier → excluded from every KPI card and chart axis
 * metric     → numeric measure (sales, profit, quantity) — KPIs + chart Y-axes
 * dimension  → categorical grouping (region, category) — chart X-axes / pie slices
 * date       → temporal column — line chart X-axis
 */
function detectColumnRole(
  normalizedName: string,
  type: ColumnType,
  vals: unknown[],
  uniqueCount: number,
  rowCount: number
): ColumnRole {
  if (type === "date") return "date";

  const n = normalizedName;

  // ── 1. Exact row-number / generic ID names ────────────────────────────────
  if (
    /^(id|row_id|rowid|idx|index|row_no|row_num|row_number|no|num|number|seq|sequence|serial|serial_no|record_no|entry_no|line_no)$/.test(n)
  ) {
    return "identifier";
  }

  // ── 2. Suffix patterns → always an identifier ─────────────────────────────
  //    customer_id, order_key, invoice_no, order_number, product_code, tx_ref …
  if (/(_id|_key|_no|_num|_number|_code|_ref|_pk|_uuid|_guid|_hash|_token|_sku)$/.test(n)) {
    return "identifier";
  }

  // ── 3. Prefix patterns ────────────────────────────────────────────────────
  if (/^(id_|key_|fk_|pk_)/.test(n)) {
    return "identifier";
  }

  // ── 4. Geographic / location identifiers ─────────────────────────────────
  if (
    /^(zip|postal|postcode|zip_code|zipcode|lat|latitude|lng|longitude|geohash|geo_hash|coordinates)$/.test(n) ||
    /postal|postcode|zipcode|zip_code/.test(n)
  ) {
    return "identifier";
  }

  // ── 5. Contact / personal / legal identifiers ─────────────────────────────
  if (
    /^(phone|mobile|tel|fax|ssn|sin|nin|ein|tax_id|national_id|passport|license|license_no|dob|birth_date)$/.test(n) ||
    /_(phone|mobile|tel|ssn|passport)$/.test(n)
  ) {
    return "identifier";
  }

  // ── 6. Product / inventory / catalogue codes ──────────────────────────────
  if (
    /^(sku|upc|ean|isbn|asin|barcode|part_no|part_number|item_code|item_no|product_code|style_no|catalog_no)$/.test(n)
  ) {
    return "identifier";
  }

  // ── 7. Data-driven detection for numeric columns ──────────────────────────
  if (type === "numeric") {
    const numVals = vals.filter((v) => typeof v === "number") as number[];

    if (numVals.length >= 10) {
      const allIntegers = numVals.every((v) => Number.isInteger(v));
      const uniqueRatio  = uniqueCount / rowCount;

      // Near-100 % unique integers with a large minimum → system-generated ID
      if (allIntegers && uniqueRatio >= 0.97 && rowCount > 20) {
        return "identifier";
      }

      // Sequential-ish integers starting near 0 or 1 → row numbers / counters
      if (allIntegers && uniqueCount === numVals.length) {
        const sorted   = [...numVals].sort((a, b) => a - b);
        const firstVal = sorted[0];
        const span     = sorted[sorted.length - 1] - firstVal;
        // span ≤ rowCount means dense sequence (row numbers with possible gaps)
        if (span <= rowCount && firstVal >= 0 && firstVal <= 100) {
          return "identifier";
        }
      }

      // 4–6 digit postal / geo codes with high uniqueness
      if (allIntegers) {
        const min = Math.min(...numVals);
        const max = Math.max(...numVals);
        if (min >= 1000 && max <= 999999 && uniqueRatio > 0.5 && rowCount > 20) {
          if (/code|zip|postal|post|geo/.test(n) || uniqueRatio > 0.9) {
            return "identifier";
          }
        }
      }
    }

    // Year-like values (1900–2200) with very low spread — treat as dimension/label
    if (numVals.length > 0) {
      const allIntegers = numVals.every((v) => Number.isInteger(v));
      if (allIntegers) {
        const min = Math.min(...numVals);
        const max = Math.max(...numVals);
        if (min >= 1900 && max <= 2200) {
          return "dimension"; // year columns group data, not aggregate it
        }
      }
    }

    return "metric";
  }

  // ── 8. High-cardinality strings → string IDs ─────────────────────────────
  if (type === "categorical") {
    if (uniqueCount / rowCount > 0.9 && rowCount > 30) return "identifier";
    return "dimension";
  }

  return "dimension";
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

  // ── Step 0: Sanitize string cells ────────────────────────────────────────────
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

  // ── Step 1: Drop garbage/binary columns ──────────────────────────────────────
  const allHeaders0 = Object.keys(rows[0] ?? {});
  const garbageColNames = allHeaders0.filter(isGarbageHeader);
  const binaryDataCols = allHeaders0.filter((h) => {
    if (garbageColNames.includes(h)) return false;
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
      description: `Dropped ${dropCols.size} column${dropCols.size > 1 ? "s" : ""} with unreadable or binary content`,
      count: dropCols.size,
      icon: "remove",
    });
    log("Dropped garbage columns", [...dropCols]);
  }

  if (rows.length === 0 || Object.keys(rows[0] ?? {}).length === 0) {
    return makeEmptyDataset(fileName, "All columns were corrupted or unreadable. Please check the file.");
  }

  // ── Step 2: Single-column delimiter detection ─────────────────────────────────
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

  // ── Step 3: Validate headers ──────────────────────────────────────────────────
  const rawHeaders = Object.keys(rows[0] ?? {});
  if (rawHeaders.length === 0) {
    return makeEmptyDataset(fileName, "No valid columns found after cleaning");
  }

  log("Columns before normalisation", { count: rawHeaders.length, columns: rawHeaders.slice(0, 10) });

  // ── Step 4: Normalize headers ─────────────────────────────────────────────────
  const headerMap: Record<string, string> = {};
  const usedNames = new Set<string>();
  let headerChanges = 0;

  rawHeaders.forEach((h, idx) => {
    let normalized = normalizeHeader(h);
    if (!normalized) normalized = `column_${idx + 1}`;
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

  // ── Step 5: Trim whitespace ───────────────────────────────────────────────────
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

  // ── Step 6: Detect column types ───────────────────────────────────────────────
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

  // ── Step 7: Convert numeric strings → numbers ─────────────────────────────────
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

  // ── Step 9: Drop entirely-empty columns ──────────────────────────────────────
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

  // ── Build column metadata (with role detection) ───────────────────────────────
  const columns: ColumnMeta[] = finalHeaders.map((h) => {
    const vals = rows.map((r) => r[h]);
    const nullCount = vals.filter(
      (v) => v === "" || v === null || v === undefined
    ).length;
    const strVals = vals.map((v) => String(v ?? ""));
    const uniqueCount = new Set(strVals).size;
    const sample = [...new Set(strVals.filter((v) => v !== ""))].slice(0, 3);
    const type: ColumnType = columnTypes[h] ?? "categorical";

    const role: ColumnRole = detectColumnRole(h, type, vals, uniqueCount, rows.length);

    const colMeta: ColumnMeta = {
      name: h,
      type,
      role,
      nullCount,
      uniqueCount,
      sample,
    };

    if (type === "numeric") {
      const nums = vals.filter((v) => typeof v === "number") as number[];
      if (nums.length > 0) {
        colMeta.min = Math.min(...nums);
        colMeta.max = Math.max(...nums);
      }
    }

    return colMeta;
  });

  // ── Log role summary ──────────────────────────────────────────────────────────
  const metrics = columns.filter((c) => c.role === "metric");
  const identifiers = columns.filter((c) => c.role === "identifier");
  const dimensions = columns.filter((c) => c.role === "dimension");

  log("Column roles", {
    metrics: metrics.map((c) => c.name),
    dimensions: dimensions.map((c) => c.name),
    identifiers: identifiers.map((c) => c.name),
  });

  if (identifiers.length > 0) {
    cleaningLog.push({
      id: "roles",
      description: `Identified ${identifiers.length} identifier column${identifiers.length > 1 ? "s" : ""} (${identifiers.map((c) => c.name).join(", ")}) — excluded from charts and KPIs`,
      count: identifiers.length,
      icon: "header",
    });
  }

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
