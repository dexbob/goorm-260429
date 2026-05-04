import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.PORT, 10) || 8787;
const API_KEY = (process.env.OPENROUTER_API_KEY || "").trim();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
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
  const authorEn = String(obj.authorEn ?? obj.author_en ?? "").trim();
  const lifespan = String(obj.lifespan ?? obj.life ?? "").trim();
  const achievements = String(obj.achievements ?? obj.achievement ?? "").trim();
  if (!quoteKo || !author) throw new Error("Missing quoteKo or author");
  return { quoteKo, quoteEn, author, authorEn, lifespan, achievements };
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
          "quoteKo: the quote in natural Korean (faithful translation if the original is not Korean).",
          "quoteEn: the same quote in concise English (original wording if it was English).",
          "author: speaker name in Korean.",
          "authorEn: the same person's usual English name (Latin script), e.g. Albert Einstein.",
          'lifespan: birth year–death year in Western years, e.g. "1879–1955". Use "?" if unknown.',
          "achievements: one short Korean sentence (max 90 characters) summarizing the figure's main historical contribution.",
          "Use a real famous person and a widely attributed quote; avoid fictional characters.",
          "Maximize diversity: vary era, world region, and field (science, arts, politics, philosophy, etc.). Prefer a figure who is not always the same few names (e.g. rotate beyond only Einstein, Kennedy, Mandela).",
        ].join(" "),
      },
      {
        role: "user",
        content: `Pick ONE different famous historical figure than you would pick by habit, and one well-attributed quote. Vary region/century. Request nonce: ${Date.now()}-${Math.random().toString(36).slice(2, 9)}. Output the JSON object only.`,
      },
    ],
    temperature: 0.9,
    max_tokens: 600,
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://127.0.0.1:${PORT}`,
      "X-Title": "Quote Card Generator",
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
    `[OpenRouter] OK ${ms}ms  실제모델=${modelUsed}  저자=${quote.author} (${quote.authorEn || "—"})`,
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

  const root = __dirname;
  const filePath = safeJoin(root, url.pathname);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`http://127.0.0.1:${PORT}/  (OpenRouter key: ${API_KEY ? "loaded" : "missing — using client fallback"})`);
});
