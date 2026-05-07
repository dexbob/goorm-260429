import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import OpenAI from "openai";

export const DOC_MAX_CHARS = 30_000;
export const DOC_HINT_MIN = 2000;
export const CHUNK_SIZE = 300;
export const CHUNK_OVERLAP = 50;
/** DOC_MAX_CHARS 확대에 맞춰 앞부분만 쓰는 청크 수 상한 */
export const MAX_CHUNKS = 120;
export const EMBEDDING_MODEL = "text-embedding-3-small" as const;
export const OPENROUTER_EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || EMBEDDING_MODEL;
const DEFAULT_OPENROUTER_FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
] as const;
function resolveOpenRouterModel(): string {
  const raw = process.env.OPENROUTER_MODEL?.trim();
  // OPENROUTER_MODEL=openrouter/free 를 최우선으로 실제 호출
  if (!raw || raw === "your-openrouter-model") {
    return "openrouter/free";
  }
  return raw;
}
export const OPENROUTER_MODEL = resolveOpenRouterModel();
export const OPENROUTER_FALLBACK_MODELS = (process.env.OPENROUTER_FALLBACK_MODELS?.trim()
  ? process.env.OPENROUTER_FALLBACK_MODELS.split(",").map((x) => x.trim()).filter(Boolean)
  : [...DEFAULT_OPENROUTER_FALLBACK_MODELS]
).filter((m, i, arr) => arr.indexOf(m) === i);
export const VECTOR_PREVIEW_LEN = 6;

export interface ChunkPayload {
  id: string;
  text: string;
  index: number;
}

export interface EmbeddingPayload {
  chunkId: string;
  vector: number[];
}

export interface SimilarityScorePayload {
  chunkId: string;
  score: number;
}

function getEmbeddings() {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey && !/^(sk-your-key|your-openai-key)$/u.test(openaiKey)) {
    return {
      provider: "openai" as const,
      model: EMBEDDING_MODEL,
      client: new OpenAIEmbeddings({
        model: EMBEDDING_MODEL,
        openAIApiKey: openaiKey,
      }),
    };
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey && !/^(sk-or-v1-your-openrouter-key|your-openrouter-key)$/u.test(openrouterKey)) {
    return {
      provider: "openrouter" as const,
      model: OPENROUTER_EMBEDDING_MODEL,
      client: new OpenAIEmbeddings({
        model: OPENROUTER_EMBEDDING_MODEL,
        apiKey: openrouterKey,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
        },
      }),
    };
  }

  throw new Error(
    "임베딩 키가 없습니다. OPENAI_API_KEY 또는 OPENROUTER_API_KEY를 설정하세요(OPENAI 키가 없으면 OpenRouter로 자동 대체).",
  );
}

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY 환경변수가 비어 있습니다. OpenRouter Free 모델 키를 설정하세요.");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

export function formatVectorPreview(vector: number[], n = VECTOR_PREVIEW_LEN): string {
  const head = vector.slice(0, n).map((x) => x.toFixed(3));
  return `[${head.join(", ")} …]`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export async function chunkDocument(raw: string): Promise<{
  chunks: ChunkPayload[];
  meta: { chunkSize: number; chunkOverlap: number; truncatedToMaxChunks: boolean };
}> {
  const document = raw.trim();
  if (!document) {
    throw new Error("문서가 비었습니다.");
  }
  if (document.length > DOC_MAX_CHARS) {
    throw new Error(`문서는 최대 ${DOC_MAX_CHARS}자까지 입력할 수 있습니다.`);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const docs = await splitter.createDocuments([document]);
  let truncatedToMaxChunks = false;
  let pieces = docs.map((d) => d.pageContent);
  if (pieces.length > MAX_CHUNKS) {
    pieces = pieces.slice(0, MAX_CHUNKS);
    truncatedToMaxChunks = true;
  }

  const chunks: ChunkPayload[] = pieces.map((text, index) => ({
    id: `chunk-${index}`,
    text,
    index,
  }));

  return {
    chunks,
    meta: {
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      truncatedToMaxChunks,
    },
  };
}

export async function embedChunks(chunks: { id: string; text: string }[]): Promise<{
  embeddings: EmbeddingPayload[];
  model: string;
}> {
  if (chunks.length === 0) {
    throw new Error("임베딩할 청크가 없습니다.");
  }
  const embeddingsModel = getEmbeddings();
  const texts = chunks.map((c) => c.text);
  const vectors = await embeddingsModel.client.embedDocuments(texts);
  const embeddings: EmbeddingPayload[] = vectors.map((vector, i) => ({
    chunkId: chunks[i]!.id,
    vector,
  }));
  return { embeddings, model: embeddingsModel.model };
}

export async function similaritySearch(payload: {
  query: string;
  chunks: { id: string; text: string }[];
  embeddings: EmbeddingPayload[];
  topK?: number;
}): Promise<{
  results: { chunkId: string; text: string; score: number }[];
  distribution: SimilarityScorePayload[];
  queryVectorPreview: string;
  queryVector: number[];
}> {
  const query = payload.query.trim();
  if (!query) {
    throw new Error("질문을 입력하세요.");
  }
  if (payload.chunks.length === 0 || payload.embeddings.length === 0) {
    throw new Error("검색할 벡터 저장소가 비었습니다. 먼저 임베딩을 생성하세요.");
  }

  const embeddingsModel = getEmbeddings();
  const queryVector = await embeddingsModel.client.embedQuery(query);
  const chunkById = new Map(payload.chunks.map((c) => [c.id, c]));

  const scored: SimilarityScorePayload[] = payload.embeddings.map((e) => ({
    chunkId: e.chunkId,
    score: cosineSimilarity(queryVector, e.vector),
  }));
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const k = Math.min(payload.topK ?? 5, sorted.length);
  const top = sorted.slice(0, k);

  return {
    results: top.map((row) => ({
      chunkId: row.chunkId,
      text: chunkById.get(row.chunkId)?.text ?? "",
      score: row.score,
    })),
    distribution: scored,
    queryVectorPreview: formatVectorPreview(queryVector),
    queryVector,
  };
}

export async function generateSynthesisAnswer(payload: {
  query: string;
  results: { chunkId: string; text: string; score: number }[];
}): Promise<{
  answer: string;
  model: string;
  usedChunks: string[];
}> {
  const query = payload.query.trim();
  if (!query) {
    throw new Error("답변 생성을 위한 질문이 비어 있습니다.");
  }
  if (payload.results.length === 0) {
    throw new Error("답변 생성을 위해 검색 결과가 필요합니다.");
  }

  const client = getOpenRouterClient();
  const topContext = payload.results
    .slice(0, 5)
    .map((r, i) => `[#${i + 1} | ${r.chunkId} | score=${r.score.toFixed(4)}]\n${r.text}`)
    .join("\n\n");
  const modelCandidates = [OPENROUTER_MODEL, ...OPENROUTER_FALLBACK_MODELS].filter(
    (m, i, arr) => arr.indexOf(m) === i,
  );
  const tried: string[] = [];
  let lastError: string | null = null;

  for (const model of modelCandidates) {
    tried.push(model);
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "너는 RAG 학습 앱의 답변 합성기다. 검색된 문맥만 근거로 간결하고 정확하게 답하고, 불확실하면 모른다고 말해라.",
          },
          {
            role: "user",
            content: `질문:\n${query}\n\n검색된 문맥:\n${topContext}\n\n요구사항:\n- 한국어로 4~7문장\n- 핵심 결론 먼저\n- 마지막 줄에 '근거 청크: chunk-x, ...' 형식으로 표기`,
          },
        ],
        temperature: 0.2,
        max_tokens: 450,
      });
      const answer = completion.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        lastError = "OpenRouter 응답에서 답변 텍스트를 받지 못했습니다.";
        continue;
      }
      return {
        answer,
        model: completion.model || model,
        usedChunks: payload.results.slice(0, 5).map((r) => r.chunkId),
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(
    `OpenRouter 모델 호출에 실패했습니다. 시도한 모델: ${tried.join(", ")}${
      lastError ? ` | 마지막 오류: ${lastError}` : ""
    }`,
  );
}
