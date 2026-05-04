import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "index.vite.html");
const dest = path.join(root, "index.html");

if (!fs.existsSync(src)) {
  console.error("[ensure-dev-index] index.vite.html 이 없습니다.");
  process.exit(1);
}

fs.copyFileSync(src, dest);
