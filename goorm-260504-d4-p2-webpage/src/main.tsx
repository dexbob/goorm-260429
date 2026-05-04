import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import faviconUrl from "./assets/favicon.svg?url";
import App from "./App";
import "./index.css";

if (!document.querySelector("link[data-app-favicon]")) {
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = faviconUrl;
  link.dataset.appFavicon = "1";
  document.head.appendChild(link);
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('문서에 id="root" 요소가 없습니다.');
}

try {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  const msg = err instanceof Error ? err.stack ?? err.message : String(err);
  rootEl.innerHTML = `<div class="boot-fallback" role="alert"><p><strong>시작 실패</strong></p><pre style="white-space:pre-wrap;font-size:12px">${String(
    msg,
  )
    .replace(/</g, "&lt;")
    .replace(/&/g, "&amp;")}</pre></div>`;
  console.error(err);
}
