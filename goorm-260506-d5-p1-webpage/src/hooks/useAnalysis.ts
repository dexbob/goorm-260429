import { useCallback, useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { fetchInsightMarkdown } from "@/services/analysisService";

export function useInsightStream() {
  const [insightText, setInsightText] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const run = useCallback(async (analysis: AnalysisResult) => {
    setInsightText("");
    setInsightError(null);
    setInsightLoading(true);
    try {
      await fetchInsightMarkdown(analysis, setInsightText, setInsightError);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  return { insightText, insightLoading, insightError, runInsights: run };
}
