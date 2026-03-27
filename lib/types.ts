export type ColumnType = "numeric" | "categorical" | "date" | "unknown";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  sample: string[];
}

export interface CleaningStep {
  id: string;
  description: string;
  count: number;
  icon: "convert" | "remove" | "trim" | "date" | "header" | "split";
}

export interface Dataset {
  id: string;
  name: string;
  rawRows: Record<string, unknown>[];
  rows: Record<string, unknown>[];
  columns: ColumnMeta[];
  cleaningLog: CleaningStep[];
  rowCount: number;
  originalRowCount: number;
}

export type ChartType = "line" | "bar" | "pie" | "kpi" | "scatter";

export interface ChartSpec {
  type: ChartType;
  title: string;
  xKey?: string;
  yKey?: string;
  dataKey?: string;
  data: Record<string, unknown>[];
  explanation?: string;
}

export interface AIAnalysis {
  insights: string[];
  sqlQueries: { label: string; query: string }[];
  chartSuggestions: string[];
}

export interface FilterState {
  categorical: Record<string, string[]>; // multi-select: col -> selected values[]
  numeric: Record<string, [number, number]>;
}

export interface SortState {
  column: string | null;
  direction: "asc" | "desc";
}

export interface JoinConfig {
  key: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface HealthReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  nullRate: number;
  duplicateRate: number;
  outlierCount: number;
  totalCells: number;
  issues: string[];
}
