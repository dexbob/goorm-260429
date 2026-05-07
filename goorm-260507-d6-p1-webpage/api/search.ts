import type { VercelRequest, VercelResponse } from "@vercel/node";
import { similaritySearch } from "../lib/rag-backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const query = String(body?.query ?? "");
    const chunks = Array.isArray(body?.chunks) ? body.chunks : [];
    const embeddings = Array.isArray(body?.embeddings) ? body.embeddings : [];
    const topK = typeof body?.topK === "number" ? body.topK : 5;

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
    res.status(200).json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "검색에 실패했습니다.";
    res.status(400).json({ error: message });
  }
}
