const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT_DIR, "index.html");
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

  const [, cohort, day, project] = match;
  return `구름 ${cohort} 과정의 Day ${day}, Project ${project} 연습 페이지입니다.`;
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

function renderExerciseCard(dirname) {
  const title = formatExerciseTitle(dirname);
  const description = buildDescription(dirname);
  const href = `./${dirname}/`;

  return `        <article class="exercise-card">
          <header>
            <div class="badge-row">
              <span class="badge success">Ready</span>
              <span class="badge">Static HTML</span>
            </div>
            <h3>${escapeHtml(title)}</h3>
          </header>
          <p>${escapeHtml(description)}</p>
          <p class="path-label">${escapeHtml(dirname)}/index.html</p>
          <a class="card-link" href="${escapeHtml(href)}">페이지 열기</a>
        </article>`;
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
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
          루트 아래에 <code>index.html</code>이 있는 디렉터리를 자동으로 수집해 링크 카드로 보여줍니다.
        </p>
        <div class="hero-actions">
          ${primaryLinkMarkup}
          <a class="button-link" href="./README.html">README 보기</a>
        </div>
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
  const exerciseDirectories = getExerciseDirectories();
  const html = renderPage(exerciseDirectories);

  fs.writeFileSync(OUTPUT_FILE, html, "utf8");
  console.log(`Generated ${path.relative(ROOT_DIR, OUTPUT_FILE)} with ${exerciseDirectories.length} link(s).`);
}

main();
