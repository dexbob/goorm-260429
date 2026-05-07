import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function OperationProgressBar(props: {
  label: string | null;
  value: number;
  className?: string;
}) {
  const show = props.label !== null || props.value > 0;
  if (!show) return null;

  const pct = Math.min(100, Math.max(0, Math.round(props.value)));

  return (
    <div
      className={cn(
        "border-b border-border/60 bg-card/30 px-4 py-2 backdrop-blur-sm transition-opacity",
        props.className,
      )}
      aria-busy={props.label !== null}
      aria-label={props.label ?? "작업 완료"}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{props.label ?? "완료"}</span>
          <span className="font-mono tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        <p className="text-[11px] text-muted-foreground">
          서버가 진행률을 주지 않아, 응답이 올 때까지 예상 진행만 표시합니다(완료 시 100%).
        </p>
      </div>
    </div>
  );
}
