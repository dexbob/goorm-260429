import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChunkData, EmbeddingData } from "@/types/rag";
import { VECTOR_CHART_PREVIEW_DIMS } from "@/constants/rag";
import { Box } from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

function previewVector(v: number[], n = 6) {
  const head = v.slice(0, n).map((x) => x.toFixed(3));
  return `[${head.join(", ")} …]`;
}

export function EmbeddingVisualization(props: {
  chunks: ChunkData[];
  embeddings: EmbeddingData[];
  model: string | null;
  onNextStep?: () => void;
}) {
  const byChunk = new Map(props.embeddings.map((e) => [e.chunkId, e]));

  const chartData = props.chunks
    .map((c) => {
      const vec = byChunk.get(c.id)?.vector;
      if (!vec || vec.length < VECTOR_CHART_PREVIEW_DIMS) return null;
      return {
        chunk: `Chunk ${c.index + 1}`,
        x: vec[0]!,
        y: vec[1]!,
        z: 40,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <Card id="step-embedding" className="scroll-mt-32">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Box className="h-5 w-5 text-primary" aria-hidden />
          STEP 3 · 임베딩
        </CardTitle>
        <CardDescription>
          OpenAI embedding API · 고차원 텍스트는 벡터로 바뀌며, 같은 주제일수록 벡터 공간에서 가까워진다고 이해하면
          됩니다. 차트는 앞쪽 두 차원만 투영한 MVP 시각화입니다(PCS/t-SNE는 V2 후보).
        </CardDescription>
        {props.model ? (
          <Badge variant="muted" className="w-fit font-mono text-[11px]">
            {props.model}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {props.embeddings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            임베딩을 생성하면 각 청크의 벡터 미리보기가 표시됩니다.
          </p>
        ) : (
          <>
            <div className="h-56 w-full rounded-lg border border-border bg-muted/20 p-2">
              {chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 28% / 0.6)" />
                    <XAxis type="number" dataKey="x" name="dim-0" tick={{ fill: "hsl(215 18% 70%)", fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="dim-1" tick={{ fill: "hsl(215 18% 70%)", fontSize: 11 }} />
                    <ZAxis type="number" dataKey="z" range={[40, 40]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "hsl(221 26% 16%)",
                        border: "1px solid hsl(220 14% 28%)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Scatter data={chartData} fill="hsl(199 89% 56%)" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                  시각화하려면 청크가 2개 이상 필요합니다.
                </p>
              )}
            </div>

            <Accordion type="multiple" className="w-full divide-y divide-border rounded-lg border border-border">
              {props.chunks.map((chunk) => {
                const emb = byChunk.get(chunk.id);
                return (
                  <AccordionItem key={chunk.id} value={chunk.id} className="border-0 px-3">
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <span className="font-semibold">Chunk #{chunk.index + 1} → 벡터</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="break-all font-mono text-xs text-primary/90">
                        {emb ? previewVector(emb.vector) : "벡터 없음"}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}
        {props.embeddings.length > 0 ? (
          <Button type="button" variant="secondary" onClick={props.onNextStep}>
            검색 탭으로 이동
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
