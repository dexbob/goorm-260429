import type { QuoteRow } from "./quoteTypes";

export function buildAuthorPrimaryLine(p: Pick<QuoteRow, "author" | "lifespan">): string {
  const ko = String(p.author || "").trim();
  const life = String(p.lifespan || "").trim();
  if (!ko) return "";
  return life ? `${ko}  ${life}` : ko;
}
