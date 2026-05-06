import { spawnSync } from "node:child_process";
import fs, { existsSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import busboy from "busboy";
import dotenv from "dotenv";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.PORT, 10) || 8793;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const venvPy = path.join(
  __dirname,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python3",
);

function pythonHasRequiredModules(py) {
  const probe = spawnSync(
    py,
    [
      "-c",
      "import numpy, pandas, matplotlib, seaborn, nbformat; print('ok')",
    ],
    {
      encoding: "utf8",
      cwd: __dirname,
      env: process.env,
      timeout: 8000,
    },
  );
  return probe.status === 0;
}

function ensurePythonDependencies(py) {
  if (pythonHasRequiredModules(py)) {
    return true;
  }

  const reqPath = path.join(__dirname, "requirements.txt");
  if (!existsSync(reqPath)) {
    return false;
  }

  const attempts = [
    [py, ["-m", "pip", "install", "-q", "-r", reqPath]],
    [py, ["-m", "pip", "install", "-q", "--user", "-r", reqPath]],
    [py, ["-m", "pip", "install", "-q", "--break-system-packages", "-r", reqPath]],
  ];

  for (const [cmd, args] of attempts) {
    const r = spawnSync(cmd, args, {
      encoding: "utf8",
      cwd: __dirname,
      env: process.env,
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (r.status === 0 && pythonHasRequiredModules(py)) {
      return true;
    }
  }
  return false;
}

function resolvePython() {
  const manual = (process.env.PYTHON || "").trim();
  if (manual) {
    return manual;
  }

  if (existsSync(venvPy) && pythonHasRequiredModules(venvPy)) {
    return venvPy;
  }

  if (pythonHasRequiredModules("python3")) {
    return "python3";
  }

  // 마지막 폴백: 오류 메시지에 실제 모듈 누락이 노출되도록 python3 사용
  return "python3";
}

const PYTHON = resolvePython();
const PYTHON_READY = ensurePythonDependencies(PYTHON);
/** OpenRouter(기본·무료 :free 모델) 우선, 없으면 OpenAI 직접 키 */
function createLlm() {
  const orKey = (process.env.OPENROUTER_API_KEY || "").trim();
  if (orKey) {
    const headers = {};
    const ref = (process.env.OPENROUTER_HTTP_REFERER || "http://127.0.0.1").trim();
    const title = (process.env.OPENROUTER_APP_NAME || "goorm-data-analysis-agent").trim();
    headers["HTTP-Referer"] = ref;
    headers["X-Title"] = title;
    return {
      client: new OpenAI({
        apiKey: orKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: headers,
      }),
      model:
        (process.env.OPENROUTER_MODEL || "").trim() ||
        "google/gemma-2-9b-it:free",
      provider: "openrouter",
    };
  }
  const oaKey = (process.env.OPENAI_API_KEY || "").trim();
  if (oaKey) {
    return {
      client: new OpenAI({ apiKey: oaKey }),
      model: (process.env.OPENAI_MODEL || "gpt-4o-mini").trim(),
      provider: "openai",
    };
  }
  return null;
}

const llm = createLlm();

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  const BUILD_DIR = path.join(__dirname, ".build");
  if (!fs.existsSync(path.join(BUILD_DIR, "index.html"))) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Build not found. Run: npm run build");
    return;
  }
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let p = url.pathname === "/" ? "/index.html" : url.pathname;
  let file = path.join(BUILD_DIR, path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, ""));
  if (!file.startsWith(BUILD_DIR)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    file = path.join(BUILD_DIR, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
  }
  const ext = path.extname(file);
  const mime =
    {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
      ".json": "application/json; charset=utf-8",
    }[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime });
  fs.createReadStream(file).pipe(res);
}

function readJsonBody(req, max = 2_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > max) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    });
    const fields = {};
    let fileBuffer = null;
    let filename = "upload.csv";

    bb.on("file", (name, file, info) => {
      filename = info.filename || "upload.csv";
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("limit", () => reject(new Error("File too large (max 10MB)")));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("error", reject);
    bb.on("finish", () => {
      resolve({ fields, fileBuffer, filename });
    });

    req.pipe(bb);
  });
}

function runPythonPipeline(csvPath, outJson, targetColumn) {
  const script = path.join(__dirname, "python", "pipeline.py");
  const args = [script, csvPath, outJson];
  if (targetColumn) {
    args.push("--target", targetColumn);
  }
  const r = spawnSync(PYTHON, args, {
    encoding: "utf8",
    cwd: __dirname,
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) {
    const err = r.stderr || r.stdout || "Python pipeline failed";
    throw new Error(err.slice(0, 2000));
  }
}

function runBuildNotebook(analysisJson, outIpynb, csvName) {
  const script = path.join(__dirname, "python", "build_notebook.py");
  const r = spawnSync(
    PYTHON,
    [script, analysisJson, outIpynb, "--csv-name", csvName],
    {
      encoding: "utf8",
      cwd: __dirname,
      env: process.env,
    },
  );
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "build_notebook failed").slice(0, 2000));
  }
}

function compactAnalysisForLlm(analysis) {
  const prof = analysis.profile || {};
  const charts = analysis.charts || [];
  const byType = charts.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});
  const desc = analysis.describeNumeric || {};
  const descKeys = Object.keys(desc);
  return {
    rows: prof.rows,
    columns: prof.columns,
    sampled: prof.sampled,
    numericColumnsCount: (prof.numericColumns || []).length,
    categoricalColumnsCount: (prof.categoricalColumns || []).length,
    numericColumns: (prof.numericColumns || []).slice(0, 120),
    categoricalColumns: (prof.categoricalColumns || []).slice(0, 120),
    numericColumnsTruncated: (prof.numericColumns || []).length > 120,
    categoricalColumnsTruncated: (prof.categoricalColumns || []).length > 120,
    targetColumn: prof.targetColumn,
    missingTop: Object.entries(prof.missingPct || {})
      .filter(([, p]) => p > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80)
      .map(([k, v]) => ({ column: k, pct: v })),
    chartCountByType: byType,
    chartCountTotal: charts.length,
    /** 전체 차트 목록 대신 패턴 한두 개만 표본 */
    chartTitleSample: charts.slice(0, 24).map((c) => ({ type: c.type, title: c.title })),
    describeColumnCount: descKeys.length,
    describeNumericSample: Object.fromEntries(Object.entries(desc).slice(0, 48)),
    topPearsonPairs: (analysis.topPearsonPairs || []).slice(0, 120),
    metaNotes: analysis.meta?.notes || [],
  };
}

async function handleInsightsStream(req, res) {
  if (!llm) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("OPENROUTER_API_KEY (또는 OPENAI_API_KEY) 가 설정되지 않았습니다.");
    return;
  }
  let body;
  try {
    /* 대용량 차트·히스토그램이 많을 때 전체 analysis JSON이 수 MB에 이를 수 있음 */
    body = await readJsonBody(req, 40_000_000);
  } catch {
    json(res, 400, { error: "Invalid JSON" });
    return;
  }

  const summary = body.analysis;
  if (!summary || typeof summary !== "object") {
    json(res, 400, { error: "Missing analysis" });
    return;
  }

  const payload = compactAnalysisForLlm(summary);
  const sys = `당신은 데이터 과학자입니다. 사용자 데이터 분석 요약 JSON만 보고 한국어로 실무 인사이트를 작성합니다. 추측은 명시하고, 수치는 요약에서만 인용합니다.`;
  const user = `다음 데이터 분석 결과를 바탕으로:

1. 데이터 특징
2. 중요한 변수
3. 이상 패턴
4. 비즈니스 인사이트

를 마크다운 형식으로 구조적으로 설명하라.

분석 요약:
${JSON.stringify(payload, null, 0)}`;

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    const stream = await llm.client.chat.completions.create({
      model: llm.model,
      stream: true,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });

    for await (const part of stream) {
      const text = part.choices[0]?.delta?.content || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
  } catch (e) {
    res.write(
      `data: ${JSON.stringify({ error: e instanceof Error ? e.message : String(e) })}\n\n`,
    );
  }
  res.end();
}

const server = http.createServer(async (req, res) => {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      python: PYTHON,
      pythonReady: PYTHON_READY,
      llm: llm
        ? { configured: true, provider: llm.provider, model: llm.model }
        : { configured: false },
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/analyze") {
    try {
      if (!PYTHON_READY) {
        json(res, 500, {
          error:
            "Python 분석 의존성(numpy/pandas/seaborn/nbformat) 설치에 실패했습니다. requirements.txt 설치 상태를 확인해주세요.",
        });
        return;
      }
      const { fields, fileBuffer, filename } = await parseMultipart(req);
      if (!fileBuffer || fileBuffer.length === 0) {
        json(res, 400, { error: "CSV 파일이 필요합니다." });
        return;
      }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-ana-"));
      const safeName = path.basename(filename || "data.csv").replace(/[^\w.\-가-힣]/g, "_") || "data.csv";
      const csvPath = path.join(tmpDir, safeName);
      fs.writeFileSync(csvPath, fileBuffer);

      const outJson = path.join(tmpDir, "analysis.json");
      const outIpynb = path.join(tmpDir, "analysis_report.ipynb");
      const targetCol = (fields.target || "").trim() || null;

      runPythonPipeline(csvPath, outJson, targetCol);

      const analysisContent = fs.readFileSync(outJson, "utf8");
      const analysis = JSON.parse(analysisContent);

      runBuildNotebook(outJson, outIpynb, safeName);
      const notebookB64 = fs.readFileSync(outIpynb).toString("base64");

      json(res, 200, {
        analysis,
        notebookFileName: "analysis_report.ipynb",
        notebookBase64: notebookB64,
        uploadedName: safeName,
      });

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("too large") || msg.includes("File too large")) {
        json(res, 413, { error: "파일은 최대 10MB까지 업로드할 수 있습니다." });
      } else {
        json(res, 500, { error: msg });
      }
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/insights/stream") {
    await handleInsightsStream(req, res);
    return;
  }

  if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
    serveStatic(req, res);
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT);
