import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  text: string;
  loading?: boolean;
  error?: string | null;
}

function normalizeInsightMarkdown(raw: string): string {
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\n/g, "\n");
  // 일부 모델이 전체 응답을 ```markdown ... ``` 코드펜스로 감싸 반환하는 경우
  // 본문으로 간주해 펜스만 제거한다.
  const wrappedFence = normalized.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i);
  const unwrapped = wrappedFence ? wrappedFence[1] : normalized;

  const lines = unwrapped.split("\n");
  const contentLines = lines.filter((line) => line.trim().length > 0);
  const minIndent = contentLines.reduce((min, line) => {
    const m = line.match(/^[ \t]*/)?.[0].length ?? 0;
    return Math.min(min, m);
  }, Number.POSITIVE_INFINITY);
  const dedented =
    Number.isFinite(minIndent) && minIndent > 0
      ? lines.map((line) => line.slice(Math.min(minIndent, line.length))).join("\n")
      : unwrapped;

  return dedented
    .replace(/^(#{1,6})(\S)/gm, "$1 $2")
    .replace(/^\s{4,}/gm, "");
}

export function InsightPanel({ text, loading, error }: Props) {
  const normalizedText = normalizeInsightMarkdown(text);

  return (
    <Card className="shadow-none w-full border-border/80">
      <CardContent className="px-5 pb-6 pt-5">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading && !text && <p className="text-sm text-muted-foreground animate-pulse">생성 중…</p>}
        {text ? (
          <article className="prose prose-invert prose-base max-w-none text-base prose-headings:text-foreground prose-p:leading-relaxed prose-li:leading-relaxed prose-pre:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizedText}</ReactMarkdown>
          </article>
        ) : null}
      </CardContent>
    </Card>
  );
}
