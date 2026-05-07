import { useMutation } from "@tanstack/react-query";
import { requestChunk } from "@/services/ragService";

export function useChunkDocumentMutation() {
  return useMutation({
    mutationFn: (document: string) => requestChunk(document),
    retry: 2,
  });
}
