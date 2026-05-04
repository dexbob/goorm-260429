import { FALLBACK_QUOTES, SEED_QUOTES } from "./staticQuotes";
import type { DisplayQuote, QuoteEngine, QuoteRow } from "./quoteTypes";

const API_FETCH_MS = 22000;
export const PARALLEL_BATCH = 5;

export const CARD_COLORS = ["#FF6B6B", "#6BCB77", "#4D96FF", "#FFD93D", "#845EC2"] as const;

export const TRANSITIONS = ["flipX", "flipY", "slideL", "slideR", "zoom"] as const;
export type CardTransition = (typeof TRANSITIONS)[number];

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

export function dedupeKey(q: Pick<DisplayQuote, "quoteKo" | "author">): string {
  const ko = String(q.quoteKo || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const au = String(q.author || "").trim().toLowerCase();
  return `${ko}::${au}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isValidQuoteData(o: unknown): o is { quoteKo: string; author: string } {
  if (!isRecord(o)) return false;
  return (
    typeof o.quoteKo === "string" &&
    o.quoteKo.trim().length > 0 &&
    typeof o.author === "string" &&
    o.author.trim().length > 0
  );
}

function normalizeQuoteFromApi(j: { quoteKo: string; author: string } & Record<string, unknown>): DisplayQuote {
  return {
    quoteKo: j.quoteKo.trim(),
    quoteEn: typeof j.quoteEn === "string" ? j.quoteEn.trim() : "",
    author: j.author.trim(),
    authorEn: "",
    lifespan: typeof j.lifespan === "string" ? j.lifespan.trim() : "",
    achievements: typeof j.achievements === "string" ? j.achievements.trim() : "",
  };
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ac = new AbortController();
  const id = window.setTimeout(() => ac.abort(), ms);
  return fetch(url, { signal: ac.signal }).finally(() => window.clearTimeout(id));
}

function isGithubPagesHost(): boolean {
  const host = String(location.hostname || "").toLowerCase();
  return host === "github.io" || host.endsWith(".github.io");
}

let hubApiBasePromise: Promise<string> | null = null;

function getHubApiBase(): Promise<string> {
  if (!hubApiBasePromise) {
    hubApiBasePromise = (async () => {
      if (typeof location === "undefined" || !/^https?:/i.test(location.protocol)) {
        return "";
      }
      if (isGithubPagesHost()) return "";
      const parts = location.pathname.split("/").filter(Boolean);
      const projectDir = parts[0];
      if (!projectDir) return "";
      try {
        const res = await fetch(`${location.origin}/hub-dev-ports.json`, { cache: "no-store" });
        if (!res.ok) return "";
        const map = (await res.json()) as Record<string, unknown>;
        const rawPort = map[projectDir];
        const port =
          typeof rawPort === "string"
            ? Number.parseInt(rawPort, 10)
            : typeof rawPort === "number"
              ? rawPort
              : NaN;
        if (!Number.isFinite(port) || port <= 0 || port > 65535) return "";
        return `${location.protocol}//${location.hostname}:${port}`;
      } catch {
        return "";
      }
    })();
  }
  return hubApiBasePromise;
}

export async function getQuoteApiUrl(): Promise<string> {
  const base = await getHubApiBase();
  const trimmed = String(base || "").replace(/\/$/, "");
  return trimmed ? `${trimmed}/api/quote` : "/api/quote";
}

export function createQuoteEngine(): QuoteEngine {
  const quoteQueue: QuoteRow[] = [];
  const viewCounts = new Map<string, number>();
  let fallbackDeck: QuoteRow[] = [];
  let fallbackDeckCursor = 0;
  let parallelFetchLocked = false;

  function initQuoteQueueFromSeeds(): void {
    quoteQueue.length = 0;
    const seeds = SEED_QUOTES.map((row) => ({ ...row }));
    shuffleInPlace(seeds);
    for (const q of seeds) quoteQueue.push(q);
  }

  function quoteKeyInQueue(k: string): boolean {
    return quoteQueue.some((row) => dedupeKey(row) === k);
  }

  function ingestSuccessfulQuote(q: DisplayQuote): void {
    const k = dedupeKey(q);
    if (quoteKeyInQueue(k)) return;

    if (quoteQueue.length > 0) {
      let bestIdx = 0;
      let bestScore = viewCounts.get(dedupeKey(quoteQueue[0]!)) || 0;
      for (let i = 1; i < quoteQueue.length; i++) {
        const sc = viewCounts.get(dedupeKey(quoteQueue[i]!)) || 0;
        if (sc > bestScore) {
          bestScore = sc;
          bestIdx = i;
        }
      }
      quoteQueue.splice(bestIdx, 1);
    }
    quoteQueue.push(q);
  }

  function refillFallbackDeck(): void {
    fallbackDeck = FALLBACK_QUOTES.map((row) => ({ ...row }));
    shuffleInPlace(fallbackDeck);
    fallbackDeckCursor = 0;
  }

  function pickRandomFallback(): DisplayQuote {
    if (FALLBACK_QUOTES.length === 0) {
      return {
        quoteKo: "명언을 불러올 수 없습니다.",
        quoteEn: "",
        author: "—",
        authorEn: "",
        lifespan: "",
        achievements: "잠시 후 다시 시도해 주세요.",
      };
    }

    if (fallbackDeck.length === 0 || fallbackDeckCursor >= fallbackDeck.length) {
      refillFallbackDeck();
    }

    if (fallbackDeckCursor >= fallbackDeck.length) refillFallbackDeck();
    const row = fallbackDeck[fallbackDeckCursor++]!;
    const { quoteKo, quoteEn, author, authorEn, lifespan, achievements } = row;
    return { quoteKo, quoteEn, author, authorEn, lifespan, achievements };
  }

  async function runParallelQuoteFetchBatch(): Promise<void> {
    if (parallelFetchLocked) return;
    parallelFetchLocked = true;
    try {
      const url = await getQuoteApiUrl();
      const tasks: Promise<void>[] = [];
      for (let i = 0; i < PARALLEL_BATCH; i++) {
        tasks.push(
          fetchWithTimeout(url, API_FETCH_MS)
            .then(async (res) => {
              if (!res.ok) throw new Error("bad status");
              const j: unknown = await res.json();
              if (isRecord(j) && "error" in j && j.error) throw new Error("api error");
              if (!isValidQuoteData(j)) throw new Error("invalid");
              return normalizeQuoteFromApi(j);
            })
            .then((norm) => {
              ingestSuccessfulQuote(norm);
            })
            .catch(() => {}),
        );
      }
      await Promise.allSettled(tasks);
    } catch {
      /* getQuoteApiUrl 등 */
    } finally {
      parallelFetchLocked = false;
    }
  }

  function consumeNextQuoteSync(): DisplayQuote {
    void runParallelQuoteFetchBatch();
    if (quoteQueue.length > 0) {
      const next = quoteQueue.shift();
      if (next) return next;
    }
    return pickRandomFallback();
  }

  function recordView(q: DisplayQuote): void {
    const vk = dedupeKey(q);
    viewCounts.set(vk, (viewCounts.get(vk) || 0) + 1);
  }

  initQuoteQueueFromSeeds();
  void runParallelQuoteFetchBatch();

  return {
    consumeNextQuoteSync,
    runParallelQuoteFetchBatch,
    recordView,
  };
}

let engineSingleton: QuoteEngine | null = null;

export function getQuoteEngine(): QuoteEngine {
  if (!engineSingleton) engineSingleton = createQuoteEngine();
  return engineSingleton;
}
