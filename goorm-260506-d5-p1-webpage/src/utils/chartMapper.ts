import type { ChartBlock } from "@/types/analysis";

/** 상관계수 [-1,1] → RGB (대시보드 히트맵용) */
export function heatmapCellColor(v: number): string {
  const t = (v + 1) / 2;
  const r = Math.round(255 * (1 - t));
  const g = Math.round(200 * (1 - Math.abs(v)));
  const b = Math.round(255 * t);
  return `rgb(${r},${g},${b})`;
}

export function chartNeedsScroll(c: ChartBlock): boolean {
  if (c.type === "heatmap") {
    const d = c.data as { labels?: string[] };
    return (d.labels?.length ?? 0) > 10;
  }
  return c.type === "pairplot";
}
