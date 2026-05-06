import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/analysis";

interface Props {
  profile: Profile;
  fileName: string;
}

export function SummaryCard({ profile, fileName }: Props) {
  const missAll = Object.entries(profile.missingPct)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const numList = [...profile.numericColumns].sort();
  const catList = [...profile.categoricalColumns].sort();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
      <Card className="shadow-none lg:col-span-1">
        <CardHeader className="space-y-1 p-4 pb-2">
          <CardDescription className="text-[11px]">파일</CardDescription>
          <CardTitle className="text-sm font-mono leading-snug break-all">{fileName}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="shadow-none lg:col-span-1">
        <CardHeader className="space-y-1 p-4 pb-2">
          <CardDescription className="text-[11px]">행 × 열</CardDescription>
          <CardTitle className="text-xl tabular-nums leading-tight">
            {profile.rows.toLocaleString()} × {profile.columns}
          </CardTitle>
          {profile.sampled && (
            <p className="text-[10px] text-amber-500/90 leading-tight">{MAX_ROWS_NOTE}</p>
          )}
        </CardHeader>
      </Card>
      <Card className="shadow-none lg:col-span-1">
        <CardHeader className="space-y-1 p-4 pb-2">
          <CardDescription className="text-[11px]">변수 분류 요약</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 text-xs leading-snug space-y-2">
          <p>
            수치형(연속·고유값 많음 등)으로 분류된 열 <strong>{profile.numericColumns.length}</strong>, 범저유사 분류 범주형{" "}
            <strong>{profile.categoricalColumns.length}</strong>
          </p>
          {profile.targetColumn && (
            <p className="text-primary font-medium">
              탐색 타겟(자동 선택):{" "}
              <span className="font-mono">{profile.targetColumn}</span>
            </p>
          )}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            고유값이 19개 이하인 수치 열은 저유사로 보고 범주형 목록에 넣을 수 있습니다. 아래 인벤토리에서 열별로 실제
            고유값 수를 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-none lg:col-span-1">
        <CardHeader className="space-y-1 p-4 pb-2">
          <CardDescription className="text-[11px]">결측이 있는 열 전체</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 max-h-[min(70vh,28rem)] overflow-y-auto overflow-x-hidden">
          {missAll.length === 0 ? (
            <p className="text-xs text-muted-foreground">결측이 있는 열이 없습니다.</p>
          ) : (
            <ul className="text-[10px] space-y-0.5 font-mono leading-tight">
              {missAll.map(([c, p]) => (
                <li key={c} className="flex justify-between gap-2 border-b border-border/40 pb-0.5">
                  <span className="truncate min-w-0" title={c}>
                    {c}
                  </span>
                  <span className="shrink-0 tabular-nums">{p}%</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none lg:col-span-2">
        <CardHeader className="py-3">
          <CardDescription className="text-[11px]">수치형으로 분류된 열 이름 (전체)</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 max-h-[min(40vh,16rem)] overflow-y-auto text-[10px] font-mono leading-tight">
          {numList.length === 0 ? (
            <span className="text-muted-foreground">없음</span>
          ) : (
            <p className="whitespace-pre-wrap break-all">{numList.join(", ")}</p>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-none lg:col-span-2">
        <CardHeader className="py-3">
          <CardDescription className="text-[11px]">범주형으로 분류된 열 이름 (전체)</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 max-h-[min(40vh,16rem)] overflow-y-auto text-[10px] font-mono leading-tight">
          {catList.length === 0 ? (
            <span className="text-muted-foreground">없음</span>
          ) : (
            <p className="whitespace-pre-wrap break-all">{catList.join(", ")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const MAX_ROWS_NOTE = "행이 10,000행을 초과하면 무작위로 10,000행만 사용합니다.";
