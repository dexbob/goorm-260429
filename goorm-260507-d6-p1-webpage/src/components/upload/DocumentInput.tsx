import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DOC_HINT_MIN, DOC_MAX_LENGTH } from "@/constants/rag";
import { cn } from "@/lib/utils";
import { extractTextFromUpload, MAX_UPLOAD_BYTES } from "@/utils/extractDocumentText";
import { FileUp } from "lucide-react";

export function DocumentInput(props: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const len = props.value.length;
  const invalidEmpty = len === 0;
  const invalidLong = len > DOC_MAX_LENGTH;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileNotice, setFileNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [parsingFile, setParsingFile] = useState(false);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileNotice(null);
    setParsingFile(true);
    try {
      let text = await extractTextFromUpload(file);
      let note: string | null = null;
      if (text.length > DOC_MAX_LENGTH) {
        text = text.slice(0, DOC_MAX_LENGTH);
        note = `문서가 ${DOC_MAX_LENGTH.toLocaleString()}자를 넘어 앞부분만 사용합니다.`;
      }
      props.onChange(text);
      setFileNotice({
        kind: "ok",
        text: note ? `${file.name}: ${note}` : `${file.name}에서 불러왔습니다.`,
      });
    } catch (err) {
      setFileNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "파일을 처리하지 못했습니다.",
      });
    } finally {
      setParsingFile(false);
    }
  };

  const blocked = props.disabled || props.busy || parsingFile;

  return (
    <Card id="step-input" className="border-primary/25">
      <CardHeader>
        <CardTitle className="text-lg">STEP 1 · 정보 입력</CardTitle>
        <CardDescription>
          긴 문서를 학습 가능한 크기로 쪼개기 위해 원문을 붙여 넣거나 .txt / .pdf 파일을 올립니다. 권장{" "}
          {DOC_HINT_MIN.toLocaleString()}~{DOC_MAX_LENGTH.toLocaleString()}자, 최대 {DOC_MAX_LENGTH.toLocaleString()}자 (파일
          업로드는 최대 {(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)}MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,text/plain,application/pdf"
          className="sr-only"
          onChange={handleFileChange}
          disabled={blocked}
          aria-hidden
        />
        <Textarea
          id="rag-doc"
          value={props.value}
          maxLength={DOC_MAX_LENGTH}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="RAG에서 청킹은 문맥을 보존하기 위해 작은 블록으로 나누는 단계입니다. overlap은 경계에서 문맥이 끊기지 않도록 돕습니다..."
          disabled={blocked}
          className="min-h-[200px] font-mono text-[13px] leading-relaxed"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className={cn(invalidLong && "text-amber-200")}>
            {len.toLocaleString()} / {DOC_MAX_LENGTH.toLocaleString()}자
          </span>
        </div>
        {fileNotice ? (
          <p className={cn("text-xs", fileNotice.kind === "ok" ? "text-muted-foreground" : "text-amber-200")}>
            {fileNotice.text}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            disabled={props.busy || invalidEmpty || invalidLong || parsingFile}
            onClick={props.onSubmit}
          >
            {props.busy ? "처리 중…" : "문서 처리 시작"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={blocked} onClick={handlePickFile}>
            <FileUp className="h-4 w-4" aria-hidden />
            {parsingFile ? "파일 읽는 중…" : "TXT 또는 PDF 업로드"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
