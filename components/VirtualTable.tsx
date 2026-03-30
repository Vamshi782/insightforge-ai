"use client";

import { useMemo, useState } from "react";
import { List } from "react-window";
import { Dataset, SortState } from "@/lib/types";
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";

const ROW_HEIGHT = 34;
const TABLE_HEIGHT = 360;
const MIN_COL_WIDTH = 80;
const MAX_COL_WIDTH = 220;
const CHAR_WIDTH = 7;

function exportCSV(rows: Record<string, unknown>[], name: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const v = String(row[h] ?? "");
          return /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(",")
    ),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );
  a.download = `${name.replace(/\.[^.]+$/, "")}_cleaned.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Row component using v2 API — must return ReactElement | null (not wrapped in memo)
interface RowExtraProps {
  headers: string[];
  colWidths: number[];
  totalWidth: number;
  rows: Record<string, unknown>[];
}

interface RowProps extends RowExtraProps {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: "listitem" };
}

function TableRow({
  index, style, headers, colWidths, totalWidth, rows,
}: RowProps): React.ReactElement {
  const row = rows[index];
  return (
    <div
      style={{ ...style, width: Math.max(totalWidth, 600) }}
      className={`flex items-center border-b border-stroke/50 transition-colors ${
        index % 2 === 0 ? "bg-surface" : "bg-surface2/40"
      } hover:bg-accent/5`}
    >
      {headers.map((h, ci) => (
        <div
          key={h}
          style={{ width: colWidths[ci], minWidth: colWidths[ci] }}
          className="px-3 text-xs text-fg truncate"
          title={String(row?.[h] ?? "")}
        >
          {String(row?.[h] ?? "")}
        </div>
      ))}
    </div>
  );
}

interface Props {
  dataset: Dataset;
  rows: Record<string, unknown>[];
}

export default function VirtualTable({ dataset, rows }: Props) {
  const [sort, setSort] = useState<SortState>({ column: null, direction: "asc" });
  const [previewMode, setPreviewMode] = useState<"cleaned" | "raw">("cleaned");

  const sourceRows = previewMode === "raw" ? dataset.rawRows : rows;

  const headers = useMemo(
    () => (sourceRows.length > 0 ? Object.keys(sourceRows[0]) : []),
    [sourceRows]
  );

  const colRoleMap = useMemo(() => {
    const m: Record<string, string> = {};
    dataset.columns.forEach((c) => { m[c.name] = c.role; });
    return m;
  }, [dataset.columns]);

  const colWidths = useMemo(() => {
    return headers.map((h) => {
      const headerLen = h.length;
      const sampleLen = Math.max(
        ...sourceRows.slice(0, 50).map((r) => String(r[h] ?? "").length),
        0
      );
      const w = Math.max(headerLen, sampleLen) * CHAR_WIDTH + 32;
      return Math.min(Math.max(w, MIN_COL_WIDTH), MAX_COL_WIDTH);
    });
  }, [headers, sourceRows]);

  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  const sortedRows = useMemo(() => {
    if (!sort.column) return sourceRows;
    return [...sourceRows].sort((a, b) => {
      const av = a[sort.column!];
      const bv = b[sort.column!];
      if (typeof av === "number" && typeof bv === "number") {
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      return sort.direction === "asc"
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
  }, [sourceRows, sort]);

  function toggleSort(col: string) {
    setSort((prev) =>
      prev.column === col
        ? { column: col, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: col, direction: "asc" }
    );
  }

  if (headers.length === 0) return null;

  const listHeight = Math.min(
    TABLE_HEIGHT,
    sortedRows.length * ROW_HEIGHT + 1
  );

  return (
    <div className="bg-surface border border-stroke rounded-xl overflow-hidden animate-fade-in">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-stroke flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fg">Data Preview</span>
          <span className="text-xs bg-surface2 text-muted px-2 py-0.5 rounded-full border border-stroke">
            {sortedRows.length.toLocaleString()} × {headers.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dataset.rawRows.length > 0 && (
            <button
              onClick={() =>
                setPreviewMode((m) => (m === "cleaned" ? "raw" : "cleaned"))
              }
              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                previewMode === "raw"
                  ? "bg-accent text-accent-fg border-accent"
                  : "border-stroke text-muted hover:border-accent/30 hover:text-fg"
              }`}
            >
              {previewMode === "raw" ? "Raw data" : "Cleaned data"}
            </button>
          )}
          <button
            onClick={() => exportCSV(sortedRows, dataset.name)}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg border border-stroke text-muted hover:border-accent/30 hover:text-fg transition-colors"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Sticky header */}
        <div
          className="flex items-center bg-surface2 border-b border-stroke"
          style={{ width: Math.max(totalWidth, 600) }}
        >
          {headers.map((h, ci) => {
            const isActive = sort.column === h;
            return (
              <div
                key={h}
                style={{ width: colWidths[ci], minWidth: colWidths[ci] }}
                onClick={() => toggleSort(h)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-muted cursor-pointer hover:text-fg hover:bg-stroke/20 select-none transition-colors"
              >
                <span className="truncate">{h}</span>
                {colRoleMap[h] === "metric" && (
                  <span className="text-[9px] bg-accent/10 text-accent border border-accent/20 px-1 rounded shrink-0 font-semibold">M</span>
                )}
                {colRoleMap[h] === "dimension" && (
                  <span className="text-[9px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-1 rounded shrink-0 font-semibold">D</span>
                )}
                {colRoleMap[h] === "identifier" && (
                  <span className="text-[9px] bg-muted/10 text-muted border border-stroke px-1 rounded shrink-0 font-semibold">ID</span>
                )}
                {colRoleMap[h] === "date" && (
                  <span className="text-[9px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-1 rounded shrink-0 font-semibold">D8</span>
                )}
                {isActive ? (
                  sort.direction === "asc" ? (
                    <ArrowUp className="w-3 h-3 text-accent shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-accent shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-25 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Virtualised rows using v2 API */}
        <List
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rowComponent={TableRow as any}
          rowCount={sortedRows.length}
          rowHeight={ROW_HEIGHT}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rowProps={{ headers, colWidths, totalWidth, rows: sortedRows } as any}
          defaultHeight={listHeight}
          style={{ overflowX: "hidden" }}
        />
      </div>

      <div className="px-4 py-2 border-t border-stroke flex justify-between text-xs text-muted">
        <span>
          {sortedRows.length.toLocaleString()} rows (virtualised)
        </span>
        {sort.column && (
          <button
            onClick={() => setSort({ column: null, direction: "asc" })}
            className="hover:text-fg transition-colors"
          >
            Clear sort
          </button>
        )}
      </div>
    </div>
  );
}
