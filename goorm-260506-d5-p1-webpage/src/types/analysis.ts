export type ChartType =
  | "histogram"
  | "bar"
  | "heatmap"
  | "scatter"
  | "scatterTrend"
  | "linechart"
  | "pairplot"
  | "boxplot";

export interface ColumnInventoryRow {
  name: string;
  dtype: string;
  /** 파이프라인 분류: 고유값 20 미만 등은 범주형으로 묶였을 수 있습니다. */
  role: "numeric" | "categorical";
  nunique: number;
  missingPct: number;
}

export interface Profile {
  rows: number;
  columns: number;
  originalRows?: number;
  sampled: boolean;
  missingPct: Record<string, number>;
  dtypes: Record<string, string>;
  numericColumns: string[];
  categoricalColumns: string[];
  targetColumn: string | null;
}

export interface ChartBlock {
  id: string;
  title: string;
  type: ChartType;
  data: unknown;
}

export interface AnalysisResult {
  profile: Profile;
  /** 모든 컬럼의 타입·분류·고유값 수·결측률 — 개요 표에 전량 표시 */
  columnInventory?: ColumnInventoryRow[];
  describeNumeric: Record<string, Record<string, number | null | undefined>>;
  categoricalFrequency: Record<string, Array<{ name: string; value: number }>>;
  /** 히트맵에 넣은 열 부분 집합에 대한 피어슨 행렬(전체 피처일 때 과도하게 커지지 않도록) */
  correlationPreview: Record<string, Record<string, number>>;
  /** 히트맵 열 부분 집합에서 |r|이 큰 쌍 순 */
  topPearsonPairs?: Array<{ x: string; y: string; r: number }>;
  charts: ChartBlock[];
  meta?: {
    pipeline?: string;
    style?: string;
    chartCount?: number;
    heatmapColumns?: number;
    notes?: string[];
  };
}

export interface AnalyzeResponse {
  analysis: AnalysisResult;
  notebookFileName: string;
  notebookBase64: string;
  uploadedName: string;
}
