import { useMutation } from "@tanstack/react-query";
import type { RetrievalResult } from "@/types/rag";
import { requestAnswer } from "@/services/ragService";

export function useAnswerMutation() {
  return useMutation({
    mutationFn: (params: { query: string; results: RetrievalResult[] }) =>
      requestAnswer({ query: params.query, results: params.results }),
    retry: 1,
  });
}
