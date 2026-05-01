#!/usr/bin/env node
/**
 * start-servers.sh 가 하위 디렉터리에 유효한 npm start 스크립트가 있는지 판별할 때 사용.
 * exit 0: package.json 에 scripts.start (문자열) 있음.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const dir = process.argv[2];
if (!dir) process.exit(1);

const pj = path.join(dir, "package.json");
let raw;
try {
  raw = fs.readFileSync(pj, "utf8");
} catch {
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(raw);
} catch {
  process.exit(1);
}

const start = pkg.scripts && pkg.scripts.start;
process.exit(typeof start === "string" && start.length > 0 ? 0 : 1);
