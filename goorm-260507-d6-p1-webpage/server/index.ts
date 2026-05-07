import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { chunkDocument, embedChunks, generateSynthesisAnswer, similaritySearch } from "../lib/rag-backend";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });

const app = express();
const HOST = process.env.HOST?.trim() || "0.0.0.0";

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "rag-api" });
});
const PORT =
  Number(process.env.PORT, 10) ||
  Number(process.env.RAG_API_PORT, 10) ||
  8789;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "12mb" }));

app.post("/api/chunk", async (req, res) => {
  try {
    const document = String(req.body?.document ?? "");
    const data = await chunkDocument(document);
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "청킹에 실패했습니다.";
    res.status(400).json({ error: message });
  }
});

app.post("/api/embed", async (req, res) => {
  try {
    const chunks = Array.isArray(req.body?.chunks) ? req.body.chunks : [];
    const normalized = chunks.map((c: { id?: string; text?: string }, i: number) => ({
      id: String(c?.id ?? `chunk-${i}`),
      text: String(c?.text ?? ""),
    }));
    const data = await embedChunks(normalized);
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "임베딩 생성에 실패했습니다.";
    res.status(400).json({ error: message });
  }
});

app.post("/api/search", async (req, res) => {
  try {
    const query = String(req.body?.query ?? "");
    const chunks = Array.isArray(req.body?.chunks) ? req.body.chunks : [];
    const embeddings = Array.isArray(req.body?.embeddings) ? req.body.embeddings : [];
    const topK = typeof req.body?.topK === "number" ? req.body.topK : 5;
    const data = await similaritySearch({
      query,
      chunks: chunks.map((c: { id?: string; text?: string }, i: number) => ({
        id: String(c?.id ?? `chunk-${i}`),
        text: String(c?.text ?? ""),
      })),
      embeddings: embeddings.map((e: { chunkId?: string; vector?: number[] }, i: number) => ({
        chunkId: String(e?.chunkId ?? `chunk-${i}`),
        vector: Array.isArray(e?.vector) ? e.vector.map(Number) : [],
      })),
      topK,
    });
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "검색에 실패했습니다.";
    res.status(400).json({ error: message });
  }
});

app.post("/api/answer", async (req, res) => {
  try {
    const query = String(req.body?.query ?? "");
    const results = Array.isArray(req.body?.results) ? req.body.results : [];
    const normalized = results.map((r: { chunkId?: string; text?: string; score?: number }) => ({
      chunkId: String(r?.chunkId ?? ""),
      text: String(r?.text ?? ""),
      score: Number(r?.score ?? 0),
    }));
    const data = await generateSynthesisAnswer({ query, results: normalized });
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "답변 생성에 실패했습니다.";
    res.status(400).json({ error: message });
  }
});

const distDir = path.join(root, "dist");
const isProd = process.env.NODE_ENV === "production" || process.env.RAG_SERVE_STATIC === "1";

if (isProd) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`[rag-api] http://${HOST}:${PORT}`);
});
