import type { ChunkData, EmbeddingData } from "@/types/rag";

/** MVP: 벡터는 Zustand(브라우저 세션)에 두고, 검색 요청 본문으로 서버에 함께 보냅니다. */
export function mapEmbeddingsByChunk(embeddings: EmbeddingData[]): Map<string, EmbeddingData> {
  return new Map(embeddings.map((e) => [e.chunkId, e]));
}

export function hasEmbeddingForAllChunks(chunks: ChunkData[], embeddings: EmbeddingData[]): boolean {
  const m = mapEmbeddingsByChunk(embeddings);
  return chunks.length > 0 && chunks.every((c) => m.has(c.id));
}
