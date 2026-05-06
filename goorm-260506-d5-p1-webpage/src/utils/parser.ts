import Papa from "papaparse";

const MAX_PREVIEW_BYTES = 512 * 1024;

export interface CsvPreview {
  fields: string[];
  rowEstimate: number;
  sampleRows: Record<string, string>[];
  /** 선택된 구분 문자 (미리보기와 동일 규칙으로 서버·파파 파싱에 맞춤) */
  delimiterGuess: string;
}

/** 상단 표본 줄에서 각 후보 구분자로 열 개수 일관성·최대 열 개수 기준 최적 선택 */
function guessDelimiter(sampleText: string): string {
  const lines = sampleText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return ",";

  const sampleRows = Math.min(lines.length, 22);
  const chunk = lines.slice(0, sampleRows).join("\n");

  const candidates = [",", ";", "\t", "|"];
  /** 콜론은 시간 등과 충돌할 수 있어 마지막에만 검사하고, 명확한 이득이 있을 때만 */
  const scoreFor = (d: string): { scoreCols: number; ok: boolean } => {
    const parsed = Papa.parse<string[]>(chunk, {
      header: false,
      skipEmptyLines: true,
      delimiter: d,
    });
    const rows = (parsed.data ?? []).filter(
      (r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== ""),
    ) as string[][];
    if (rows.length === 0) return { scoreCols: 0, ok: false };
    const widths = rows.map((r) => r.length);
    const w0 = widths[0];
    if (!w0 || w0 < 2) return { scoreCols: 0, ok: false };
    const aligned = widths.every((w) => w === w0);
    if (!aligned) return { scoreCols: 0, ok: false };
    return { scoreCols: w0, ok: true };
  };

  let bestDelim = ",";
  let bestCols = -1;

  for (const d of candidates) {
    const { scoreCols, ok } = scoreFor(d);
    if (ok && scoreCols > bestCols) {
      bestCols = scoreCols;
      bestDelim = d;
    }
  }

  /** 콜론: 다른 후보에서 열 분리 실패 또는 1열 뿐일 때만 검사 */
  if (bestCols < 2) {
    const { scoreCols, ok } = scoreFor(":");
    if (ok && scoreCols >= 2 && scoreCols > bestCols) {
      bestDelim = ":";
      bestCols = scoreCols;
    }
  }

  return bestDelim;
}

/** UTF-8 CSV 상단만 파싱해 업로드 전 미리보기에 사용합니다. */
export function previewCsvFile(file: File, onResult: (p: CsvPreview) => void) {
  const slice = file.slice(0, MAX_PREVIEW_BYTES);
  slice.arrayBuffer().then((buf) => {
    const text = new TextDecoder("utf-8").decode(buf);
    const delimiterGuess = guessDelimiter(text);
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      preview: 12,
      delimiter: delimiterGuess,
    });
    const fields = parsed.meta.fields?.filter(Boolean) as string[];
    const rowEstimate =
      file.size > MAX_PREVIEW_BYTES ? Math.ceil((file.size / MAX_PREVIEW_BYTES) * 12) : parsed.data.length;
    onResult({
      fields: fields ?? [],
      rowEstimate,
      sampleRows: parsed.data.filter((r) => Object.keys(r).length > 0),
      delimiterGuess,
    });
  });
}
