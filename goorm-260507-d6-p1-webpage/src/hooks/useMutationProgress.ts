import { useEffect, useRef, useState } from "react";

/**
 * 서버에서 진행률을 주지 않는 비동기 작업용: 완료 전까지 점근적으로 ~92%까지 채우고,
 * 성공하면 잠시 100% 후 0으로, 실패하면 즉시 0.
 */
export function useMutationProgress(isPending: boolean, isError: boolean) {
  const [value, setValue] = useState(0);
  const hadPendingSession = useRef(false);

  useEffect(() => {
    if (isPending) {
      hadPendingSession.current = true;
      const started = performance.now();
      const id = window.setInterval(() => {
        const elapsed = performance.now() - started;
        const cap = 92;
        setValue(Math.min(cap, cap * (1 - Math.exp(-elapsed / 2400))));
      }, 72);
      return () => window.clearInterval(id);
    }

    if (!hadPendingSession.current) {
      return;
    }
    hadPendingSession.current = false;

    const raf = window.requestAnimationFrame(() => {
      if (isError) {
        setValue(0);
      } else {
        setValue(100);
        window.setTimeout(() => setValue(0), 480);
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isPending, isError]);

  return value;
}
