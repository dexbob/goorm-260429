export interface QuoteRow {
  quoteKo: string;
  quoteEn: string;
  author: string;
  authorEn: string;
  lifespan: string;
  achievements: string;
}

/** API 또는 정적 뱅크에서 온 표시용 명언 */
export type DisplayQuote = QuoteRow;

export interface QuoteEngine {
  consumeNextQuoteSync: () => DisplayQuote;
  runParallelQuoteFetchBatch: () => Promise<void>;
  recordView: (q: DisplayQuote) => void;
}
