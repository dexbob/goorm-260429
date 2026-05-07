import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { RetrievalResult, SimilarityPoint } from "@/types/rag";
import { Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import remarkGfm from "remark-gfm";

function scoreToPercent(score: number) {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

export function RetrievalPanel(props: {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  searchDisabled?: boolean;
  results: RetrievalResult[];
  topChunkId: string | null;
  queryVectorPreview: string | null;
  searchBusy?: boolean;
  answerBusy?: boolean;
  emptyHint?: string | null;
  distribution: SimilarityPoint[];
  answerText: string | null;
  answerModel: string | null;
  answerChunks: string[];
}) {
  const distData = props.distribution
    .map((d) => {
      const parsed = Number.parseInt(d.chunkId.replace(/^chunk-/u, ""), 10);
      return {
        label: `#${Number.isFinite(parsed) ? parsed + 1 : "?"}`,
        similarity: Math.max(0, Math.min(1, d.score)) * 100,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return (
    <Card id="step-retrieval" className="scroll-mt-32">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" aria-hidden />
          STEP 4 · 지식 검색
        </CardTitle>
        <CardDescription>
          질문을 임베딩한 뒤 코사인 유사도로 Top-K 청크를 고릅니다. 이 단계가 RAG의 &quot;Retrieval&quot; 핵심입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          id="rag-query"
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !props.searchBusy && !props.searchDisabled) {
              e.preventDefault();
              props.onSearch();
            }
          }}
          placeholder='예: "RAG에서 청킹이 중요한 이유는?"'
          disabled={props.searchBusy}
          className="min-h-[88px] text-sm"
        />
        <Button type="button" onClick={props.onSearch} disabled={props.searchDisabled || props.searchBusy}>
          {props.searchBusy ? "검색 중…" : "검색 실행"}
        </Button>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {props.searchBusy ? <span>검색 중…</span> : null}
          {props.answerBusy ? <span>답변 생성 중…</span> : null}
        </div>

        {props.queryVectorPreview ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">질문 임베딩 (일부 차원 미리보기)</p>
            <p className="mt-1 break-all font-mono text-xs text-primary/90">{props.queryVectorPreview}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">검색이 한 번이라도 실행되면 질문 벡터 미리보기가 나타납니다.</p>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">검색 결과</h4>
          {props.results.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {props.emptyHint ?? "질문을 입력하고 검색 실행을 누르면 결과가 순위와 유사도(%)와 함께 표시됩니다."}
            </p>
          ) : (
            <ol className="space-y-3">
              {props.results.map((r, idx) => {
                const parsed = Number.parseInt(r.chunkId.replace(/^chunk-/u, ""), 10);
                const humanChunk = Number.isFinite(parsed) ? parsed + 1 : "?";
                const pct = scoreToPercent(r.score);
                const isTop = r.chunkId === props.topChunkId;
                return (
                  <li
                    key={`${r.chunkId}-${idx}`}
                    className={
                      isTop
                        ? "rounded-lg border-2 border-primary/60 bg-primary/10 p-3"
                        : "rounded-lg border border-border bg-card/80 p-3"
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {idx + 1}위 · Chunk #{humanChunk}
                      </span>
                      <Badge variant="accent">{pct}% 유사</Badge>
                    </div>
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{r.text}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">유사도 분포</h4>
          {distData.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              검색 후 각 청크의 유사도 분포를 막대 차트로 보여줍니다.
            </p>
          ) : (
            <div className="h-56 rounded-lg border border-border bg-muted/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 28% / 0.6)" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(215 18% 70%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(215 18% 70%)", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                    contentStyle={{
                      background: "hsl(221 26% 16%)",
                      border: "1px solid hsl(220 14% 28%)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="similarity" fill="hsl(276 42% 48%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">LLM 합성 답변</h4>
          {props.answerText ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
              <div className="prose prose-invert prose-sm max-w-none text-foreground prose-p:my-2 prose-li:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.answerText}</ReactMarkdown>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {props.answerModel ? <Badge variant="muted">{props.answerModel}</Badge> : null}
                {props.answerChunks.length > 0 ? (
                  <span>근거: {props.answerChunks.join(", ")}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              검색이 끝나면 LLM이 상위 검색 결과를 합성해 답변 블록을 생성합니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
