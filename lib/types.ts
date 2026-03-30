export type ColumnType = "numeric" | "categorical" | "date" | "unknown";

/**
 * Semantic role of a column in the dataset.
 * - metric:     a meaningful measure (sales, profit, quantity)
 * - dimension:  a grouping attribute (region, category, segment)
 * - identifier: a row ID, postal code, phone — excluded from charts/KPIs
 * - date:       a temporal value
 */
export type ColumnRole = "metric" | "dimension" | "identifier" | "date";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  role: ColumnRole;
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
  text?: string;            // primary conversational response
  insights: string[];
  sqlQueries: { label: string; query: string }[];
  chartSuggestions: string[];
}

export interface FilterState {
  categorical: Record<string, string[]>;
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
