import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** 연결·501·정적 호스트 등 공통 안내 */
export function ConnectionErrorAlert(props: { message: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-100",
        props.className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="font-medium">API 연결 문제</p>
          <p className="text-amber-50/95">{props.message}</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-amber-100/85">
            <li>
              <strong>개발:</strong> 터미널에서 RAG API가 떠 있는지 확인한 뒤{" "}
              <code className="rounded bg-black/20 px-1">npm run dev</code> 로 여세요(Vite가 /api를 프록시).
            </li>
            <li>
              <strong>빌드만 열었을 때:</strong> <code className="rounded bg-black/20 px-1">python -m http.server</code>
              등은 POST를 지원하지 않습니다. <code className="rounded bg-black/20 px-1">npm start</code> 또는{" "}
              <code className="rounded bg-black/20 px-1">VITE_API_BASE</code>로 API 주소를 지정해 다시 빌드하세요.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
