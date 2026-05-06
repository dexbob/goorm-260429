import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_LABELS } from "@/constants/chartTypes";
import { cn } from "@/lib/utils";
import type { ChartBlock } from "@/types/analysis";
import { heatmapCellColor } from "@/utils/chartMapper";

function BoxplotChart({ data }: { data: Array<Record<string, number | string | null | undefined>> }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      {data.map((row) => {
        const feature = String(row.feature ?? "");
        const min = Number(row.min);
        const q1 = Number(row.q1);
        const med = Number(row.median);
        const q3 = Number(row.q3);
        const max = Number(row.max);
        if ([min, q1, med, q3, max].some((x) => Number.isNaN(x))) return null;
        const span = max - min || 1;
        const pct = (x: number) => ((x - min) / span) * 100;
        return (
          <div key={feature} className="min-w-0 w-full shrink">
            <p className="text-xs font-mono mb-1 truncate">{feature}</p>
            <div className="relative h-10 bg-muted rounded">
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 bg-primary/30 rounded"
                style={{ left: `${pct(q1)}%`, width: `${pct(q3) - pct(q1)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-px bg-foreground/40"
                style={{ left: `${pct(min)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-px bg-foreground/40"
                style={{ left: `${pct(max)}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-sm"
                style={{ left: `${pct(med)}%`, marginLeft: -2 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
              <span>{min.toFixed(2)}</span>
              <span>q1 {q1.toFixed(2)}</span>
              <span>med {med.toFixed(2)}</span>
              <span>q3 {q3.toFixed(2)}</span>
              <span>{max.toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScatterTrendChart({
  data,
}: {
  data: { points: Array<{ x: number; y: number }>; line: Array<{ x: number; y: number }> };
}) {
  const points = data?.points ?? [];
  const line = data?.line ?? [];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" dataKey="x" tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey="y" tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        <Scatter name="점" data={points} fill="hsl(262, 83%, 58%)" />
        <Line
          name="추세"
          type="linear"
          data={line}
          dataKey="y"
          stroke="hsl(35, 92%, 55%)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function HeatMap({ data }: { data: { labels: string[]; matrix: number[][] } }) {
  const n = data.labels.length;
  if (!n) return <p className="text-sm text-muted-foreground">상관계수를 계산할 수 없습니다.</p>;

  return (
    <div className="overflow-auto max-h-[220px] w-max max-w-full mx-auto">
      <table className="text-[10px] border-collapse w-max">
        <thead>
          <tr>
            <th className="p-1 w-20" />
            {data.labels.map((l) => (
              <th key={l} className="p-1 font-mono font-normal max-w-[3rem] truncate" title={l}>
                {l.slice(0, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.labels.map((ri, i) => (
            <tr key={`${ri}-${i}`}>
              <th className="text-left p-1 font-mono font-normal truncate max-w-[6rem]" title={ri}>
                {ri.slice(0, 12)}
              </th>
              {data.labels.map((cj, j) => {
                const v = data.matrix[i]?.[j] ?? 0;
                return (
                  <td
                    key={`${ri}-${cj}`}
                    className="p-1 text-center font-mono text-white/90"
                    style={{ background: heatmapCellColor(v) }}
                    title={`${ri} vs ${cj}: ${v.toFixed(3)}`}
                  >
                    {Math.abs(v) > 0.2 ? v.toFixed(1) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StackedBinaryBarChart({
  data,
}: {
  data: Array<{ name: string; zeroCount: number; oneCount: number }>;
}) {
  const rows = data.length;
  const innerHeight = Math.max(220, rows * 24);
  return (
    <div className="h-[340px] overflow-y-auto pr-1">
      <div style={{ height: innerHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} />
            <Tooltip />
            <Bar dataKey="zeroCount" stackId="bin01" fill="hsl(0, 84%, 60%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="oneCount" stackId="bin01" fill="hsl(221, 83%, 57%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function chartContentPaddingClass(chart: ChartBlock) {
  return cn(
    "px-3 pb-4 min-w-0",
    chart.type === "boxplot" && "overflow-x-hidden overflow-y-visible",
    chart.type !== "boxplot" && chart.type !== "heatmap" && chart.type !== "stackedBar" && "overflow-auto",
    chart.type === "heatmap" ? "overflow-auto max-h-[260px]" : "",
    chart.type !== "heatmap" &&
      chart.type !== "pairplot" &&
      chart.type !== "boxplot" &&
      chart.type !== "stackedBar"
      ? "h-[220px]"
      : chart.type === "pairplot"
        ? "max-h-[280px] overflow-auto"
        : "",
  );
}

function ChartPlots({ chart }: { chart: ChartBlock }) {
  return (
    <>
        {chart.type === "histogram" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(chart.data as Array<{ bin: string; count: number }>) ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bin" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chart.type === "bar" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={(chart.data as Array<{ name: string; value: number }>) ?? []}
              margin={{ left: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(173, 80%, 36%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chart.type === "stackedBar" && (
          <StackedBinaryBarChart
            data={
              (chart.data as Array<{ name: string; zeroCount: number; oneCount: number }>) ?? []
            }
          />
        )}

        {chart.type === "catJitterTrend" && (
          (() => {
            const payload = chart.data as {
              categories?: string[];
              points?: Array<{ x: number; y: number }>;
              trend?: Array<{ x: number; y: number }>;
            };
            const categories = payload?.categories ?? [];
            const points = payload?.points ?? [];
            const trend = payload?.trend ?? [];
            if (!categories.length || !points.length || !trend.length) {
              return (
                <p className="text-sm text-muted-foreground">
                  표시할 점 분포 데이터가 없습니다.
                </p>
              );
            }
            const tickMap = new Map<number, string>(
              categories.map((name, idx) => [idx, name]),
            );
            return (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 4, right: 8, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[-0.5, Math.max(0.5, categories.length - 0.5)]}
                    ticks={categories.map((_, idx) => idx)}
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => (tickMap.get(Number(v)) ?? "").slice(0, 10)}
                    interval={0}
                  />
                  <YAxis type="number" dataKey="y" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Scatter name="samples" data={points} fill="hsl(262, 83%, 58%)" />
                  <Line
                    name="mean trend"
                    type="linear"
                    dataKey="y"
                    stroke="hsl(35, 92%, 55%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            );
          })()
        )}

        {chart.type === "scatter" && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" dataKey="x" name="x" tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="y" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter
                name="points"
                data={(chart.data as Array<{ x: number; y: number }>) ?? []}
                fill="hsl(262, 83%, 58%)"
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {chart.type === "linechart" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={(chart.data as Array<{ index: number; value: number }>) ?? []}
              margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" dataKey="index" tick={{ fontSize: 10 }} name="index" />
              <YAxis type="number" dataKey="value" tick={{ fontSize: 11 }} name="value" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(199, 89%, 52%)"
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {chart.type === "scatterTrend" && (
          <ScatterTrendChart
            data={
              chart.data as {
                points: Array<{ x: number; y: number }>;
                line: Array<{ x: number; y: number }>;
              }
            }
          />
        )}

        {chart.type === "heatmap" && (
          <HeatMap data={chart.data as { labels: string[]; matrix: number[][] }} />
        )}

        {chart.type === "boxplot" && (
          <BoxplotChart data={(chart.data as Array<Record<string, number | string | null>>) ?? []} />
        )}

        {chart.type === "pairplot" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
            {((chart.data as Array<{ xCol: string; yCol: string; points: { x: number; y: number }[] }>) ?? []).map(
              (pair, idx) => (
                <div key={idx} className="h-[200px] min-h-[180px]">
                  <p className="text-xs text-center text-muted-foreground mb-1 font-mono truncate">
                    {pair.xCol} × {pair.yCol}
                  </p>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" dataKey="x" tick={{ fontSize: 9 }} />
                      <YAxis type="number" dataKey="y" tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Scatter data={pair.points} fill="hsl(330, 81%, 60%)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ),
            )}
          </div>
        )}
    </>
  );
}

interface ChartRendererProps {
  chart: ChartBlock;
  /** true면 카드 래핑 없이 플롯만 (외부 카드 안에 넣을 때 사용) */
  embedded?: boolean;
}

export function ChartRenderer({ chart, embedded }: ChartRendererProps) {
  const label = CHART_LABELS[chart.type] ?? chart.type;

  if (embedded) {
    return (
      <div className={chartContentPaddingClass(chart)}>
        <ChartPlots chart={chart} />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden h-full shadow-none border-border/80">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex flex-col gap-0.5 items-start">
          <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="line-clamp-2 font-medium leading-snug">{chart.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={chartContentPaddingClass(chart)}>
        <ChartPlots chart={chart} />
      </CardContent>
    </Card>
  );
}
