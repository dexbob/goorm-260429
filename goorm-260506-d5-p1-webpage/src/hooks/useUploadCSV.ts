import { useMutation } from "@tanstack/react-query";
import { runFullAnalysis } from "@/services/analysisService";

export function useAnalyzeCsv() {
  return useMutation({
    mutationFn: ({ file, target }: { file: File; target?: string }) =>
      runFullAnalysis(file, target),
  });
}
