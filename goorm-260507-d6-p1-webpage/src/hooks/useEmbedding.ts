import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChunkData } from "@/types/rag";
import { requestEmbed } from "@/services/ragService";
import type { EmbedResponse } from "@/types/rag";

function embedCacheKey(chunks: ChunkData[]) {
  return chunks.map((c) => `${c.id}:${c.text}`).join("\n--\n");
}

export function useEmbedMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (chunks: ChunkData[]) => {
      const key = embedCacheKey(chunks);
      const cached = qc.getQueryData<EmbedResponse>(["rag-embed", key]);
      if (cached) {
        return cached;
      }
      const res = await requestEmbed(chunks);
      qc.setQueryData(["rag-embed", key], res);
      return res;
    },
    retry: 2,
  });
}
