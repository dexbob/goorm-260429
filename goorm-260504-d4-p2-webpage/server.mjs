import { spawnSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.PORT, 10) || 8792;
const API_KEY = (process.env.OPENROUTER_API_KEY || "").trim();

const BUILD_DIR = path.join(__dirname, ".build");

/** `npm start` 만 했을 때 흰 화면(번들 없음) 방지 */
function ensureProductionBuild() {
  if (fs.existsSync(path.join(BUILD_DIR, "index.html"))) return;
  console.error(
    "[서버] .build/index.html 없음 → 자동으로 `npm run build` 실행 (최초 수 초 걸릴 수 있음)",
  );
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npm, ["run", "build"], {
    cwd: __dirname,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error("[서버] npm run build 실패. 수동으로 빌드한 뒤 다시 시작하세요.");
    process.exit(1);
  }
  if (!fs.existsSync(path.join(BUILD_DIR, "index.html"))) {
    console.error("[서버] 빌드 후에도 .build/index.html 없음.");
    process.exit(1);
  }
}

ensureProductionBuild();

const STATIC_ROOT = BUILD_DIR;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split("?")[0] || "/");
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return null;
  return full;
}

function parseQuoteJson(raw) {
  let s = String(raw || "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output");
  s = s.slice(start, end + 1);
  const obj = JSON.parse(s);
  const quoteKo = String(obj.quoteKo ?? obj.quote_ko ?? "").trim();
  const quoteEn = String(obj.quoteEn ?? obj.quote_en ?? "").trim();
  const author = String(obj.author ?? "").trim();
  const lifespan = String(obj.lifespan ?? obj.life ?? "").trim();
  const achievements = String(obj.achievements ?? obj.achievement ?? "").trim();
  if (!quoteKo || !author) throw new Error("Missing quoteKo or author");
  /* 한국 명언 카드: 화면에는 저자 한글만 사용 */
  return { quoteKo, quoteEn, author, authorEn: "", lifespan, achievements };
}

function truncateOneLine(s, max = 72) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function fetchQuoteFromOpenRouter() {
  if (!API_KEY) {
    console.error("[OpenRouter] 건너뜀 — .env 에 OPENROUTER_API_KEY 없음");
    const err = new Error("OPENROUTER_API_KEY is not set in .env");
    err.code = "NO_KEY";
    throw err;
  }

  const t0 = Date.now();
  console.log("[OpenRouter] 요청 시작 → model: openrouter/free");

  const body = {
    model: "openrouter/free",
    messages: [
      {
        role: "system",
        content: [
          "You reply with ONLY one JSON object, no markdown fences, no extra text.",
          'Keys: "quoteKo", "quoteEn", "author", "authorEn", "lifespan", "achievements".',
          "SCOPE: Korean history and culture ONLY. The speaker must be a real Korean figure (historian, poet, king, scholar, independence activist, scientist, artist, etc. from Korean peninsula or Korean diaspora). No non-Korean foreigners.",
          "quoteKo: one well-known or well-attributed quote IN KOREAN (modern Korean or Korean literary Chinese rendered in hangul/hanja as appropriate).",
          "quoteEn: faithful ENGLISH TRANSLATION of quoteKo (not a different quote). Concise but complete.",
          "author: speaker's name in Korean ONLY (no Latin letters).",
          'authorEn: always the empty string "".',
          'lifespan: birth–death in Korean style or Western years, e.g. "1545–1598" or "1397–1450". Use "?" if unknown.',
          "achievements: 1–2 sentences in Korean (max about 220 characters total), slightly detailed: main deeds and era. You may use a single newline \\n between two short sentences.",
          "Avoid fictional characters. Vary dynasty/century and field (literature, politics, war, science, philosophy, art).",
        ].join(" "),
      },
      {
        role: "user",
        content: `Pick ONE Korean historical/cultural figure you rarely pick, and ONE attributed Korean quote by or about them. nonce: ${Date.now()}-${Math.random().toString(36).slice(2, 9)}. Output the JSON object only.`,
      },
    ],
    temperature: 0.9,
    max_tokens: 900,
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://127.0.0.1:${PORT}`,
      "X-Title": "Korean Quote Card",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  if (!res.ok) {
    console.error(
      `[OpenRouter] HTTP ${res.status} (${Date.now() - t0}ms)`,
      truncateOneLine(rawText, 160),
    );
    const err = new Error(`OpenRouter HTTP ${res.status}: ${rawText.slice(0, 400)}`);
    err.code = "HTTP";
    throw err;
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("[OpenRouter] 응답이 JSON 이 아님", truncateOneLine(rawText, 120));
    const err = new Error("OpenRouter response was not JSON");
    err.code = "PARSE";
    throw err;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    console.error("[OpenRouter] choices[0].message.content 비어 있음");
    const err = new Error("Empty model content");
    err.code = "EMPTY";
    throw err;
  }

  let quote;
  try {
    quote = parseQuoteJson(content);
  } catch (pe) {
    console.error(
      "[OpenRouter] 명언 JSON 파싱 실패:",
      pe instanceof Error ? pe.message : pe,
      "| 원문:",
      truncateOneLine(content, 100),
    );
    throw pe;
  }
  const ms = Date.now() - t0;
  const modelUsed =
    typeof data?.model === "string" && data.model
      ? data.model
      : typeof data?.choices?.[0]?.model === "string"
        ? data.choices[0].model
        : "(응답에 model 필드 없음)";
  console.log(
    `[OpenRouter] OK ${ms}ms  실제모델=${modelUsed}  저자=${quote.author}`,
  );
  console.log(`[OpenRouter]   명언: ${truncateOneLine(quote.quoteKo, 90)}`);
  if (data?.usage && typeof data.usage === "object") {
    console.log(
      `[OpenRouter]   usage: prompt=${data.usage.prompt_tokens ?? "?"} completion=${data.usage.completion_tokens ?? "?"} total=${data.usage.total_tokens ?? "?"}`,
    );
  }
  return quote;
}

/** 정적 허브(다른 포트)에서 열린 페이지가 이 Node 포트로 /api/quote 를 부를 수 있게 함 */
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  let url;
  try {
    url = new URL(req.url || "/", `http://${host}`);
  } catch {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  if (url.pathname === "/api/quote" && req.method === "OPTIONS") {
    applyCors(req, res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/api/quote" && req.method === "GET") {
    applyCors(req, res);
    res.setHeader("Cache-Control", "no-store");
    try {
      const quote = await fetchQuoteFromOpenRouter();
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify(quote));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[/api/quote] 실패 → 클라이언트에 에러 JSON 반환:", msg);
      const status = e.code === "NO_KEY" ? 503 : 502;
      res.writeHead(status, { "Content-Type": MIME[".json"] });
      res.end(
        JSON.stringify({
          error: true,
          message: msg,
        }),
      );
    }
    return;
  }

  const root = STATIC_ROOT;
  const filePath = safeJoin(root, url.pathname);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  /** 구버전 index / 깨진 번들이 브라우저에 남아 흰 화면만 보이는 것을 줄임 */
  const headers = { "Content-Type": type };
  if (ext === ".html" || ext === ".js" || ext === ".css" || ext === ".mjs") {
    headers["Cache-Control"] = "no-store";
  }
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  const mode = "Vite 빌드(.build) + API";
  console.log(
    `http://127.0.0.1:${PORT}/  (${mode})  OpenRouter key: ${API_KEY ? "loaded" : "missing — using client fallback"}`,
  );
});
