import type { AnalysisResult, AnalyzeResponse } from "@/types/analysis";

const PROJECT_LABEL = "goorm-260506-d5-p1-webpage";
let cachedBase: string | null = null;

async function resolveApiBase(): Promise<string> {
  if (cachedBase !== null) return cachedBase;
  if (typeof window === "undefined") {
    cachedBase = "";
    return cachedBase;
  }

  const { protocol, hostname, port } = window.location;

  // Node 서버 포트(302x 등)로 직접 열었으면 same-origin API 사용
  if (port && Number(port) >= 3000 && Number(port) < 4000) {
    cachedBase = "";
    return cachedBase;
  }

  // 정적 허브(기본 5000대)에서는 hub-dev-ports.json 기준으로 Node API 포트 우회
  try {
    const res = await fetch("/hub-dev-ports.json", { cache: "no-store" });
    if (res.ok) {
      const map = (await res.json()) as Record<string, number>;
      const nodePort = map[PROJECT_LABEL];
      if (nodePort && Number.isFinite(nodePort)) {
        cachedBase = `${protocol}//${hostname}:${nodePort}`;
        return cachedBase;
      }
    }
  } catch {
    // ignore
  }

  cachedBase = "";
  return cachedBase;
}

export async function postAnalyze(file: File, target?: string): Promise<AnalyzeResponse> {
  const base = await resolveApiBase();
  const body = new FormData();
  body.append("file", file);
  if (target?.trim()) body.append("target", target.trim());

  const res = await fetch(`${base}/api/analyze`, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `분석 실패 (${res.status})`);
  }

  return res.json() as Promise<AnalyzeResponse>;
}

export async function streamInsights(
  analysis: AnalysisResult,
  onToken: (t: string) => void,
  onError?: (e: string) => void,
): Promise<void> {
  const base = await resolveApiBase();
  const res = await fetch(`${base}/api/insights/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ analysis }),
  });

  if (!res.ok || !res.body) {
    onError?.(`인사이트 API 오류 (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const j = JSON.parse(payload) as { text?: string; error?: string };
        if (j.error) {
          onError?.(j.error);
          return;
        }
        if (j.text) onToken(j.text);
      } catch {
        /* ignore */
      }
    }
  }
}
