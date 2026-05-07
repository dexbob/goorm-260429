import { create } from "zustand";
import type { ChunkData, EmbeddingData, RetrievalResult, SimilarityPoint } from "@/types/rag";

export type PipelineStep = "idle" | "chunking" | "embedding" | "searching" | "ready";

interface RagState {
  documentText: string;
  chunks: ChunkData[];
  chunkMeta: { chunkSize: number; chunkOverlap: number; truncatedToMaxChunks: boolean } | null;
  embeddings: EmbeddingData[];
  embedModel: string | null;
  query: string;
  results: RetrievalResult[];
  distribution: SimilarityPoint[];
  queryVectorPreview: string | null;
  answerText: string | null;
  answerModel: string | null;
  answerChunks: string[];
  pipelineStep: PipelineStep;
  lastError: string | null;

  setDocumentText: (t: string) => void;
  setQuery: (q: string) => void;
  setChunks: (chunks: ChunkData[], meta: RagState["chunkMeta"]) => void;
  setEmbeddings: (e: EmbeddingData[], model: string) => void;
  setResults: (r: RetrievalResult[], distribution: SimilarityPoint[], preview: string | null) => void;
  setAnswer: (answer: { text: string; model: string; chunks: string[] } | null) => void;
  setPipelineStep: (s: PipelineStep) => void;
  setError: (e: string | null) => void;
  resetPipeline: () => void;
}

export const useRagStore = create<RagState>((set) => ({
  documentText: "",
  chunks: [],
  chunkMeta: null,
  embeddings: [],
  embedModel: null,
  query: "",
  results: [],
  distribution: [],
  queryVectorPreview: null,
  answerText: null,
  answerModel: null,
  answerChunks: [],
  pipelineStep: "idle",
  lastError: null,

  setDocumentText: (t) => set({ documentText: t }),
  setQuery: (q) => set({ query: q }),
  setChunks: (chunks, meta) =>
    set({
      chunks,
      chunkMeta: meta,
      embeddings: [],
      embedModel: null,
      results: [],
      distribution: [],
      queryVectorPreview: null,
      answerText: null,
      answerModel: null,
      answerChunks: [],
    }),
  setEmbeddings: (embeddings, model) =>
    set({
      embeddings,
      embedModel: model,
      results: [],
      distribution: [],
      queryVectorPreview: null,
      answerText: null,
      answerModel: null,
      answerChunks: [],
    }),
  setResults: (results, distribution, preview) => set({ results, distribution, queryVectorPreview: preview }),
  setAnswer: (answer) =>
    set({
      answerText: answer?.text ?? null,
      answerModel: answer?.model ?? null,
      answerChunks: answer?.chunks ?? [],
    }),
  setPipelineStep: (pipelineStep) => set({ pipelineStep }),
  setError: (lastError) => set({ lastError }),
  resetPipeline: () =>
    set({
      chunks: [],
      chunkMeta: null,
      embeddings: [],
      embedModel: null,
      results: [],
      distribution: [],
      queryVectorPreview: null,
      answerText: null,
      answerModel: null,
      answerChunks: [],
      pipelineStep: "idle",
      lastError: null,
    }),
}));
