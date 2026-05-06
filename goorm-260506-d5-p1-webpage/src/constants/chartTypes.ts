import type { ChartType } from "@/types/analysis";

export const CHART_LABELS: Record<ChartType, string> = {
  histogram: "히스토그램",
  bar: "막대 차트",
  heatmap: "상관 히트맵",
  scatter: "산점도",
  scatterTrend: "회귀 트렌드",
  linechart: "라인 차트",
  pairplot: "쌍별 산점도",
  boxplot: "박스플롯",
};
