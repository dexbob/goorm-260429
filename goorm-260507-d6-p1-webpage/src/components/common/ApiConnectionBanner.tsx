import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiBaseLabel, checkApiHealth } from "@/services/ragService";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

const DISMISS_KEY = "rag-d6-hide-api-banner";

export function ApiConnectionBanner() {
  const [status, setStatus] = useState<"loading" | "ok" | "offline">("loading");
  const [dismissed, setDismissed] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(DISMISS_KEY) === "1" : false,
  );

  const runCheck = useCallback(() => {
    void checkApiHealth().then((ok) => setStatus(ok ? "ok" : "offline"));
  }, []);

  useEffect(() => {
    void checkApiHealth().then((ok) => setStatus(ok ? "ok" : "offline"));
  }, []);

  if (dismissed || status === "ok" || status === "loading") {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div role="status" className="border-b border-amber-500/35 bg-amber-500/[0.12] px-4 py-3 text-sm text-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <div className="space-y-2">
            <p className="font-medium">RAG API에 연결되지 않습니다</p>
            <p className="text-amber-100/90">
              <code className="rounded bg-black/25 px-1 py-0.5 text-xs">
                GET {apiBaseLabel() || "(자동 탐색/동일 출처)"} /api/health
              </code>{" "}
              가 실패했습니다.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-amber-100/85">
              <li>
                로컬: 프로젝트 폴더에서 <code className="rounded bg-black/25 px-1">npm run dev</code> — API와 Vite가
                함께 뜹니다(포트 자동 선택).
              </li>
              <li>
                또는 API+정적 한 포트: <code className="rounded bg-black/25 px-1">npm start</code> (Express가{" "}
                <code className="rounded bg-black/25 px-1">server/index.ts</code> 실행).
              </li>
              <li>
                루트 허브(`start-servers.sh`)에서 연 경우: 허브가 켜져 있으면 자동으로 Node API 포트를 찾아
                붙습니다(안 되면 허브/Node가 꺼진 상태일 수 있습니다).
              </li>
            </ol>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => runCheck()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            다시 확인
          </Button>
          <Button type="button" variant="ghost" size="sm" className="gap-1 text-amber-100/80" onClick={dismiss}>
            <X className="h-3.5 w-3.5" aria-hidden />
            숨기기
          </Button>
        </div>
      </div>
    </div>
  );
}
