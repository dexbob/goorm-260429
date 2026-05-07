/* eslint-disable react-refresh/only-export-components */
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const STEP_ITEMS = [
  { id: "step1", label: "정보 입력" },
  { id: "step2", label: "청킹" },
  { id: "step3", label: "임베딩" },
  { id: "step4", label: "검색" },
] as const;

export type StepId = (typeof STEP_ITEMS)[number]["id"];

export function PipelineProgress(props: {
  hasDocument: boolean;
  hasChunks: boolean;
  hasEmbeddings: boolean;
  hasSearch: boolean;
  activeStep: StepId;
  onStepChange: (step: StepId) => void;
}) {
  const done =
    (props.hasDocument ? 1 : 0) +
    (props.hasChunks ? 1 : 0) +
    (props.hasEmbeddings ? 1 : 0) +
    (props.hasSearch ? 1 : 0);
  const pct = (done / 4) * 100;

  return (
    <div>
      <CardHeader className="px-0 pb-2 pt-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          입력 → 청킹 → 임베딩 → 유사도 검색 순서로, RAG가 문서를 어떻게 준비하고 꺼내 쓰는지 눈으로 따라갈 수 있습니다.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-0 pb-0">
        <Progress value={pct} />
        <ol className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          {STEP_ITEMS.map((s, i) => {
            const completed = done > i;
            const isActive = props.activeStep === s.id;
            const enabled = i === 0 || done >= i;
            return (
              <li
                key={s.id}
                className="list-none"
              >
                <button
                  type="button"
                  onClick={() => props.onStepChange(s.id)}
                  disabled={!enabled}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border border-border px-2 py-1.5 text-left transition",
                    completed && "border-primary/50 bg-primary/10 text-foreground",
                    isActive && "ring-1 ring-primary",
                    !enabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span>
                    <span className="font-semibold">{i + 1}. </span>
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-full border border-border",
                      completed && "border-primary/60 bg-primary text-primary-foreground",
                    )}
                    aria-label={completed ? "완료" : "진행 전"}
                  >
                    {completed ? <Check className="h-3 w-3" aria-hidden /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </div>
  );
}
