const path = require("path");
const fs = require("fs");
const express = require("express");

const nodeMajor = Number.parseInt(String(process.versions.node).split(".")[0], 10);
if (nodeMajor < 22) {
  console.error(
    `[todo-server] Node.js 22 이상이 필요합니다 (내장 SQLite 모듈 node:sqlite). 현재: ${process.version}`,
  );
  process.exit(1);
}

const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT) || 3333;
const DB_PATH = process.env.TODO_DB_PATH || path.join(__dirname, "todos.sqlite");
const STATIC_DIR = __dirname;

const app = express();
app.disable("x-powered-by");
/** 허브(다른 포트)에서 연 HTML이 이 API 호스트만 바꿔 쓸 때 브라우저 CORS 허용 */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "64kb" }));

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    task_date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_todos_task_date ON todos(task_date);
`);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function normalizeDate(d) {
  return typeof d === "string" && DATE_RE.test(d) ? d : null;
}

function nowMs() {
  return Date.now();
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/** List todos for one calendar day (YYYY-MM-DD) */
app.get("/api/todos", (req, res) => {
  const taskDate = normalizeDate(req.query.date);
  if (!taskDate) {
    res.status(400).json({ error: "Missing or invalid date=YYYY-MM-DD" });
    return;
  }

  const rows = db
    .prepare(
      `
    SELECT id, text, completed, task_date AS taskDate, created_at AS createdAt, updated_at AS updatedAt
    FROM todos
    WHERE task_date = ?
    ORDER BY created_at DESC, id DESC
  `,
    )
    .all(taskDate);

  res.json({
    todos: rows.map((r) => ({
      ...r,
      completed: Boolean(r.completed),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt),
    })),
  });
});

/** Per-day aggregates for calendar month grid */
app.get("/api/stats/month", (req, res) => {
  const y = Number.parseInt(String(req.query.year || ""), 10);
  const m = Number.parseInt(String(req.query.month || ""), 10); // 1–12
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    res.status(400).json({ error: "Missing or invalid year & month (1-12)" });
    return;
  }

  const pad = (n) => String(n).padStart(2, "0");
  const from = `${y}-${pad(m)}-01`;
  /** m is calendar month 1–12 → last day matches JS `Date(y, m, 0)` */
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${pad(m)}-${pad(lastDay)}`;

  const rows = db
    .prepare(
      `
    SELECT task_date AS date,
           COUNT(*) AS total,
           COALESCE(SUM(completed), 0) AS done
    FROM todos
    WHERE task_date >= ? AND task_date <= ?
    GROUP BY task_date
  `,
    )
    .all(from, to);

  const counts = {};
  for (const row of rows) {
    counts[row.date] = { total: Number(row.total), done: Number(row.done) };
  }
  res.json({ from, to, counts });
});

app.post("/api/todos", (req, res) => {
  const textRaw = typeof req.body?.text === "string" ? req.body.text : "";
  const text = textRaw.trim();
  const taskDate = normalizeDate(req.body?.taskDate);
  if (!text || !taskDate) {
    res.status(400).json({ error: "text (non-empty) and taskDate YYYY-MM-DD required" });
    return;
  }

  const id =
    typeof req.body?.id === "string" && req.body.id.length > 0
      ? req.body.id
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const t = nowMs();

  try {
    db.prepare(
      `
      INSERT INTO todos (id, text, completed, task_date, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?, ?)
    `,
    ).run(id, text, taskDate, t, t);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      res.status(409).json({ error: "id already exists" });
      return;
    }
    throw e;
  }

  const row = db
    .prepare(
      `SELECT id, text, completed, task_date AS taskDate, created_at AS createdAt, updated_at AS updatedAt
       FROM todos WHERE id = ?`,
    )
    .get(id);
  row.completed = Boolean(row.completed);
  res.status(201).json(row);
});

app.patch("/api/todos/:id", (req, res) => {
  const id = String(req.params.id || "");
  if (!id) {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const existing = db.prepare(`SELECT id FROM todos WHERE id = ?`).get(id);
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  if ("completed" in req.body) {
    const completed = Boolean(req.body.completed);
    db.prepare(`UPDATE todos SET completed = ?, updated_at = ? WHERE id = ?`).run(completed ? 1 : 0, nowMs(), id);
    res.json({ ok: true });
    return;
  }

  if (typeof req.body?.text === "string") {
    const text = req.body.text.trim();
    if (!text) {
      res.status(400).json({ error: "text must be non-empty" });
      return;
    }
    db.prepare(`UPDATE todos SET text = ?, updated_at = ? WHERE id = ?`).run(text, nowMs(), id);
    res.json({ ok: true });
    return;
  }

  if (normalizeDate(req.body?.taskDate)) {
    const taskDate = normalizeDate(req.body.taskDate);
    db.prepare(`UPDATE todos SET task_date = ?, updated_at = ? WHERE id = ?`).run(taskDate, nowMs(), id);
    res.json({ ok: true });
    return;
  }

  res.status(400).json({ error: "No updatable fields (completed | text | taskDate)" });
});

app.delete("/api/todos/:id", (req, res) => {
  const id = String(req.params.id || "");
  const info = db.prepare(`DELETE FROM todos WHERE id = ?`).run(id);
  res.json({ ok: true, deleted: Number(info.changes) });
});

/** Single-page shell + hashed assets fallback */
app.use(express.static(STATIC_DIR, { extensions: ["html"] }));

app.use((req, res) => {
  res.status(404).type("text/plain").send("Not found");
});

app.listen(PORT, () => {
  console.log(`[todo-server] listening on http://localhost:${PORT}`);
  console.log(`[todo-server] SQLite (node:sqlite): ${DB_PATH}`);
});
