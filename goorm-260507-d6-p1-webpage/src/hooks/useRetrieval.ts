import { useMutation } from "@tanstack/react-query";
import type { ChunkData, EmbeddingData } from "@/types/rag";
import { requestSearch } from "@/services/ragService";
import { TOP_K_DEFAULT } from "@/constants/rag";

export function useSearchMutation() {
  return useMutation({
    mutationFn: (params: {
      query: string;
      chunks: ChunkData[];
      embeddings: EmbeddingData[];
      topK?: number;
    }) =>
      requestSearch({
        query: params.query,
        chunks: params.chunks,
        embeddings: params.embeddings,
        topK: params.topK ?? TOP_K_DEFAULT,
      }),
    retry: 2,
  });
}
