import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const distIndex = path.join(distDir, "index.html");
const distAssets = path.join(distDir, "assets");

if (!fs.existsSync(distIndex)) {
  console.error("[publish-static-hub] dist/index.html 이 없습니다. vite build 를 먼저 실행하세요.");
  process.exit(1);
}
if (!fs.existsSync(distAssets)) {
  console.error("[publish-static-hub] dist/assets 가 없습니다.");
  process.exit(1);
}

const outIndex = path.join(root, "index.html");
const outAssets = path.join(root, "assets");

fs.rmSync(outAssets, { recursive: true, force: true });
fs.cpSync(distAssets, outAssets, { recursive: true });
fs.copyFileSync(distIndex, outIndex);

for (const icon of ["favicon.svg", "favicon.ico"]) {
  const from = path.join(distDir, icon);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(root, icon));
  }
}

console.log("[publish-static-hub] 루트 index.html + assets/ 갱신 완료");
