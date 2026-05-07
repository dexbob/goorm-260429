import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChunkData } from "@/types/rag";
import { detectOverlapWithPrevious } from "@/utils/chunkText";
import { GitBranch } from "lucide-react";

function renderWithOverlapHighlight(text: string, overlapPrefix: string | null) {
  if (!overlapPrefix || !text.startsWith(overlapPrefix)) {
    return <span className="whitespace-pre-wrap break-words">{text}</span>;
  }
  const rest = text.slice(overlapPrefix.length);
  return (
    <span className="whitespace-pre-wrap break-words">
      <mark className="rounded bg-[hsla(38,92%,50%,0.28)] px-0.5 text-inherit">{overlapPrefix}</mark>
      {rest}
    </span>
  );
}

export function ChunkVisualization(props: {
  chunks: ChunkData[];
  chunkOverlap: number;
  onEmbed?: () => void;
  embedDisabled?: boolean;
  embedBusy?: boolean;
}) {
  const overlaps = detectOverlapWithPrevious(props.chunks, props.chunkOverlap);

  return (
    <Card id="step-chunk">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="h-5 w-5 text-primary" aria-hidden />
          STEP 2 · 청킹
        </CardTitle>
        <CardDescription>
          RecursiveCharacterTextSplitter · chunkSize 300 · overlap {props.chunkOverlap}. 하이라이트는 이전 청크와 겹치는
          접두 구간입니다(문맥 연속성 학습용).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.chunks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            문서를 처리하면 청크 목록이 나타납니다.
          </p>
        ) : (
          <Accordion type="multiple" className="w-full divide-y divide-border rounded-lg border border-border">
            {props.chunks.map((chunk, idx) => (
              <AccordionItem key={chunk.id} value={chunk.id} className="border-0 px-3">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex flex-wrap items-center gap-2 text-left">
                    <span className="font-semibold">Chunk #{chunk.index + 1}</span>
                    <Badge variant="muted">{chunk.text.length}자</Badge>
                    {overlaps[idx] ? (
                      <Badge variant="accent">overlap {overlaps[idx]!.length}자</Badge>
                    ) : null}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-foreground/90">
                    {renderWithOverlapHighlight(chunk.text, overlaps[idx])}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        {props.chunks.length > 0 ? (
          <Button type="button" variant="secondary" disabled={props.embedDisabled || props.embedBusy} onClick={props.onEmbed}>
            {props.embedBusy ? "임베딩 생성 중…" : "임베딩 생성하기"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
