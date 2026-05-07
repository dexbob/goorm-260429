import type { ChunkData } from "@/types/rag";

/** 인접 청크 경계에서 겹치는 부분 문자열(최대 maxOverlap)을 찾습니다. */
export function detectOverlapWithPrevious(chunks: ChunkData[], maxOverlap: number): (string | null)[] {
  const overlaps: (string | null)[] = chunks.map(() => null);
  for (let i = 1; i < chunks.length; i += 1) {
    const prev = chunks[i - 1]!.text;
    const cur = chunks[i]!.text;
    const maxLen = Math.min(maxOverlap, prev.length, cur.length);
    let best = 0;
    for (let len = maxLen; len >= 1; len -= 1) {
      if (prev.slice(-len) === cur.slice(0, len)) {
        best = len;
        break;
      }
    }
    overlaps[i] = best > 0 ? cur.slice(0, best) : null;
  }
  return overlaps;
}
