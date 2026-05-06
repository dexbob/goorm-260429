import { useState } from "react";
import { AnalysisResultPanels } from "@/components/AnalysisResultPanels";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useAnalyzeCsv } from "@/hooks/useUploadCSV";
import type { AnalyzeResponse } from "@/types/analysis";
import { previewCsvFile } from "@/utils/parser";

export function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const mut = useAnalyzeCsv();

  const onAnalyze = () => {
    if (!file) return;
    mut.mutate(
      { file },
      {
        onSuccess: (data) => {
          setResult(data);
          requestAnimationFrame(() => {
            const el = document.getElementById("analysis-results");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        },
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">데이터 분석 자동화 AI 에이전트</h1>
        <p className="text-muted-foreground text-sm">
          CSV를 업로드하면 EDA, 시각화, 그리고 AI 인사이트를 한 번에 생성합니다.
        </p>
      </header>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardDescription>UTF-8, 최대 10MB. 드래그 앤 드롭 지원.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploader
            file={file}
            onFile={(f) => {
              setFile(f);
              setPreviewCols([]);
              if (f) previewCsvFile(f, (p) => setPreviewCols(p.fields));
            }}
            disabled={mut.isPending}
          />

          {previewCols.length > 0 && (
            <p className="text-xs text-muted-foreground">
              미리보기 컬럼: {previewCols.slice(0, 24).join(", ")}
              {previewCols.length > 24 ? " …" : ""}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            타겟 컬럼은 <code>y</code>, <code>target</code>, <code>label</code> 이름을 기준으로 자동 감지됩니다.
          </p>

          <Button
            className="w-full sm:w-auto"
            size="lg"
            disabled={!file || mut.isPending}
            onClick={onAnalyze}
          >
            {mut.isPending ? "분석 중…" : "분석 시작"}
          </Button>
          {mut.isError && (
            <p className="text-sm text-red-600">
              {(mut.error as Error)?.message ?? "오류가 발생했습니다."}
            </p>
          )}
        </CardContent>
      </Card>

      <div id="analysis-results">{result ? <AnalysisResultPanels payload={result} /> : null}</div>
    </div>
  );
}
