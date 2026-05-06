import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  text: string;
  loading?: boolean;
  error?: string | null;
}

export function InsightPanel({ text, loading, error }: Props) {
  return (
    <Card className="shadow-none w-full border-border/80">
      <CardContent className="px-5 pb-6 pt-5">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading && !text && <p className="text-sm text-muted-foreground animate-pulse">생성 중…</p>}
        {text ? (
          <article className="prose prose-invert prose-sm max-w-none text-sm prose-headings:text-foreground prose-p:leading-relaxed">
            <ReactMarkdown>{text}</ReactMarkdown>
          </article>
        ) : null}
      </CardContent>
    </Card>
  );
}
