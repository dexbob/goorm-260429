import type { AnalysisResult, AnalyzeResponse } from "@/types/analysis";

let cachedBase: string | null = null;

function normalizeBaseUrl(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return s.replace(/\/+$/, "");
}

async function resolveApiBase(): Promise<string> {
  if (cachedBase !== null) return cachedBase;
  if (typeof window === "undefined") {
    cachedBase = "";
    return cachedBase;
  }

  // 1) 배포 환경(Vercel 등)에서는 명시적 API 베이스를 최우선 사용
  const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (envBase) {
    cachedBase = envBase;
    return cachedBase;
  }

  // 2) 로컬 정적 허브(5000대)로 열었을 때는 FastAPI 기본 포트(8793)로 우회
  //    그렇지 않으면 same-origin(/api)로 두어 Vercel/배포에서 정상 동작.
  const { protocol, hostname, port } = window.location;
  const p = Number(port || "0");
  // 정적 허브(기본 5000대)에서 열렸다면 호스트 종류(localhost, Tailscale IP 등)와 무관하게
  // API 서버 기본 포트 8793으로 우회한다.
  if (Number.isFinite(p) && p >= 5000 && p < 6000) {
    cachedBase = `${protocol}//${hostname}:8793`;
    return cachedBase;
  }

  // 기본은 same-origin(/api). Vercel 단일 배포(FastAPI)에서 사용.
  cachedBase = "";
  return cachedBase;
}

export async function postAnalyze(file: File, target?: string): Promise<AnalyzeResponse> {
  const base = await resolveApiBase();
  const requestUrl = `${base}/api/analyze`;
  const body = new FormData();
  body.append("file", file);
  if (target?.trim()) body.append("target", target.trim());

  let res: Response;
  try {
    res = await fetch(requestUrl, {
      method: "POST",
      body,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyze] network error", { requestUrl, message: msg });
    throw new Error("분석 API 연결 실패");
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `분석 실패 (${res.status}) @ ${requestUrl}`);
  }

  return res.json() as Promise<AnalyzeResponse>;
}

export async function streamInsights(
  analysis: AnalysisResult,
  onToken: (t: string) => void,
  onError?: (e: string) => void,
): Promise<void> {
  const base = await resolveApiBase();
  const requestUrl = `${base}/api/insights/stream`;
  let res: Response;
  try {
    res = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ analysis }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[insights] network error", { requestUrl, message: msg });
    onError?.("인사이트 API 연결 실패");
    return;
  }

  if (!res.ok || !res.body) {
    console.error("[insights] http error", { requestUrl, status: res.status });
    onError?.("인사이트 분석에 실패했습니다.");
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
          console.error("[insights] stream error payload", { requestUrl, error: j.error });
          onError?.("인사이트 분석에 실패했습니다.");
          return;
        }
        if (j.text) onToken(j.text);
      } catch {
        /* ignore */
      }
    }
  }
}
