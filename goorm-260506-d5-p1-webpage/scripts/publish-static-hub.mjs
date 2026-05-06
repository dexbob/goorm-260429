import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(root, ".build");
const buildIndex = path.join(buildDir, "index.html");
const buildAssets = path.join(buildDir, "assets");

if (!fs.existsSync(buildIndex)) {
  console.error("[publish-static-hub] .build/index.html 이 없습니다. vite build 를 먼저 실행하세요.");
  process.exit(1);
}
if (!fs.existsSync(buildAssets)) {
  console.error("[publish-static-hub] .build/assets 가 없습니다.");
  process.exit(1);
}

const outIndex = path.join(root, "index.html");
const outAssets = path.join(root, "assets");

fs.rmSync(outAssets, { recursive: true, force: true });
fs.cpSync(buildAssets, outAssets, { recursive: true });
fs.copyFileSync(buildIndex, outIndex);

for (const icon of ["favicon.svg", "favicon.ico"]) {
  const from = path.join(buildDir, icon);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(root, icon));
  }
}

console.log("[publish-static-hub] 루트 index.html + assets/ 갱신 완료");
