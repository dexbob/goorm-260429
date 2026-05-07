import type {
  AnswerResponse,
  ChunkData,
  ChunkResponse,
  EmbedResponse,
  EmbeddingData,
  RetrievalResult,
  SearchResponse,
} from "@/types/rag";
import { TOP_K_DEFAULT } from "@/constants/rag";

const staticApiBaseUrl =
  typeof import.meta.env.VITE_API_BASE === "string" ? import.meta.env.VITE_API_BASE.replace(/\/$/u, "") : "";

let dynamicApiBaseUrl: string | null = null;
let dynamicApiBasePromise: Promise<string> | null = null;

function normalizeBase(url: string): string {
  return url.replace(/\/$/u, "");
}

async function canReachHealth(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/health`, { method: "GET" });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: unknown };
    return data.ok === true;
  } catch {
    return false;
  }
}

async function resolveMappedBaseFromHub(): Promise<string> {
  const seg = window.location.pathname.split("/").filter(Boolean)[0] ?? "";
  if (!seg) return "";
  try {
    const res = await fetch("/hub-dev-ports.json", { cache: "no-store" });
    if (!res.ok) return "";
    const data = (await res.json()) as Record<string, unknown>;
    const port = data[seg];
    const n = typeof port === "number" ? port : typeof port === "string" ? Number.parseInt(port, 10) : NaN;
    if (!Number.isFinite(n) || n <= 0) return "";
    const proto = window.location.protocol || "http:";
    const host = window.location.hostname || "127.0.0.1";
    return normalizeBase(`${proto}//${host}:${n}`);
  } catch {
    return "";
  }
}

/**
 * 정적 허브(예: python http.server) 경로로 프로젝트를 열었을 때도 자동으로 API를 찾는다.
 * - 같은 오리진의 `/hub-dev-ports.json`을 읽어, 현재 경로의 첫 세그먼트(프로젝트 폴더명)에 대응하는 Node 포트를 찾는다.
 * - 찾으면 "현재 접속 host + 탐색된 포트" 조합으로 API base를 고정한다.
 *   (원격 접속/Tailscale/WSL 포워딩에서 127.0.0.1 고정으로 실패하는 문제 방지)
 */
export async function resolveApiBaseUrl(): Promise<string> {
  if (staticApiBaseUrl) return staticApiBaseUrl;
  if (dynamicApiBaseUrl) return dynamicApiBaseUrl;
  if (dynamicApiBasePromise) return dynamicApiBasePromise;

  if (typeof window === "undefined") {
    dynamicApiBaseUrl = "";
    return "";
  }

  dynamicApiBasePromise = (async () => {
    const mappedBase = await resolveMappedBaseFromHub();
    const sameOriginBase = normalizeBase(window.location.origin || "");
    const candidates = [mappedBase, sameOriginBase, ""].filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i);

    for (const candidate of candidates) {
      if (await canReachHealth(candidate)) {
        return candidate;
      }
    }

    // 어느 경로도 헬스체크를 통과하지 못하면 상대경로(동일 출처)로 마지막 시도.
    return "";
  })();

  dynamicApiBaseUrl = await dynamicApiBasePromise;
  dynamicApiBasePromise = null;
  return dynamicApiBaseUrl;
}

export function apiBaseLabel(): string {
  if (staticApiBaseUrl) return staticApiBaseUrl;
  if (dynamicApiBaseUrl) return dynamicApiBaseUrl;
  return "";
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "네트워크 오류로 API에 연결하지 못했습니다. RAG API가 실행 중인지, 방화벽/VITE_API_BASE(다른 포트를 쓰는 경우)를 확인하세요.",
    );
  }
}

/** 배포·로컬 서버 가용성 확인 (GET /api/health) */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const base = await resolveApiBaseUrl();
    return canReachHealth(base);
  } catch {
    return false;
  }
}

function jsonParseErrorMessage(res: Response, raw: string): string {
  const t = raw.trimStart();
  if (
    res.status === 501 ||
    t.startsWith("<!DOCTYPE") ||
    t.startsWith("<html") ||
    t.startsWith("<HTML")
  ) {
    return (
      "API 서버가 아닌 주소로 요청했거나(예: 정적 호스트만 실행 중) POST를 지원하지 않습니다(501). " +
      "RAG API(`server/index.ts`)를 실행하고 `.env`의 VITE_API_BASE가 그 서버 URL과 같은지 확인하세요."
    );
  }
  return raw.slice(0, 280) || "응답을 JSON으로 해석하지 못했습니다.";
}

async function parseJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(jsonParseErrorMessage(res, raw));
  }
  if (!res.ok) {
    const err =
      typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : raw;
    throw new Error(err);
  }
  return data as T;
}

export async function requestChunk(document: string): Promise<ChunkResponse> {
  const base = await resolveApiBaseUrl();
  const res = await safeFetch(`${base}/api/chunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document }),
  });
  return parseJson<ChunkResponse>(res);
}

export async function requestEmbed(chunks: ChunkData[]): Promise<EmbedResponse> {
  const base = await resolveApiBaseUrl();
  const res = await safeFetch(`${base}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chunks }),
  });
  return parseJson<EmbedResponse>(res);
}

export async function requestSearch(params: {
  query: string;
  chunks: ChunkData[];
  embeddings: EmbeddingData[];
  topK?: number;
}): Promise<SearchResponse> {
  const base = await resolveApiBaseUrl();
  const res = await safeFetch(`${base}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: params.query,
      chunks: params.chunks,
      embeddings: params.embeddings,
      topK: params.topK ?? TOP_K_DEFAULT,
    }),
  });
  return parseJson<SearchResponse>(res);
}

export async function requestAnswer(params: {
  query: string;
  results: RetrievalResult[];
}): Promise<AnswerResponse> {
  const base = await resolveApiBaseUrl();
  const res = await safeFetch(`${base}/api/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: params.query,
      results: params.results,
    }),
  });
  return parseJson<AnswerResponse>(res);
}
