import type { AnalysisResult } from "@/types/analysis";
import { postAnalyze, streamInsights } from "./api";

export type { AnalyzeResponse } from "@/types/analysis";

export async function runFullAnalysis(file: File, targetColumn?: string) {
  return postAnalyze(file, targetColumn);
}

export function downloadNotebook(base64: string, fileName: string) {
  const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bin], { type: "application/x-ipynb+json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function fetchInsightMarkdown(
  analysis: AnalysisResult,
  setText: (s: string) => void,
  setErr: (e: string | null) => void,
) {
  setErr(null);
  let acc = "";
  await streamInsights(
    analysis,
    (t) => {
      acc += t;
      setText(acc);
    },
    (e) => setErr(e),
  );
}
