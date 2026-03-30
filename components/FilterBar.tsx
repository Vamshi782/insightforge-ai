"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Dataset, FilterState } from "@/lib/types";
import { Filter, X, ChevronDown, Search } from "lucide-react";

interface Props {
  dataset: Dataset;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  resultCount: number;
}

interface OpenState {
  col: string;
  type: "categorical" | "numeric";
  top: number;
  left: number;
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

// Categorical multi-select dropdown — rendered with position:fixed to escape stacking contexts
function CatDropdown({
  col,
  values,
  selected,
  style,
  onClose,
  onChange,
}: {
  col: string;
  values: string[];
  selected: string[];
  style: React.CSSProperties;
  onClose: () => void;
  onChange: (vals: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onClose);

  const filtered = useMemo(
    () => values.filter((v) => v.toLowerCase().includes(search.toLowerCase())),
    [values, search]
  );

  function toggle(v: string) {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      onChange([...selected, v]);
    }
  }

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-56 bg-surface border border-stroke rounded-xl shadow-lg shadow-black/20 overflow-hidden animate-slide-down"
      style={style}
    >
      <div className="p-2 border-b border-stroke">
        <div className="flex items-center gap-1.5 bg-surface2 rounded-lg px-2 py-1">
          <Search className="w-3 h-3 text-muted shrink-0" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${col}…`}
            className="flex-1 text-xs bg-transparent text-fg placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted px-3 py-2">No results</p>
        )}
        {filtered.map((v) => (
          <label
            key={v}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-fg hover:bg-surface2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(v)}
              onChange={() => toggle(v)}
              className="accent-[var(--accent)]"
            />
            <span className="truncate flex-1">{v}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="border-t border-stroke px-3 py-2">
          <button
            onClick={() => onChange([])}
            className="text-xs text-danger hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}

// Numeric range dropdown — rendered with position:fixed
function NumDropdown({
  col,
  globalMin,
  globalMax,
  current,
  style,
  onClose,
  onChange,
}: {
  col: string;
  globalMin: number;
  globalMax: number;
  current: [number, number] | undefined;
  style: React.CSSProperties;
  onClose: () => void;
  onChange: (range: [number, number] | null) => void;
}) {
  const [lo, setLo] = useState(current?.[0] ?? globalMin);
  const [hi, setHi] = useState(current?.[1] ?? globalMax);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onClose);
  const step = (globalMax - globalMin) / 100 || 1;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-64 bg-surface border border-stroke rounded-xl shadow-lg shadow-black/20 p-3 animate-slide-down"
      style={style}
    >
      <p className="text-xs font-semibold text-fg mb-3">{col}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-accent font-mono">
          <span>{lo.toLocaleString()}</span>
          <span>{hi.toLocaleString()}</span>
        </div>
        <div className="space-y-1.5">
          <input
            type="range"
            min={globalMin}
            max={globalMax}
            step={step}
            value={lo}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLo(Math.min(v, hi));
              onChange([Math.min(v, hi), hi]);
            }}
            className="w-full h-1.5 accent-[var(--accent)]"
          />
          <input
            type="range"
            min={globalMin}
            max={globalMax}
            step={step}
            value={hi}
            onChange={(e) => {
              const v = Number(e.target.value);
              setHi(Math.max(v, lo));
              onChange([lo, Math.max(v, lo)]);
            }}
            className="w-full h-1.5 accent-[var(--accent)]"
          />
        </div>
      </div>
      {current && (
        <button
          onClick={() => { onChange(null); onClose(); }}
          className="mt-2 text-xs text-danger hover:underline"
        >
          Clear range
        </button>
      )}
    </div>
  );
}

export default function FilterBar({ dataset, filters, onChange, resultCount }: Props) {
  const [open, setOpen] = useState<OpenState | null>(null);

  // Close dropdown on scroll or resize to keep position accurate
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Exclude identifier columns from filters — they're row IDs, not filterable attributes
  const catCols = useMemo(
    () =>
      dataset.columns.filter(
        (c) =>
          c.type === "categorical" &&
          c.role !== "identifier" &&
          c.uniqueCount >= 2 &&
          c.uniqueCount <= 80
      ),
    [dataset.columns]
  );
  const numCols = useMemo(
    () =>
      dataset.columns.filter(
        (c) => c.type === "numeric" && c.role !== "identifier" && c.min !== undefined
      ),
    [dataset.columns]
  );

  const catValues = useMemo(() => {
    const out: Record<string, string[]> = {};
    catCols.forEach((col) => {
      out[col.name] = [
        ...new Set(
          dataset.rows.map((r) => String(r[col.name] ?? "")).filter(Boolean)
        ),
      ].sort();
    });
    return out;
  }, [catCols, dataset.rows]);

  const activeCount =
    Object.values(filters.categorical).filter((v) => v.length > 0).length +
    Object.keys(filters.numeric).length;

  function resetAll() {
    onChange({ categorical: {}, numeric: {} });
  }

  function openDropdown(
    col: string,
    type: "categorical" | "numeric",
    btn: HTMLElement
  ) {
    const rect = btn.getBoundingClientRect();
    setOpen({ col, type, top: rect.bottom + 4, left: rect.left });
  }

  if (catCols.length === 0 && numCols.length === 0) return null;

  return (
    <div className="bg-surface border border-stroke rounded-xl px-3 py-2.5 animate-slide-down">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
          {activeCount > 0 && (
            <span className="bg-accent text-accent-fg px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-stroke shrink-0" />

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {catCols.map((col) => {
            const selected = filters.categorical[col.name] ?? [];
            const isOpen = open?.col === col.name && open.type === "categorical";
            return (
              <button
                key={col.name}
                onClick={(e) => {
                  if (isOpen) setOpen(null);
                  else openDropdown(col.name, "categorical", e.currentTarget);
                }}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  selected.length > 0
                    ? "bg-accent/10 border-accent/40 text-accent"
                    : "border-stroke text-muted hover:border-accent/40 hover:text-fg"
                }`}
              >
                {col.name}
                {selected.length > 0 && (
                  <span className="bg-accent text-accent-fg text-[10px] px-1 rounded-full">
                    {selected.length}
                  </span>
                )}
                <ChevronDown className="w-3 h-3" />
              </button>
            );
          })}

          {numCols.map((col) => {
            const current = filters.numeric[col.name];
            const isOpen = open?.col === col.name && open.type === "numeric";
            return (
              <button
                key={col.name}
                onClick={(e) => {
                  if (isOpen) setOpen(null);
                  else openDropdown(col.name, "numeric", e.currentTarget);
                }}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  current
                    ? "bg-accent/10 border-accent/40 text-accent"
                    : "border-stroke text-muted hover:border-accent/40 hover:text-fg"
                }`}
              >
                {col.name}
                {current && (
                  <span className="text-[10px] font-mono">
                    {current[0].toLocaleString()}–{current[1].toLocaleString()}
                  </span>
                )}
                <ChevronDown className="w-3 h-3" />
              </button>
            );
          })}
        </div>

        {/* Result count + reset */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span className="text-xs text-muted">
            {resultCount.toLocaleString()} rows
          </span>
          {activeCount > 0 && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-xs text-danger hover:underline"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Fixed-position dropdowns — rendered here but visually escape stacking contexts */}
      {open?.type === "categorical" && (
        <CatDropdown
          col={open.col}
          values={catValues[open.col] ?? []}
          selected={filters.categorical[open.col] ?? []}
          style={{ top: open.top, left: open.left }}
          onClose={() => setOpen(null)}
          onChange={(vals) =>
            onChange({
              ...filters,
              categorical: { ...filters.categorical, [open.col]: vals },
            })
          }
        />
      )}
      {open?.type === "numeric" && (() => {
        const col = numCols.find((c) => c.name === open.col);
        if (!col) return null;
        return (
          <NumDropdown
            col={open.col}
            globalMin={col.min!}
            globalMax={col.max!}
            current={filters.numeric[open.col]}
            style={{ top: open.top, left: open.left }}
            onClose={() => setOpen(null)}
            onChange={(range) => {
              if (range === null) {
                const { [open.col]: _, ...rest } = filters.numeric;
                onChange({ ...filters, numeric: rest });
              } else {
                onChange({
                  ...filters,
                  numeric: { ...filters.numeric, [open.col]: range },
                });
              }
            }}
          />
        );
      })()}
    </div>
  );
}
