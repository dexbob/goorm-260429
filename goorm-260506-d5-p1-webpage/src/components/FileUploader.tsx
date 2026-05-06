import { useCallback, useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024;

interface FileUploaderProps {
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
}

export function FileUploader({ file, onFile, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = useCallback(
    (f: File | null) => {
      setErr(null);
      if (!f) {
        onFile(null);
        return;
      }
      if (f.size > MAX_BYTES) {
        setErr("파일은 최대 10MB까지 업로드할 수 있습니다.");
        return;
      }
      if (!/\.csv$/i.test(f.name) && f.type !== "text/csv" && f.type !== "application/vnd.ms-excel") {
        setErr("CSV 파일만 지원합니다.");
        return;
      }
      onFile(f);
    },
    [onFile],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    pick(f ?? null);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={[
          "rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
          drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          disabled ? "opacity-50 pointer-events-none" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={disabled}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <p className="text-sm font-medium text-foreground">
          CSV 파일을 드래그하거나 클릭하여 선택
        </p>
        <p className="mt-2 text-xs text-muted-foreground">UTF-8 인코딩, 최대 10MB</p>
        {file && (
          <p className="mt-4 text-sm text-primary">
            선택됨: <span className="font-mono">{file.name}</span> (
            {(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
