import type { VercelRequest, VercelResponse } from "@vercel/node";
import { embedChunks } from "../lib/rag-backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const chunks = Array.isArray(body?.chunks) ? body.chunks : [];
    const normalized = chunks.map((c: { id?: string; text?: string }, i: number) => ({
      id: String(c?.id ?? `chunk-${i}`),
      text: String(c?.text ?? ""),
    }));
    const data = await embedChunks(normalized);
    res.status(200).json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "임베딩 생성에 실패했습니다.";
    res.status(400).json({ error: message });
  }
}
