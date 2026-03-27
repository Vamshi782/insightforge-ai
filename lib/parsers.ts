import Papa from "papaparse";

// ─── Logging ──────────────────────────────────────────────────────────────────

const LOG = "[InsightForge]";
function log(msg: string, data?: unknown) {
  // eslint-disable-next-line no-console
  console.log(`${LOG} ${msg}`, data ?? "");
}

// ─── Binary / corruption detection ────────────────────────────────────────────

/** Returns true if the string contains control chars that indicate binary data. */
function hasBinaryContent(s: string): boolean {
  // Allow tab (0x09), LF (0x0A), CR (0x0D) — block everything else below 0x20
  return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(s);
}

/** Returns true if the row has any cell that looks like binary garbage. */
function isBinaryRow(row: Record<string, unknown>): boolean {
  return Object.values(row).some(
    (v) => typeof v === "string" && hasBinaryContent(v)
  );
}

// ─── XLSX magic-byte detection ─────────────────────────────────────────────────

/**
 * Reads the first 4 bytes of the file and returns true if it matches the
 * ZIP/XLSX signature: PK\x03\x04 (50 4B 03 04).
 */
async function hasXlsxSignature(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(0, 4).arrayBuffer();
    const b = new Uint8Array(buf);
    return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  } catch {
    return false;
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parseFile(
  file: File
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const mimeIsXlsx =
    file.type.includes("spreadsheet") ||
    file.type.includes("excel") ||
    file.type === "application/zip"; // some browsers report zip MIME for xlsx

  log("File received", {
    name: file.name,
    ext,
    mime: file.type,
    size: `${(file.size / 1024).toFixed(1)} KB`,
  });

  // Magic-byte check — catches mislabelled files (e.g. .csv that is really .xlsx)
  const xlsxSignature = await hasXlsxSignature(file);
  log("Magic-byte check", { isXlsxSignature: xlsxSignature });

  const forceXlsx = ext === "xlsx" || ext === "xls" || mimeIsXlsx || xlsxSignature;

  if (forceXlsx) {
    log("Parsing method: XLSX");
    const result = await parseXLSX(file);

    if (result.error && !xlsxSignature) {
      // Extension said xlsx but magic bytes didn't confirm — maybe it's a renamed CSV
      log("XLSX parse failed and no magic signature; falling back to CSV");
      return parseCSVWithFallback(file);
    }

    log("XLSX result", {
      columns: result.rows.length > 0 ? Object.keys(result.rows[0]).length : 0,
      rows: result.rows.length,
      error: result.error,
    });
    return result;
  }

  if (ext === "csv" || ext === "txt" || ext === "") {
    if (xlsxSignature) {
      // .csv extension but the binary is actually xlsx — parse it properly
      log("CSV extension but XLSX signature detected — switching to XLSX parser");
      return parseXLSX(file);
    }
    log("Parsing method: CSV (with delimiter fallback)");
    return parseCSVWithFallback(file);
  }

  return { rows: [], error: `Unsupported file type: .${ext || "unknown"}` };
}

// ─── CSV parsing ───────────────────────────────────────────────────────────────

async function parseCSVWithFallback(
  file: File
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  // Pass 1: Papa auto-detect delimiter
  const auto = await parseCSVRaw(file, "");
  if (auto.error) return auto;

  const cols = auto.rows.length > 0 ? Object.keys(auto.rows[0]).length : 0;
  log("CSV auto-detect", { columns: cols, rows: auto.rows.length });

  // Reject if first rows look like binary
  const binaryRows = auto.rows.slice(0, 5).filter(isBinaryRow);
  if (binaryRows.length > 0) {
    log("Binary content detected in CSV parse — rejecting");
    return {
      rows: [],
      error:
        "File contains binary data. Please upload a valid CSV (.csv) or Excel (.xlsx) file.",
    };
  }

  // If only 1 column, Papa's auto-detect may have failed — try explicit delimiters
  if (cols <= 1 && auto.rows.length > 0) {
    log("Single column after auto-detect; trying explicit delimiters");
    const candidates: Array<[string, string]> = [
      [";", "semicolon"],
      ["\t", "tab"],
      ["|", "pipe"],
      [",", "comma"],
    ];
    for (const [delim, name] of candidates) {
      const retry = await parseCSVRaw(file, delim);
      if (!retry.error && retry.rows.length > 0) {
        const retryCols = Object.keys(retry.rows[0]).length;
        if (retryCols > 1) {
          log(`Delimiter re-parse success with ${name}`, { columns: retryCols });
          return retry;
        }
      }
    }
  }

  return auto;
}

function parseCSVRaw(
  file: File,
  delimiter: string
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimiter, // "" = auto-detect
      complete(results) {
        resolve({ rows: results.data as Record<string, unknown>[] });
      },
      error(err) {
        resolve({ rows: [], error: err.message });
      },
    });
  });
}

// ─── XLSX parsing ──────────────────────────────────────────────────────────────

async function parseXLSX(
  file: File
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  try {
    const { read, utils } = await import("xlsx");

    const buffer = await file.arrayBuffer();
    // cellDates: true → dates come as JS Date objects
    // raw: false     → everything is formatted as a string by xlsx
    const workbook = read(buffer, {
      type: "array",
      cellDates: true,
      cellText: false,
    });

    if (!workbook.SheetNames.length) {
      return { rows: [], error: "No sheets found in workbook" };
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    log("XLSX sheet selected", { name: sheetName });

    // 2-D array — gives full control over header discovery
    const raw = utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      dateNF: "yyyy-mm-dd",
      defval: "",
    }) as unknown[][];

    if (!raw.length) {
      return { rows: [], error: "Excel sheet is empty" };
    }

    // Find first row where at least one cell has content
    const headerRowIdx = raw.findIndex((row) =>
      row.some((cell) => String(cell ?? "").trim() !== "")
    );

    if (headerRowIdx === -1) {
      return { rows: [], error: "No header row found in Excel file" };
    }

    const headerRow = raw[headerRowIdx];

    // Sanitise headers — strip control chars, fall back to column_N
    const headers = headerRow.map((h, i) => {
      const s = String(h ?? "").trim().replace(/[\x00-\x1F\x7F]/g, "").trim();
      if (!s || /^PK/.test(s)) return `column_${i + 1}`;
      return s;
    });

    // If more than half the "headers" look like binary garbage, the file is corrupt
    const garbageHeaders = headers.filter(
      (h) => hasBinaryContent(h) || /^column_\d+$/.test(h)
    ).length;
    if (garbageHeaders > headers.length * 0.7 && headers.length > 2) {
      return {
        rows: [],
        error:
          "Excel file appears corrupted. Please re-export it from Excel and try again.",
      };
    }

    const dataRows = raw.slice(headerRowIdx + 1);
    log("XLSX data rows found", { headers: headers.length, dataRows: dataRows.length });

    const rows: Record<string, unknown>[] = dataRows
      .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
      .map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          const cell = row[i];
          if (cell instanceof Date) {
            obj[h] = cell.toISOString().slice(0, 10);
          } else {
            obj[h] = cell ?? "";
          }
        });
        return obj;
      });

    if (rows.length === 0) {
      return { rows: [], error: "Excel sheet has headers but no data rows" };
    }

    return { rows };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log("XLSX parse error", msg);
    return { rows: [], error: `Excel parsing failed: ${msg}` };
  }
}
