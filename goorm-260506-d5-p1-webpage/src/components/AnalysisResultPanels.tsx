import { useEffect, useMemo, useState } from "react";
import { ChartRenderer } from "@/components/ChartRenderer";
import { InsightPanel } from "@/components/InsightPanel";
import { SummaryCard } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInsightStream } from "@/hooks/useAnalysis";
import { downloadNotebook } from "@/services/analysisService";
import type {
  AnalysisResult,
  AnalyzeResponse,
  ChartBlock,
  ColumnInventoryRow,
} from "@/types/analysis";

function getColumnInventory(analysis: AnalysisResult): ColumnInventoryRow[] {
  if (analysis.columnInventory?.length) return analysis.columnInventory;
  const p = analysis.profile;
  const numSet = new Set(p.numericColumns);
  return Object.keys(p.dtypes).map((name) => ({
    name,
    dtype: p.dtypes[name] ?? "?",
    role: numSet.has(name) ? "numeric" : "categorical",
    nunique: 0,
    missingPct: p.missingPct[name] ?? 0,
  }));
}

/** 수치 describe / 범주 빈도를 나란히 둘 때 동일한 외곽 높이(내부는 스크롤) */
const EDA_TWIN_OUTER_HEIGHT = "h-[min(70vh,32rem)]";

function partitionVisualizationCharts(charts: ChartBlock[]) {
  const barFreqCharts = charts.filter((c) => c.id.startsWith("bar_freq-"));
  const targetMeanBarCharts = charts.filter((c) => c.id.startsWith("target_mean_bar-"));
  const restCharts = charts.filter(
    (c) => !c.id.startsWith("bar_freq-") && !c.id.startsWith("target_mean_bar-"),
  );
  return { barFreqCharts, targetMeanBarCharts, restCharts };
}

/** 피처 수가 적은 히트맵 등은 불필요하게 한 줄 전체를 쓰지 않도록 컬럼 span만 조정 */
function visualizationChartSpanClass(chart: ChartBlock): string {
  if (chart.type === "heatmap") {
    const labels = (chart.data as { labels?: string[] })?.labels;
    const n = labels?.length ?? 0;
    if (n === 0) return "";
    if (n <= 6) return "";
    if (n <= 14) return "sm:col-span-2 xl:col-span-2";
    return "sm:col-span-2 xl:col-span-3";
  }
  if (chart.type === "pairplot") {
    const pairs = Array.isArray(chart.data) ? chart.data.length : 0;
    if (pairs <= 4) return "";
    if (pairs <= 6) return "sm:col-span-2 xl:col-span-2";
    return "sm:col-span-2 xl:col-span-3";
  }
  return "";
}

interface Props {
  payload: AnalyzeResponse;
}

/** 업로드 화면 하단에서 쓰이는 분석 결과 전체(개요 · EDA · 시각화 · 인사이트). */
export function AnalysisResultPanels({ payload }: Props) {
  const { insightText, insightLoading, insightError, runInsights } = useInsightStream();

  useEffect(() => {
    void runInsights(payload.analysis);
  }, [payload, runInsights]);

  const { analysis, notebookBase64, notebookFileName, uploadedName } = payload;
  const inventory = getColumnInventory(analysis);

  const { barFreqCharts, targetMeanBarCharts: _targetMeanBarCharts, restCharts } = useMemo(
    () => partitionVisualizationCharts(analysis.charts),
    [analysis.charts],
  );

  const hasDescribeNum = Object.keys(analysis.describeNumeric).length > 0;
  const hasCatFreq =
    analysis.profile.categoricalColumns.length > 0 &&
    Object.keys(analysis.categoricalFrequency).length > 0;
  const edaTwinLayout = hasDescribeNum && hasCatFreq;

  return (
    <div className="mx-auto w-full max-w-none space-y-8 border-t border-border/60 pt-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">분석 결과</h2>
        <Button
          onClick={() => downloadNotebook(notebookBase64, notebookFileName)}
          variant="secondary"
          type="button"
        >
          .ipynb 다운로드
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">데이터 개요 및 설명</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-4xl">
          아래 카드에서 행·열 수, 수치/범주 분류, 결측이 있는 열 전체, 그리고 분류된 열 이름을 모두 확인할 수 있습니다.
          범주형으로 보이는 열이 적다면, 대부분의 피처가 고유값이 많은 연속형 수치로 분류된 경우가 많습니다. 전체 열 단위 상세는
          인벤토리 표를 참고하세요.
        </p>
        <div className="flex flex-col gap-4">
          <SummaryCard profile={analysis.profile} fileName={uploadedName} />
          <ColumnInventoryTable rows={inventory} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">EDA 분석</h3>
        <p className="text-sm text-muted-foreground">
          왼쪽은 수치형 <code className="text-xs">describe()</code>, 오른쪽은 범주형 값 빈도입니다. 넓은 화면에서는 좌측을 넓게
          잡습니다.
        </p>
        {(hasDescribeNum || hasCatFreq) && (
          <div
            className={cn(
              "flex flex-col gap-4 lg:flex-row lg:gap-6",
              edaTwinLayout && "lg:items-stretch",
            )}
          >
            <div
              className={cn(
                "min-w-0 flex-1 flex flex-col",
                edaTwinLayout && cn(EDA_TWIN_OUTER_HEIGHT, "min-h-0"),
              )}
            >
              {hasDescribeNum ? (
                <DescribeTable analysis={analysis} compactHeight fillTwin={edaTwinLayout} />
              ) : (
                <p className="text-sm text-muted-foreground">수치형 describe() 결과가 없습니다.</p>
              )}
            </div>
            {hasCatFreq && (
              <div
                className={cn(
                  "w-full shrink-0 flex flex-col min-h-0",
                  edaTwinLayout && cn(EDA_TWIN_OUTER_HEIGHT),
                  hasDescribeNum &&
                    "lg:max-w-[min(22rem,calc(92vw))] xl:max-w-sm lg:border-l lg:border-border/60 lg:pl-6",
                )}
              >
                <CategoricalFrequencySelector analysis={analysis} fillTwin={edaTwinLayout} />
              </div>
            )}
          </div>
        )}
        {!hasDescribeNum && !hasCatFreq ? (
          <p className="text-sm text-muted-foreground">표시할 EDA 카드가 없습니다.</p>
        ) : null}
        <TopPearsonPanel analysis={analysis} />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">데이터 시각화</h3>
        {analysis.meta?.notes?.length ? (
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            {analysis.meta.notes.filter(Boolean).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-muted-foreground">
          차트를 가능한 한 한 행에 2~3개씩 배치합니다. 변수가 적은 히트맵 등은 과도하게 가로 폭만 쓰지 않도록 했습니다
          {analysis.meta?.chartCount != null ? ` (약 ${analysis.meta.chartCount}개)` : ""}. 범주형 막대는 아래 한 카드에서 선택할 수
          있습니다.
        </p>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {restCharts.map((c) => {
            const span = visualizationChartSpanClass(c);
            return (
              <div key={c.id} className={cn("min-w-0 w-full max-w-full justify-self-stretch", span)}>
                <ChartRenderer chart={c} />
              </div>
            );
          })}
        </div>

        {barFreqCharts.length > 0 && <SelectableCategoricalBarCharts freqCharts={barFreqCharts} />}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">인사이트</h3>
        <InsightPanel text={insightText} loading={insightLoading} error={insightError} />
      </section>
    </div>
  );
}

/** 범주형 막대(값 빈도 / 타깃별 평균) 선택 뷰 */
function SelectableCategoricalBarCharts({ freqCharts }: { freqCharts: ChartBlock[] }) {
  const options = useMemo(() => {
    return freqCharts.map((c) => {
      const col = c.title.startsWith("Bar chart: ")
        ? c.title.slice("Bar chart: ".length)
        : c.title;
      return { key: c.id, label: col, chart: c };
    });
  }, [freqCharts]);

  const [leftKey, setLeftKey] = useState(options[0]?.key ?? "");
  const [rightKey, setRightKey] = useState(
    options.length ? options[options.length - 1].key : "",
  );

  useEffect(() => {
    if (options.length && !options.some((o) => o.key === leftKey)) {
      setLeftKey(options[0].key);
    }
  }, [options, leftKey]);

  useEffect(() => {
    if (options.length && !options.some((o) => o.key === rightKey)) {
      setRightKey(options[options.length - 1].key);
    }
  }, [options, rightKey]);

  const leftCurrent = options.find((o) => o.key === leftKey) ?? options[0];
  const rightCurrent = options.find((o) => o.key === rightKey) ?? options[options.length - 1];

  if (!leftCurrent && !rightCurrent) return null;

  function Panel({
    headerText,
    options,
    selectedKey,
    setSelectedKey,
    current,
  }: {
    headerText: string;
    options: Array<{ key: string; label: string; chart: ChartBlock }>;
    selectedKey: string;
    setSelectedKey: (v: string) => void;
    current?: { key: string; label: string; chart: ChartBlock };
  }) {
    return (
      <div className="min-w-0 rounded-lg border border-border/60 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50 bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground">{headerText}</p>
          {options.length > 1 ? (
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className={cn(
                "rounded-md border border-input bg-background px-2 py-1.5 text-sm font-mono text-xs",
                "max-w-[min(100%,20rem)] truncate",
              )}
              title={current?.label ?? ""}
            >
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : current ? (
            <span className="text-xs font-mono text-muted-foreground break-all">{current.label}</span>
          ) : (
            <span className="text-xs text-muted-foreground">선택 가능한 컬럼이 없습니다.</span>
          )}
        </div>
        <div className="min-h-[240px]">
          {current ? (
            <ChartRenderer chart={current.chart} />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">차트를 생성할 수 없습니다.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border/80 shadow-none w-full">
      <CardHeader className="gap-2">
        <CardTitle className="text-base">범주형 막대 차트</CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel
            headerText="값 빈도"
            options={options}
            selectedKey={leftKey}
            setSelectedKey={setLeftKey}
            current={leftCurrent}
          />
          <Panel
            headerText="값 빈도"
            options={options}
            selectedKey={rightKey}
            setSelectedKey={setRightKey}
            current={rightCurrent}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ColumnInventoryTable({ rows }: { rows: ColumnInventoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">전체 컬럼 인벤토리</CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          가로축에는 각 컬럼(피처) 이름을 두었습니다. 좌측 「항목」은 고정한 채 좌우로 스크롤하면 전열을 볼 수 있습니다. 합계{" "}
          {rows.length}열입니다.
        </p>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <div className="overflow-x-auto border border-border/60 rounded-md">
          <table className="w-max min-w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b bg-muted/90 backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                <th className="sticky left-0 z-30 min-w-[4.5rem] border-r border-border/60 px-2 py-2 text-left align-bottom text-xs font-medium">
                  항목
                </th>
                {rows.map((r) => (
                  <th
                    key={r.name}
                    scope="col"
                    className="max-w-[6.5rem] min-w-[3.75rem] border-b border-border/50 px-1.5 py-2 text-center align-bottom font-mono text-[10px] font-normal leading-tight tracking-tight shadow-[inset_-1px_0_0_0_rgb(148_163_184_/_.2)] text-foreground break-words [vertical-align:bottom]"
                    title={r.name}
                  >
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40 hover:bg-muted/25">
                <th
                  scope="row"
                  className="sticky left-0 z-20 whitespace-nowrap border-r border-border/60 bg-card px-2 py-1.5 text-left align-middle text-muted-foreground shadow-[4px_0_12px_-4px_rgb(0_0_0_/_20%)]"
                >
                  dtype
                </th>
                {rows.map((r) => (
                  <td key={`${r.name}-dtype`} className="border-r border-border/30 px-1.5 py-1.5 text-muted-foreground">
                    <span className="break-all">{r.dtype}</span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/40 hover:bg-muted/25">
                <th
                  scope="row"
                  className="sticky left-0 z-20 whitespace-nowrap border-r border-border/60 bg-card px-2 py-1.5 text-left shadow-[4px_0_12px_-4px_rgb(0_0_0_/_20%)]"
                >
                  분류
                </th>
                {rows.map((r) => (
                  <td key={`${r.name}-role`} className="border-r border-border/30 px-1.5 py-1.5">
                    {r.role}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/40 hover:bg-muted/25">
                <th
                  scope="row"
                  className="sticky left-0 z-20 whitespace-nowrap border-r border-border/60 bg-card px-2 py-1.5 text-left shadow-[4px_0_12px_-4px_rgb(0_0_0_/_20%)]"
                >
                  고유값
                </th>
                {rows.map((r) => (
                  <td
                    key={`${r.name}-nu`}
                    className="border-r border-border/30 px-1.5 py-1.5 text-right tabular-nums"
                  >
                    {r.nunique.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/25">
                <th
                  scope="row"
                  className="sticky left-0 z-20 whitespace-nowrap border-r border-border/60 bg-card px-2 py-1.5 text-left shadow-[4px_0_12px_-4px_rgb(0_0_0_/_20%)]"
                >
                  결측 %
                </th>
                {rows.map((r) => (
                  <td
                    key={`${r.name}-miss`}
                    className="border-r border-border/30 px-1.5 py-1.5 text-right tabular-nums text-muted-foreground"
                  >
                    {r.missingPct.toFixed(2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DescribeTable({
  analysis,
  compactHeight,
  fillTwin,
}: {
  analysis: AnalysisResult;
  compactHeight?: boolean;
  /** 범주형 패널과 한 줄일 때 카드 높이를 채우고 본문만 스크롤 */
  fillTwin?: boolean;
}) {
  const cols = Object.keys(analysis.describeNumeric);
  const manyCols = cols.length >= 10;

  if (cols.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">수치형으로 분류되어 describe() 통계가 있는 열이 없습니다.</p>
    );
  }

  const stats = ["count", "mean", "std", "min", "25%", "50%", "75%", "max"] as const;

  return (
    <Card
      className={cn(
        compactHeight && "flex min-h-0 flex-col",
        fillTwin ? "h-full" : "",
      )}
    >
      <CardHeader className="shrink-0 py-5">
        <CardTitle className="text-base">describe() — 수치형 전체 열 ({cols.length})</CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {manyCols
            ? "많은 컬럼일 때 헤더(열 이름)가 위에 고정되고 세로 방향 스크롤 시에 같이 따라옵니다. 좌측에는 stat 이름이 고정됩니다."
            : "통계 이름은 왼쪽에 고정됩니다."}
        </p>
      </CardHeader>
      <CardContent
        className={cn(
          "overflow-auto rounded-md border border-border/60 pb-4",
          compactHeight && fillTwin && "min-h-0 flex-1",
          compactHeight && !fillTwin && "max-h-[min(70vh,32rem)]",
        )}
      >
        <div className={cn(compactHeight && fillTwin && "min-h-0")}>
          <table className={cn(manyCols && "relative", "w-full text-sm border-collapse min-w-max")}>
            <thead className="sticky top-0 z-20 [&_tr]:border-b [&_tr]:shadow-sm">
              <tr className="border-b bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/85">
                <th
                  className={cn(
                    "sticky left-0 z-30 border-r border-border/60 bg-muted/95 p-2 text-left text-xs font-medium shadow-[4px_0_10px_-4px_rgba(0,0,0,.2)] backdrop-blur",
                    manyCols && "min-w-[3.75rem]",
                  )}
                >
                  stat
                </th>
                {cols.map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "p-2 text-center align-bottom font-mono font-normal shadow-[inset_-1px_0_0_0_rgb(148_163_184_/_25%)]",
                      manyCols
                        ? "max-w-[5.5rem] min-w-[3.75rem] text-[10px] leading-snug whitespace-normal break-words [writing-mode:vertical-rl] [transform:rotate(180deg)]"
                        : "text-[10px] max-w-[7rem]",
                    )}
                    title={c}
                  >
                    <span>{c}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="sticky left-0 z-[15] border-r border-border/60 bg-card p-2 text-xs font-medium text-muted-foreground shadow-[4px_0_10px_-4px_rgba(0,0,0,.15)]">
                    {s}
                  </td>
                  {cols.map((c) => {
                    const v = analysis.describeNumeric[c]?.[s];
                    if (v == null || Number.isNaN(Number(v))) {
                      return (
                        <td key={c} className="border-r border-border/30 p-2 text-right font-mono text-[10px] tabular-nums">
                          —
                        </td>
                      );
                    }
                    const n = Number(v);
                    const cell = s === "count" ? String(Math.round(n)) : n.toPrecision(4);
                    return (
                      <td key={c} className="border-r border-border/30 p-2 text-right font-mono text-[10px] tabular-nums">
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** 범주형 값 빈도 — 한 카드 안에서 컬럼 선택 */
function CategoricalFrequencySelector({
  analysis,
  fillTwin,
}: {
  analysis: AnalysisResult;
  fillTwin?: boolean;
}) {
  const entries = Object.entries(analysis.categoricalFrequency);

  const [column, setColumn] = useState(() => entries[0]?.[0] ?? "");

  useEffect(() => {
    const names = Object.keys(analysis.categoricalFrequency);
    if (!names.length) return;
    if (!names.includes(column)) setColumn(names[0]);
  }, [analysis.categoricalFrequency, column]);

  if (!entries.length) {
    return (
      <Card className={cn("border-border/80 shadow-none", fillTwin && "h-full flex flex-col min-h-0")}>
        <CardHeader className="shrink-0 py-4">
          <CardTitle className="text-base">범주형 값 빈도</CardTitle>
          <p className="text-xs text-muted-foreground">범주형으로 분류된 열이 없습니다.</p>
        </CardHeader>
      </Card>
    );
  }

  const freqRows = entries.find(([k]) => k === column)?.[1] ?? [];

  return (
    <Card
      className={cn(
        "border-border/80 shadow-none flex min-h-0 flex-col",
        fillTwin ? "h-full" : "max-h-[min(70vh,32rem)]",
      )}
    >
      <CardHeader className="shrink-0 gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
        <CardTitle className="text-base">범주형 값 빈도</CardTitle>
        {entries.length > 1 ? (
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:items-end">
            <span>열 선택</span>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className={cn(
                "rounded-md border border-input bg-background px-2 py-1.5 text-sm font-mono text-xs",
                "max-w-[min(100vw-4rem,100%)] truncate",
              )}
              title={column}
            >
              {entries.map(([k]) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-xs font-mono text-muted-foreground break-all">{column}</p>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto pb-4 text-xs">
        <table className="w-full">
          <tbody>
            {freqRows.map((r) => (
              <tr key={`${column}-${r.name}`} className="border-b border-border/40">
                <td className="py-1 pr-2 font-mono break-all">{r.name}</td>
                <td className="py-1 text-right tabular-nums">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function TopPearsonPanel({ analysis }: { analysis: AnalysisResult }) {
  const pairs = analysis.topPearsonPairs;
  if (!pairs?.length) return null;

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">상관 행렬에서 |r|이 큰 쌍 (부분 행렬 기준)</CardTitle>
        <p className="text-xs text-muted-foreground">
          열 수가 많을 때 히트맵은 부분 열만 사용했습니다. 그 부분 행렬에서 피어슨 계수 크기 순 상위 표입니다.
        </p>
      </CardHeader>
      <CardContent className="overflow-auto max-h-80">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2 font-medium">x</th>
              <th className="p-2 font-medium">y</th>
              <th className="p-2 font-medium text-right">r</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((row, i) => (
              <tr key={`${row.x}-${row.y}-${i}`} className="border-b border-border/40 font-mono">
                <td className="p-1.5 align-top break-all">{row.x}</td>
                <td className="p-1.5 align-top break-all">{row.y}</td>
                <td className="p-1.5 text-right tabular-nums">{row.r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
