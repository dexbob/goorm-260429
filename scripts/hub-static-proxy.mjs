#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const port = Number.parseInt(process.argv[2] || "5000", 10);
const rootDir = path.resolve(process.argv[3] || process.cwd());
const hubMapPath = path.resolve(process.argv[4] || path.join(rootDir, "hub-dev-ports.json"));
const host = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

function readHubMap() {
  try {
    const raw = fs.readFileSync(hubMapPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function projectFromReferer(referer) {
  if (!referer) return "";
  try {
    const u = new URL(referer);
    const seg = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return seg;
  } catch {
    return "";
  }
}

function projectFromCookie(cookieHeader) {
  if (!cookieHeader) return "";
  const pairs = String(cookieHeader).split(";").map((v) => v.trim());
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const k = pair.slice(0, idx).trim();
    if (k !== "hub_project") continue;
    return decodeURIComponent(pair.slice(idx + 1).trim() || "");
  }
  return "";
}

function projectFromPathname(urlPath) {
  const pathname = (urlPath || "/").split("?")[0] || "/";
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

function safeFilePathFromUrl(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const rel = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  return path.join(rootDir, rel);
}

function sendJson(res, statusCode, body) {
  const out = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(out),
    "Cache-Control": "no-store",
  });
  res.end(out);
}

async function proxyApi(req, res) {
  const map = readHubMap();
  const project =
    projectFromReferer(req.headers.referer) ||
    projectFromCookie(req.headers.cookie) ||
    projectFromPathname(req.headers["x-original-uri"] || "");
  const mapped = map[project];
  const targetPort =
    typeof mapped === "number" ? mapped : typeof mapped === "string" ? Number.parseInt(mapped, 10) : NaN;

  if (!Number.isFinite(targetPort) || targetPort <= 0) {
    sendJson(res, 502, {
      error: "요청 출처 프로젝트를 식별하지 못해 API 포트를 찾을 수 없습니다.",
      project,
    });
    return;
  }

  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  }).catch(() => null);

  if (body === null) {
    sendJson(res, 500, { error: "요청 바디를 읽는 중 오류가 발생했습니다." });
    return;
  }

  const targetUrl = `http://127.0.0.1:${targetPort}${req.url || "/"}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (!v) continue;
    if (k.toLowerCase() === "host") continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method || "GET",
      headers,
      body: body.length > 0 ? body : undefined,
    });

    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-encoding") return;
      outHeaders[key] = value;
    });
    outHeaders["cache-control"] = outHeaders["cache-control"] || "no-store";
    res.writeHead(upstream.status, outHeaders);

    const arr = new Uint8Array(await upstream.arrayBuffer());
    res.end(Buffer.from(arr));
  } catch {
    sendJson(res, 502, {
      error: "대상 API 서버에 연결하지 못했습니다.",
      targetUrl,
    });
  }
}

function serveStatic(req, res) {
  const requestPath = req.url || "/";
  const project = projectFromPathname(requestPath);
  let filePath = safeFilePathFromUrl(requestPath);
  if (req.url === "/" || !path.extname(filePath)) {
    const asDir = filePath.endsWith(path.sep) ? filePath : `${filePath}${path.sep}`;
    const indexPath = path.join(asDir, "index.html");
    if (fs.existsSync(indexPath)) {
      filePath = indexPath;
    }
  }
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": data.length,
    "Cache-Control": "no-store",
    ...(project ? { "Set-Cookie": `hub_project=${encodeURIComponent(project)}; Path=/; SameSite=Lax` } : {}),
  });
  res.end(data);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";
  if (urlPath.startsWith("/api/")) {
    void proxyApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, host, () => {
  console.log(`[hub] http://${host}:${port} (root=${rootDir})`);
});

