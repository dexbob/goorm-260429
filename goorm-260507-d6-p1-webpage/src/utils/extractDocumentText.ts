import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

/** 업로드 용량 상한 (PDF 바이너리). */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** 텍스트 레이어가 없는 PDF는 빈 문자열이 될 수 있음. */
const MAX_PDF_PAGES_TO_READ = 80;

function isTxtFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".txt") || file.type === "text/plain";
}

function isPdfFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".pdf") || file.type === "application/pdf";
}

function readFileAsUtf8Text(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("텍스트 파일을 읽지 못했습니다."));
    reader.readAsText(file, "UTF-8");
  });
}

async function extractTextFromPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const loading = getDocument({ data: new Uint8Array(buf) });
  const pdf = await loading.promise;
  const total = Math.min(pdf.numPages, MAX_PDF_PAGES_TO_READ);
  const parts: string[] = [];
  const normalizePdfText = (text: string): string =>
    text
      // PDF glyph 조각 사이 공백으로 생기는 한글 낱글자 분리를 줄입니다.
      .replace(/(?<=[가-힣])\s+(?=[가-힣])/g, "")
      .replace(/\s+/g, " ")
      .trim();

  for (let i = 1; i <= total; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = normalizePdfText(
      content.items
      .map((item) => {
        if (typeof item === "object" && item !== null && "str" in item && typeof (item as { str: string }).str === "string") {
          return (item as { str: string }).str;
        }
        return "";
      })
      .join(""),
    );
    if (line) parts.push(line);
  }
  const combined = parts.join("\n\n").trim();
  if (!combined) {
    throw new Error(
      "PDF에서 추출한 텍스트가 없습니다. 스캔 전용 PDF이거나 텍스트 레이어가 없을 수 있습니다.",
    );
  }
  return combined;
}

export async function extractTextFromUpload(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`파일은 최대 ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)}MB까지 업로드할 수 있습니다.`);
  }
  if (isTxtFile(file)) {
    return (await readFileAsUtf8Text(file)).replace(/\uFEFF/g, "");
  }
  if (isPdfFile(file)) {
    return extractTextFromPdf(file);
  }
  throw new Error("지원 형식은 .txt 또는 .pdf 입니다.");
}
