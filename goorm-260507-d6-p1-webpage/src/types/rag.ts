export interface DocumentData {
  id: string;
  text: string;
}

export interface ChunkData {
  id: string;
  text: string;
  index: number;
}

export interface EmbeddingData {
  chunkId: string;
  vector: number[];
}

export interface RetrievalResult {
  chunkId: string;
  text: string;
  score: number;
}

export interface SimilarityPoint {
  chunkId: string;
  score: number;
}

export interface AnswerResponse {
  answer: string;
  model: string;
  usedChunks: string[];
}

export interface ChunkResponse {
  chunks: ChunkData[];
  meta: {
    chunkSize: number;
    chunkOverlap: number;
    truncatedToMaxChunks: boolean;
  };
}

export interface EmbedResponse {
  embeddings: EmbeddingData[];
  model: string;
}

export interface SearchResponse {
  results: RetrievalResult[];
  distribution: SimilarityPoint[];
  queryVectorPreview: string;
  queryVector: number[];
}
