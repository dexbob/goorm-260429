import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateSynthesisAnswer } from "../lib/rag-backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const query = String(body?.query ?? "");
    const results = Array.isArray(body?.results) ? body.results : [];
    const normalized = results.map((r: { chunkId?: string; text?: string; score?: number }) => ({
      chunkId: String(r?.chunkId ?? ""),
      text: String(r?.text ?? ""),
      score: Number(r?.score ?? 0),
    }));
    const data = await generateSynthesisAnswer({ query, results: normalized });
    res.status(200).json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "답변 생성에 실패했습니다.";
    res.status(400).json({ error: message });
  }
}
