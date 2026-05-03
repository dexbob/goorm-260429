const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT_DIR, "index.html");
const FINGERPRINT_FILE = path.join(__dirname, ".root-index-input.sha256");
const STYLESHEET_PATH = "./styles.css";
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".cursor",
  "node_modules",
  "scripts",
]);

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toTitleCase(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function formatExerciseTitle(dirname) {
  const match = dirname.match(/^goorm-(\d+)-d(\d+)-p(\d+)-(.+)$/i);

  if (!match) {
    return toTitleCase(dirname);
  }

  const [, cohort, day, project, slug] = match;
  return `Goorm ${cohort} Day ${day} Project ${project} - ${toTitleCase(slug)}`;
}

function buildDescription(dirname) {
  const match = dirname.match(/^goorm-(\d+)-d(\d+)-p(\d+)-(.+)$/i);

  if (!match) {
    return "루트에 바로 연결되는 독립 정적 페이지입니다.";
  }

  return "이 폴더의 웹 화면으로 바로 들어갈 수 있습니다.";
}

/** 인라인 마크다운을 제거해 카드 설명용 한 줄 텍스트로 만든다. */
function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .trim();
}

function decodeBasicHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtmlTags(text) {
  return text.replace(/<[^>]+>/g, "").trim();
}

/**
 * 프로젝트 index.html에서 브라우저 탭에 쓰이는 웹 이름을 읽는다.
 * <title>이 없으면 첫 <h1> 텍스트를 사용한다.
 */
function extractWebTitleFromIndex(indexPath) {
  if (!fs.existsSync(indexPath)) return null;

  let html;
  try {
    html = fs.readFileSync(indexPath, "utf8");
  } catch {
    return null;
  }

  const pickFromInner = (inner) => {
    const text = decodeBasicHtmlEntities(
      stripHtmlTags(inner).replace(/\s+/g, " ").trim()
    );
    if (!text) return null;
    const pipe = text.indexOf("|");
    if (pipe === -1) return text;
    const left = text.slice(0, pipe).trim();
    return left || text;
  };

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const t = pickFromInner(titleMatch[1]);
    if (t) return t;
  }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const t = pickFromInner(h1Match[1]);
    if (t) return t;
  }

  return null;
}

function parseReadmeFirstHeading(readmePath) {
  if (!fs.existsSync(readmePath)) return null;
  let raw;
  try {
    raw = fs.readFileSync(readmePath, "utf8");
  } catch {
    return null;
  }
  const line = raw.replace(/^\uFEFF/, "").split(/\r?\n/).find((l) => /^#\s+/.test(l));
  if (!line) return null;
  return line.replace(/^#\s+/, "").trim() || null;
}

const OVERVIEW_SECTION_RE = /^##\s+(개요|프로젝트 개요)\s*$/;

/** `## 개요` 등에서 첫 불릿 한 줄만 (도입문이 없을 때 대체용). */
function extractFirstOverviewBullet(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inSection) {
      if (/^##\s/.test(line)) break;
      const m = line.match(/^\s*-\s+(.+)$/);
      if (m) {
        return stripInlineMarkdown(m[1].replace(/\s+/g, " ").trim());
      }
      continue;
    }
    if (OVERVIEW_SECTION_RE.test(line)) {
      inSection = true;
    }
  }

  return null;
}

function truncateSummary(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + "…";
}

/** 루트 허브 카드용: 과정명·Day 등 메타 문구를 제거한다. */
function sanitizeHubCardBlurb(text) {
  if (!text) return text;
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/구름\s*\d+\s*과정의?\s*Day\s*\d+[^.!?。]*[.!?。]?/gi, "");
  t = t.replace(/구름\s*\d+\s*과정[^.!?。]*[.!?。]?/g, "");
  t = t.replace(/\bDay\s*\d+\s*,\s*/gi, "");
  t = t.replace(/\s{2,}/g, " ").replace(/^\s*[.,]\s*/g, "").trim();
  return t;
}

/** `## 개요` 아래에서 첫 번째 문단(불릿 전까지) — 허브 카드 요약용. */
function extractOverviewFirstProseParagraph(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!OVERVIEW_SECTION_RE.test(lines[i])) continue;
    const parts = [];
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (/^##\s/.test(line)) break;
      if (/^\s*[-*]\s/.test(line)) break;
      if (!line.trim()) {
        if (parts.length) break;
        continue;
      }
      parts.push(line.trim());
    }
    const joined = parts.join(" ").trim();
    return joined || null;
  }
  return null;
}

/** README 본 `#` 제목 다음부터 첫 `##` 전까지(도입부) 텍스트. */
function extractReadmeIntroRaw(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  let sawH1 = false;
  const bodyLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!sawH1) {
      if (/^#\s+/.test(line)) {
        sawH1 = true;
      }
      continue;
    }
    if (/^##\s/.test(line)) break;
    bodyLines.push(line);
  }

  return bodyLines.join("\n").trim();
}

/**
 * 카드용 짧은 설명: README 도입부의 첫 문장(필요 시에만 둘째)만 쓰고 길이를 제한한다.
 * 주요 기능 불릿 나열은 하지 않는다.
 */
function buildReadmeShortDescription(raw, { maxChars = 130 } = {}) {
  const introRaw = extractReadmeIntroRaw(raw);
  const blocks = introRaw
    .split(/\n{2,}/)
    .map((block) =>
      stripInlineMarkdown(block.replace(/\s+/g, " ").trim())
    )
    .filter(Boolean);

  let oneLine = blocks.join(" ");
  if (!oneLine) {
    const overviewPara = extractOverviewFirstProseParagraph(raw);
    if (overviewPara) {
      oneLine = stripInlineMarkdown(overviewPara.replace(/\s+/g, " ").trim());
    }
  }
  if (!oneLine) {
    const bullet = extractFirstOverviewBullet(raw);
    if (!bullet) return null;
    const cleaned = sanitizeHubCardBlurb(bullet);
    return cleaned ? truncateSummary(cleaned, maxChars) : null;
  }

  let sentences = oneLine
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1 && oneLine.length > 60) {
    const alt = oneLine
      .split(/(?<=[다요임]\.)\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (alt.length > 1) {
      sentences = alt;
    }
  }

  let out = (sentences[0] || oneLine).trim();
  let idx = 1;
  while (
    idx < sentences.length &&
    `${out} ${sentences[idx]}`.trim().length <= maxChars
  ) {
    out = `${out} ${sentences[idx]}`.trim();
    idx += 1;
    if (idx >= 3) break;
  }

  const cleaned = sanitizeHubCardBlurb(out);
  if (!cleaned) return null;
  return truncateSummary(cleaned, maxChars);
}

function getCardTitleAndDescription(dirname) {
  const indexPath = path.join(ROOT_DIR, dirname, "index.html");
  const readmePath = path.join(ROOT_DIR, dirname, "README.md");

  const title =
    extractWebTitleFromIndex(indexPath) ||
    parseReadmeFirstHeading(readmePath) ||
    formatExerciseTitle(dirname);

  let description = buildDescription(dirname);
  if (fs.existsSync(readmePath)) {
    try {
      const raw = fs.readFileSync(readmePath, "utf8");
      const picked = buildReadmeShortDescription(raw);
      if (picked) {
        description = picked;
      }
    } catch {
      /* keep buildDescription */
    }
  }

  return { title, description };
}

function formatGeneratedAtKst(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return `${formatter.format(date).replace(" ", "T")}+09:00`;
}

/** Express 등 Node API가 있으면 루트 정적 허브(포트 5000)만으로는 저장 API가 동작하지 않음을 안내한다. */
function hasExpressBackend(dirname) {
  const dir = path.join(ROOT_DIR, dirname);
  if (!fs.existsSync(path.join(dir, "server.js"))) return false;
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return !!(pkg.scripts && typeof pkg.scripts.start === "string");
  } catch {
    return false;
  }
}

function getExerciseDirectories() {
  return fs
    .readdirSync(ROOT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((dirname) => !IGNORED_DIRECTORIES.has(dirname))
    .filter((dirname) => !dirname.startsWith("."))
    .filter((dirname) => fs.existsSync(path.join(ROOT_DIR, dirname, "index.html")))
    .sort((left, right) => left.localeCompare(right));
}

function sha256HexOfBuffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** 파일이 없으면 "-" (해시에 안정적으로 포함). */
function sha256HexOfFileOrMissing(filePath) {
  if (!fs.existsSync(filePath)) return "-";
  try {
    return sha256HexOfBuffer(fs.readFileSync(filePath));
  } catch {
    return "!"; // 읽기 실패는 입력 변경으로 간주
  }
}

/**
 * index.html 내용에 반영되는 입력만 집계한다.
 * (매 실행마다 바뀌는 생성 시각은 제외 — 출력 전체 비교로는 스킵할 수 없음.)
 */
function computeInputFingerprint() {
  const exerciseDirectories = getExerciseDirectories();
  const h = crypto.createHash("sha256");
  const selfPath = path.join(__dirname, "generate-root-index.js");
  try {
    h.update(fs.readFileSync(selfPath));
  } catch {
    h.update("!");
  }
  h.update("\n");
  h.update(exerciseDirectories.join("\0"));
  h.update("\n");
  for (const dirname of exerciseDirectories) {
    const base = path.join(ROOT_DIR, dirname);
    h.update(dirname);
    h.update("\0");
    h.update(sha256HexOfFileOrMissing(path.join(base, "index.html")));
    h.update("\0");
    h.update(sha256HexOfFileOrMissing(path.join(base, "README.md")));
    h.update("\0");
    h.update(fs.existsSync(path.join(base, "README.html")) ? "1" : "0");
    h.update("\0");
    h.update(fs.existsSync(path.join(base, "server.js")) ? "1" : "0");
    h.update("\0");
    h.update(sha256HexOfFileOrMissing(path.join(base, "package.json")));
    h.update("\n");
  }
  return h.digest("hex");
}

function forceRegenerateRequested() {
  if (process.env.FORCE_ROOT_INDEX === "1") return true;
  if (process.argv.includes("--force")) return true;
  return false;
}

function shouldSkipRegeneration(fingerprint) {
  if (forceRegenerateRequested()) return false;
  if (!fs.existsSync(OUTPUT_FILE)) return false;
  if (!fs.existsSync(FINGERPRINT_FILE)) return false;
  try {
    return fs.readFileSync(FINGERPRINT_FILE, "utf8").trim() === fingerprint;
  } catch {
    return false;
  }
}

function renderExerciseCard(dirname) {
  const { title, description } = getCardTitleAndDescription(dirname);
  const href = `./${dirname}/`;
  const readmeHtmlPath = path.join(ROOT_DIR, dirname, "README.html");
  const hasReadmeViewer = fs.existsSync(readmeHtmlPath);
  const readmeHref = `./${dirname}/README.html`;
  const needsNode = hasExpressBackend(dirname);

  const secondBadge = needsNode
    ? `<span class="badge warn">Node API · npm start</span>`
    : `<span class="badge">Static HTML</span>`;

  const apiNoteMarkup = "";

  const linksMarkup = hasReadmeViewer
    ? `        <div class="card-link-row">
          <a class="card-link" href="${escapeHtml(href)}">페이지 열기</a>
          <a class="card-link" href="${escapeHtml(readmeHref)}">개요 보기</a>
        </div>`
    : `        <a class="card-link" href="${escapeHtml(href)}">페이지 열기</a>`;

  return `        <article class="exercise-card">
          <header>
            <div class="badge-row">
              <span class="badge success">Ready</span>
              ${secondBadge}
            </div>
            <h3>${escapeHtml(title)}</h3>
          </header>
          <p>${escapeHtml(description)}</p>
${apiNoteMarkup}
          <p class="path-label">${escapeHtml(dirname)}/index.html</p>
${linksMarkup}
        </article>`;
}

function renderHeroOutlineSection(exerciseDirectories) {
  const items = [];

  items.push(`            <li>
              <a href="./README.html">
                <span class="hero-outline-entry-title">저장소 전체</span>
                <span class="hero-outline-entry-sub">루트 README</span>
              </a>
            </li>`);

  for (const dirname of exerciseDirectories) {
    const readmeHtmlPath = path.join(ROOT_DIR, dirname, "README.html");
    if (!fs.existsSync(readmeHtmlPath)) continue;
    const readmeHref = `./${dirname}/README.html`;
    const { title: displayTitle, description: subLine } = getCardTitleAndDescription(dirname);
    items.push(`            <li>
              <a href="${escapeHtml(readmeHref)}">
                <span class="hero-outline-entry-title">${escapeHtml(displayTitle)}</span>
                <span class="hero-outline-entry-sub">${escapeHtml(subLine)}</span>
              </a>
            </li>`);
  }

  return `        <div class="hero-outline">
          <p id="hero-outline-heading" class="hero-outline-heading">개요 페이지</p>
          <details class="hero-outline-dropdown" aria-labelledby="hero-outline-heading">
            <summary class="hero-outline-summary">목록에서 선택해 열기</summary>
            <ul class="hero-outline-list" role="list">
${items.join("\n")}
            </ul>
          </details>
        </div>`;
}

function renderEmptyState() {
  return `      <section class="meta-card empty-state">
        <h2>아직 등록된 연습 페이지가 없습니다</h2>
        <p>루트 바로 아래에 새 디렉터리를 만들고, 그 안에 <code>index.html</code>을 추가한 뒤 생성 스크립트를 다시 실행하세요.</p>
      </section>`;
}

function renderPage(exerciseDirectories) {
  const cardsMarkup = exerciseDirectories.length
    ? exerciseDirectories.map(renderExerciseCard).join("\n")
    : "";
  const primaryLinkMarkup = exerciseDirectories.length
    ? `<a class="button-link primary" href="./${escapeHtml(exerciseDirectories[0])}/">첫 연습 페이지 열기</a>`
    : `<a class="button-link primary" href="#exercise-list-heading">목록 보기</a>`;
  const generatedAt = formatGeneratedAtKst();

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="./favicon.svg" type="image/svg+xml" sizes="any" />
    <link rel="icon" href="./favicon.ico" />
    <title>Goorm 260429 Practice Index</title>
    <meta
      name="description"
      content="연습용 정적 웹페이지 디렉터리를 한 곳에서 탐색할 수 있는 루트 랜딩 페이지입니다."
    />
    <link rel="stylesheet" href="${STYLESHEET_PATH}" />
  </head>
  <body>
    <main class="page-shell">
      <section class="hero">
        <p class="eyebrow">Practice Hub</p>
        <h1>연습 디렉터리로 바로 이동하는 루트 랜딩</h1>
        <p>
          매일 추가되는 정적 웹페이지 연습 결과물을 한 곳에서 확인할 수 있도록 구성한 진입 페이지입니다.
        </p>
${renderHeroOutlineSection(exerciseDirectories)}
      </section>

      <section class="meta-strip" aria-label="요약 정보">
        <article class="meta-card">
          <span class="meta-label">등록된 페이지</span>
          <strong class="meta-value">${exerciseDirectories.length}개</strong>
        </article>
        <article class="meta-card">
          <span class="meta-label">탐색 기준</span>
          <strong class="meta-value">루트 하위 디렉터리 + index.html</strong>
        </article>
        <article class="meta-card">
          <span class="meta-label">생성 시각</span>
          <strong class="meta-value">${escapeHtml(generatedAt)}</strong>
        </article>
      </section>

      <section aria-labelledby="exercise-list-heading">
        <div class="section-heading">
          <div>
            <h2 id="exercise-list-heading">연습 페이지 목록</h2>
            <p>디렉터리를 추가한 뒤 생성 스크립트를 다시 실행하면 아래 목록이 자동으로 갱신됩니다.</p>
          </div>
        </div>
${exerciseDirectories.length ? `        <div class="exercise-grid">
${cardsMarkup}
        </div>` : renderEmptyState()}
      </section>

      <footer class="page-footer">
        <p>생성 파일: <code>index.html</code> | 생성 스크립트: <code>scripts/generate-root-index.js</code></p>
      </footer>
    </main>
  </body>
</html>
`;
}

function main() {
  const fingerprint = computeInputFingerprint();
  if (shouldSkipRegeneration(fingerprint)) {
    console.log(
      `Skipped ${path.relative(ROOT_DIR, OUTPUT_FILE)} (inputs unchanged; use FORCE_ROOT_INDEX=1 or --force to regenerate).`
    );
    return;
  }

  const exerciseDirectories = getExerciseDirectories();
  const html = renderPage(exerciseDirectories);

  fs.writeFileSync(OUTPUT_FILE, html, "utf8");
  try {
    fs.writeFileSync(FINGERPRINT_FILE, `${fingerprint}\n`, "utf8");
  } catch (err) {
    console.warn(`Warning: could not write fingerprint file ${FINGERPRINT_FILE}: ${err.message}`);
  }
  console.log(`Generated ${path.relative(ROOT_DIR, OUTPUT_FILE)} with ${exerciseDirectories.length} link(s).`);
}

main();
