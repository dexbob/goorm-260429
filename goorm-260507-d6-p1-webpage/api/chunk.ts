import type { VercelRequest, VercelResponse } from "@vercel/node";
import { chunkDocument } from "../lib/rag-backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const document = String(body?.document ?? "");
    const data = await chunkDocument(document);
    res.status(200).json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "청킹에 실패했습니다.";
    res.status(400).json({ error: message });
  }
}
