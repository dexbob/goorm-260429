/** 페이지를 정적 허브(예: 포트 5000)에서 열었다면 `<meta name="todo-api-origin" content="http://호스트:3333" />` 로 API 서버 고정 */
function readTodoApiBase() {
  const el = document.querySelector('meta[name="todo-api-origin"]');
  const v = el?.getAttribute("content");
  const raw = typeof v === "string" ? v.trim() : "";
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

/** `start-servers.sh` 가 루트에 쓰는 hub-dev-ports.json 으로 같은 호스트의 Node 포트 자동 연결 */
let API_BASE = readTodoApiBase();

/** GitHub Pages 등 동일 오리진에 Node API가 없는 호스트(커스텀 도메인 제외) */
function isGithubPagesHost() {
  if (typeof location === "undefined") return false;
  const host = String(location.hostname || "").toLowerCase();
  return host === "github.io" || host.endsWith(".github.io");
}

async function resolveApiBaseFromHubMap() {
  if (API_BASE) return;
  /** 저장소 루트의 hub 파일이 `*.github.io/hub-dev-ports.json`으로 잡히면 잘못된 포트가 API_BASE에 들어가 Pages에서 API 시도가 이어짐 */
  if (typeof location !== "undefined" && isGithubPagesHost()) return;
  if (typeof location === "undefined" || !/^https?:/i.test(location.protocol)) return;
  const parts = location.pathname.split("/").filter(Boolean);
  const projectDir = parts[0];
  if (!projectDir) return;
  try {
    const res = await fetch(`${location.origin}/hub-dev-ports.json`, { cache: "no-store" });
    if (!res.ok) return;
    const map = await res.json();
    if (!map || typeof map !== "object") return;
    const rawPort = map[projectDir];
    const port =
      typeof rawPort === "string" ? Number.parseInt(rawPort, 10) : typeof rawPort === "number" ? rawPort : NaN;
    if (!Number.isFinite(port) || port <= 0 || port > 65535) return;
    API_BASE = `${location.protocol}//${location.hostname}:${port}`;
  } catch {
    /* 파일 없음 */
  }
}

const THEME_KEY = "todo_app_theme";
const LANG_KEY = "todo_app_lang";
const TODOS_LOCAL_KEY = "todo_app_todos_v1";
const CAL_COLORS_KEY_LEGACY = "todo_app_cal_colors_v1";
const CAL_PRESETS_KEY = "todo_app_cal_presets_v1";
const CAL_PRESET_COUNT = 5;

const CAL_DERIVED_TONES = /** @type {const} */ (["0", "25", "50", "75", "100"]);

/** 테마별 5종 기본 조합(바깥=캘린더, 안=진행률) — 사용자 수정 시 슬롯별로 저장 */
const DEFAULT_CAL_PRESETS = {
  light: [
    { base: "#fffbf5", progress: "#d97706" },
    { base: "#f1f5f9", progress: "#2563eb" },
    { base: "#fefce8", progress: "#16a34a" },
    { base: "#fff1f2", progress: "#e11d48" },
    { base: "#f5f3ff", progress: "#7c3aed" },
  ],
  dark: [
    { base: "#322b26", progress: "#f59e0b" },
    { base: "#1e293b", progress: "#38bdf8" },
    { base: "#1a2e1a", progress: "#4ade80" },
    { base: "#2a1818", progress: "#fb7185" },
    { base: "#241f30", progress: "#a78bfa" },
  ],
};

let calPresetsMigrated = false;

let todos = [];
let currentFilter = "all";
let currentLanguage = "ko";
let drawerOpen = false;
let currentView = "todo";
let calendarCursor = startOfMonth(new Date());
/** YYYY-MM-DD — 편집·추가·목록 필터 기준 날짜 */
let selectedDateKey = todayDateKey();

/** 월별 통계(/api/stats/month) 결과 캐시 */
let monthSummary = {};
let dataMode = "api";

function showError(message) {
  window.alert(message);
}

const i18n = {
  ko: {
    appTitle: "오늘의 할일",
    drawerTitle: "옵션",
    menuOpenAria: "옵션 메뉴 열기",
    menuCloseAria: "옵션 메뉴 닫기",
    drawerCloseAria: "메뉴 닫기",
    calendarTitle: "캘린더",
    headerDateAriaOpenCal: "캘린더에서 날짜 선택",
    headerDateAriaBackTodo: "할일 목록으로 돌아가기",
    headerDateHintOpen: "캘린더 열기",
    headerDateHintBack: "목록으로 돌아가기",
    calendarWeekdays: ["일", "월", "화", "수", "목", "금", "토"],
    calendarPrevAria: "이전 달",
    calendarNextAria: "다음 달",
    countTodoLabel: "할일",
    countDoneLabel: "완료",
    apiErrorLoad: "할 일을 불러오지 못했습니다. 서버(npm start)를 실행했는지 확인해 주세요.",
    apiErrorSave: "저장하지 못했습니다. 네트워크를 확인해 주세요.",
    apiError501Static:
      "지금 주소는 정적 허브(예: 포트 5000)라서 이 페이지만으로는 API(/api/…)가 없습니다. `./start-servers.sh` 로 허브와 Node를 같이 띄운 뒤 같은 호스트로 다시 열면, 루트의 hub-dev-ports.json 으로 API 포트가 자동 연결됩니다.\n\n직접 Node만 쓰려면 해당 프로젝트 폴더에서 npm start 후 터미널에 나온 http://호스트:포트 로 여세요.\n\n수동으로 고정하려면 index.html 의 meta todo-api-origin 에 API 베이스 URL을 적을 수 있습니다.",
    filterGroupAria: "상태별로 보기",
    language: "언어",
    theme: "테마",
    stackOpen: "기술 스택 보기",
    stackCloseAria: "기술 스택 창 닫기",
    drawerFooterMetaAria: "메타 정보 및 연락처",
    langNameKo: "한국어",
    langNameEn: "English",
    langNameJa: "日本語",
    langNameZh: "中文",
    themeLightAria: "라이트 모드",
    themeDarkAria: "다크 모드",
    styleLegend: "스타일",
    calColorBase: "캘린더",
    calColorProgress: "진행률",
    calPresetGroupAria: "캘린더·진행률 색 조합 선택",
    calPresetCombo: "조합",
    calColorAriaBase: "할 일 없는 날짜 칸 배경색",
    calColorAriaProgress:
      "진행률 기준색 — 100%에 그대로 쓰이며, 진행 칸 배경은 캘린더색에서 이 색으로 비율 보간됩니다(0% 완료는 빈 칸과 살짝 다르게 표시)",
    devFooter1: "📅 2026년 5월 1일",
    devFooter2: "👤 Dexter",
    devFooter3:
      '🌐 <a href="https://dexter.com" target="_blank" rel="noreferrer">dexter.com</a>',
    devFooter4:
      '✉️ <a href="mailto:services@dexter.com">services@dexter.com</a>',
    stackItems: [
      "HTML, CSS, Vanilla JavaScript",
      "Express — REST API 및 정적 파일 서빙",
      "SQLite — Node 내장 모듈 node:sqlite",
      "LocalStorage — 테마·언어; API 없을 때 할 일·월 통계(예: GitHub Pages)",
    ],
    inputPlaceholder: "무엇을 해야 하나요?",
    add: "추가",
    all: "전체",
    active: "진행 중",
    completed: "완료",
    emptyAll: "할 일이 없습니다. 위에서 추가해 보세요.",
    emptyFiltered: "현재 필터에 맞는 할 일이 없습니다.",
    delete: "삭제",
    stackTitle: "기술 스택",
  },
  en: {
    appTitle: "Today's tasks",
    drawerTitle: "Options",
    menuOpenAria: "Open options menu",
    menuCloseAria: "Close options menu",
    drawerCloseAria: "Close menu",
    calendarTitle: "Calendar",
    headerDateAriaOpenCal: "Open calendar to choose a date",
    headerDateAriaBackTodo: "Back to task list",
    headerDateHintOpen: "Open calendar",
    headerDateHintBack: "Back to list",
    calendarWeekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    calendarPrevAria: "Previous month",
    calendarNextAria: "Next month",
    countTodoLabel: "Tasks",
    countDoneLabel: "Done",
    apiErrorLoad: "Could not load tasks. Is the server running (npm start)?",
    apiErrorSave: "Could not save changes. Please check your network.",
    apiError501Static:
      "This URL is only the static hub (e.g. port 5000), so /api routes are not served here. Run ./start-servers.sh so the hub and Node apps start together; the app then loads hub-dev-ports.json from the hub origin to find the API port on the same host.\n\nOr run npm start inside the project folder and open the printed URL.\n\nYou can also set <meta name=\"todo-api-origin\" content=\"http://HOST:PORT\"> in index.html.",
    filterGroupAria: "Filter by status",
    language: "Language",
    theme: "Theme",
    stackOpen: "View tech stack",
    stackCloseAria: "Close tech stack dialog",
    drawerFooterMetaAria: "Site info and contacts",
    langNameKo: "Korean",
    langNameEn: "English",
    langNameJa: "Japanese",
    langNameZh: "Chinese",
    themeLightAria: "Light mode",
    themeDarkAria: "Dark mode",
    styleLegend: "Style",
    calColorBase: "Calendar",
    calColorProgress: "Progress",
    calPresetGroupAria: "Choose a calendar and progress color pairing",
    calPresetCombo: "Set",
    calColorAriaBase: "Day cell background when there are no tasks",
    calColorAriaProgress:
      "Progress key color — 100% uses it as-is; filled cells blend from calendar color toward this color (0% done is slightly tinted vs empty cells)",
    devFooter1: "📅 May 1, 2026",
    devFooter2: "👤 Dexter",
    devFooter3:
      '🌐 <a href="https://dexter.com" target="_blank" rel="noreferrer">dexter.com</a>',
    devFooter4:
      '✉️ <a href="mailto:services@dexter.com">services@dexter.com</a>',
    stackItems: [
      "HTML, CSS, Vanilla JavaScript",
      "Express — REST API and static hosting",
      "SQLite via Node built-in module node:sqlite",
      "LocalStorage — theme & language; todos & month stats when no API (e.g. GitHub Pages)",
    ],
    inputPlaceholder: "What needs to be done?",
    add: "Add",
    all: "All",
    active: "Active",
    completed: "Completed",
    emptyAll: "No tasks yet. Add one above.",
    emptyFiltered: "No tasks match this filter.",
    delete: "Delete",
    stackTitle: "Tech Stack",
  },
  ja: {
    appTitle: "今日のタスク",
    drawerTitle: "オプション",
    menuOpenAria: "オプションメニューを開く",
    menuCloseAria: "オプションメニューを閉じる",
    drawerCloseAria: "メニューを閉じる",
    calendarTitle: "カレンダー",
    headerDateAriaOpenCal: "カレンダーを開いて日付を選ぶ",
    headerDateAriaBackTodo: "タスク一覧に戻る",
    headerDateHintOpen: "カレンダーを開く",
    headerDateHintBack: "一覧に戻る",
    calendarWeekdays: ["日", "月", "火", "水", "木", "金", "土"],
    calendarPrevAria: "前の月",
    calendarNextAria: "次の月",
    countTodoLabel: "タスク",
    countDoneLabel: "完了",
    apiErrorLoad: "読み込みに失敗しました。サーバー(npm start)を確認してください。",
    apiErrorSave: "保存に失敗しました。ネットワークを確認してください。",
    apiError501Static:
      "統合サイトの静的サーバー(Pythonなど、ポート5000)だけで開いている場合、POSTが使えず 501 が返ります。\n\n対処: goorm-260501-d3-p1-webpage で npm install && npm start し、表示されたURL（既定3333）で開いてください。\n\nHTMLだけ別ポートから開く場合は index.html に meta todo-api-origin で API の http://ホスト:3333 を指定できます。",
    filterGroupAria: "状態で絞り込み",
    language: "言語",
    theme: "テーマ",
    stackOpen: "技術スタックを見る",
    stackCloseAria: "技術スタックを閉じる",
    drawerFooterMetaAria: "メタ情報とリンク",
    langNameKo: "韓国語",
    langNameEn: "英語",
    langNameJa: "日本語",
    langNameZh: "中国語",
    themeLightAria: "ライトモード",
    themeDarkAria: "ダークモード",
    styleLegend: "スタイル",
    calColorBase: "カレンダー",
    calColorProgress: "進捗率",
    calPresetGroupAria: "カレンダーと進捗の色の組み合わせ",
    calPresetCombo: "セット",
    calColorAriaBase: "タスクがない日のマス背景色",
    calColorAriaProgress:
      "進捗の基準色 — 100%はそのまま。埋まるマスはカレンダー色からこの色へ線形ブレンド(0%は空マスとわずかに差)",
    devFooter1: "📅 2026年5月1日",
    devFooter2: "👤 Dexter",
    devFooter3:
      '🌐 <a href="https://dexter.com" target="_blank" rel="noreferrer">dexter.com</a>',
    devFooter4:
      '✉️ <a href="mailto:services@dexter.com">services@dexter.com</a>',
    stackItems: [
      "HTML, CSS, Vanilla JavaScript",
      "Express — REST API と静的ファイル配信",
      "SQLite — Node 組み込み node:sqlite",
      "LocalStorage — テーマ・言語; API なし時はタスク・月次集計 (例: GitHub Pages)",
    ],
    inputPlaceholder: "何をしますか?",
    add: "追加",
    all: "すべて",
    active: "未完了",
    completed: "完了",
    emptyAll: "タスクがありません。上で追加してください。",
    emptyFiltered: "このフィルターに一致するタスクがありません。",
    delete: "削除",
    stackTitle: "技術スタック",
  },
  zh: {
    appTitle: "今日待办",
    drawerTitle: "选项",
    menuOpenAria: "打开选项菜单",
    menuCloseAria: "关闭选项菜单",
    drawerCloseAria: "关闭菜单",
    calendarTitle: "日历",
    headerDateAriaOpenCal: "打开日历选择日期",
    headerDateAriaBackTodo: "返回待办列表",
    headerDateHintOpen: "打开日历",
    headerDateHintBack: "返回列表",
    calendarWeekdays: ["日", "一", "二", "三", "四", "五", "六"],
    calendarPrevAria: "上个月",
    calendarNextAria: "下个月",
    countTodoLabel: "任务",
    countDoneLabel: "完成",
    apiErrorLoad: "加载失败。请确认服务器已启动 (npm start)。",
    apiErrorSave: "保存失败。请检查网络。",
    apiError501Static:
      "若仅通过聚合页的静态服务器（例如 Python http.server，5000端口）打开本页，无法处理 POST 请求并会返回 501。\n\n解决：进入 goorm-260501-d3-p1-webpage 目录执行 npm install && npm start，用终端提示的地址（默认 3333 端口）打开。\n\n若必须从其他端口加载 HTML，可在 index.html 用 meta todo-api-origin 写明 API 地址 http://主机:3333，并启动 Node API 服务以便 CORS 访问。",
    filterGroupAria: "按状态筛选",
    language: "语言",
    theme: "主题",
    stackOpen: "查看技术栈",
    stackCloseAria: "关闭技术栈窗口",
    drawerFooterMetaAria: "信息与链接",
    langNameKo: "韩语",
    langNameEn: "英语",
    langNameJa: "日语",
    langNameZh: "中文",
    themeLightAria: "浅色模式",
    themeDarkAria: "深色模式",
    styleLegend: "样式",
    calColorBase: "日历",
    calColorProgress: "进度",
    calPresetGroupAria: "日历与进度颜色搭配",
    calPresetCombo: "组合",
    calColorAriaBase: "无任务时的日期格背景色",
    calColorAriaProgress: "进度基准色 — 100% 不变；有任务的格子从日历色向该色线性过渡（0% 完成与空格子略有区分）",
    devFooter1: "📅 2026年5月1日",
    devFooter2: "👤 Dexter",
    devFooter3:
      '🌐 <a href="https://dexter.com" target="_blank" rel="noreferrer">dexter.com</a>',
    devFooter4:
      '✉️ <a href="mailto:services@dexter.com">services@dexter.com</a>',
    stackItems: [
      "HTML、CSS、原生 JavaScript",
      "Express — REST API 与静态资源",
      "SQLite — Node 内置 node:sqlite",
      "LocalStorage — 主题与语言；无 API 时保存任务与月度统计（如 GitHub Pages）",
    ],
    inputPlaceholder: "需要完成什么?",
    add: "添加",
    all: "全部",
    active: "进行中",
    completed: "已完成",
    emptyAll: "还没有任务，请先添加。",
    emptyFiltered: "当前筛选条件下没有任务。",
    delete: "删除",
    stackTitle: "技术栈",
  },
};

function t(key) {
  return i18n[currentLanguage][key] || i18n.ko[key] || key;
}

function calColorLabelKey(slot) {
  return slot === "progress" ? "calColorProgress" : "calColorBase";
}

function calColorAriaKey(slot) {
  return slot === "progress" ? "calColorAriaProgress" : "calColorAriaBase";
}

function normalizeHexColor(raw) {
  let s = String(raw || "").trim();
  if (!s.startsWith("#")) s = `#${s}`;
  const m6 = /^#([0-9a-f]{6})$/i.exec(s);
  if (m6) return `#${m6[1].toLowerCase()}`;
  const m3 = /^#([0-9a-f]{3})$/i.exec(s);
  if (m3) {
    const a = m3[1];
    return `#${a[0]}${a[0]}${a[1]}${a[1]}${a[2]}${a[2]}`.toLowerCase();
  }
  return "#888888";
}

function hexToRgb(hex) {
  const h = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const x = (n) =>
    Math.max(0, Math.min(255, Math.round(Number(n))))
      .toString(16)
      .padStart(2, "0");
  return `#${x(r)}${x(g)}${x(b)}`;
}

function mixRgbHex(hexA, hexB, t) {
  const A = hexToRgb(hexA);
  const B = hexToRgb(hexB);
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t,
  );
}

/**
 * 빈 칸: --cal-slot-base-bg(캘린더색)만 사용.
 * 할 일 있음: base→progress RGB 선형 보간. 100%는 progress 그대로.
 * 0% 완료(미완료만): base에 progress를 소량 섞어 빈 칸과 구분.
 */
function deriveToneColorsFromProgress(baseHex, progressHex, theme) {
  const b = normalizeHexColor(baseHex);
  const p = normalizeHexColor(progressHex);
  const zeroDoneTint = theme === "dark" ? 0.11 : 0.085;
  return {
    "0": mixRgbHex(b, p, zeroDoneTint),
    "25": mixRgbHex(b, p, 0.25),
    "50": mixRgbHex(b, p, 0.5),
    "75": mixRgbHex(b, p, 0.75),
    "100": p,
  };
}

function borderColorForFill(hex, theme) {
  const c = hexToRgb(hex);
  const mix = theme === "dark" ? 0.38 : 0.34;
  const t = theme === "dark" ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  return rgbToHex(
    c.r + (t.r - c.r) * mix,
    c.g + (t.g - c.g) * mix,
    c.b + (t.b - c.b) * mix,
  );
}

function migrateCalLegacyToPresetsIfNeeded() {
  if (calPresetsMigrated) return;
  calPresetsMigrated = true;
  if (localStorage.getItem(CAL_PRESETS_KEY)) return;
  const oldRaw = localStorage.getItem(CAL_COLORS_KEY_LEGACY);
  if (!oldRaw) return;
  try {
    const old = JSON.parse(oldRaw);
    const next = {};
    (/** @type {("light" | "dark")[]} */ (["light", "dark"])).forEach((th) => {
      const cur = old[th];
      const presets = DEFAULT_CAL_PRESETS[th].map((p) => ({ ...p }));
      if (cur && typeof cur === "object" && typeof cur.base === "string" && typeof cur.progress === "string") {
        presets[0] = { base: normalizeHexColor(cur.base), progress: normalizeHexColor(cur.progress) };
      }
      next[th] = { selected: 0, presets };
    });
    localStorage.setItem(CAL_PRESETS_KEY, JSON.stringify(next));
    localStorage.removeItem(CAL_COLORS_KEY_LEGACY);
  } catch {
    /* 무시 */
  }
}

function readCalPresetsRoot() {
  migrateCalLegacyToPresetsIfNeeded();
  try {
    const raw = localStorage.getItem(CAL_PRESETS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

function writeCalPresetsRoot(root) {
  localStorage.setItem(CAL_PRESETS_KEY, JSON.stringify(root));
}

function getCalPresetsStateForTheme(theme) {
  const def = DEFAULT_CAL_PRESETS[theme];
  const root = readCalPresetsRoot();
  const entry = root?.[theme];
  if (!entry || !Array.isArray(entry.presets)) {
    return { selected: 0, presets: def.map((p) => ({ ...p })) };
  }
  const presets = def.map((d, i) => ({
    base: normalizeHexColor(entry.presets[i]?.base || d.base),
    progress: normalizeHexColor(entry.presets[i]?.progress || d.progress),
  }));
  const selected = Math.min(CAL_PRESET_COUNT - 1, Math.max(0, Number(entry.selected) || 0));
  return { selected, presets };
}

function setCalPresetsStateForTheme(theme, state) {
  const root = readCalPresetsRoot() || {};
  root[theme] = state;
  writeCalPresetsRoot(root);
}

function getActivePresetPair() {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const { selected, presets } = getCalPresetsStateForTheme(theme);
  return presets[selected];
}

function persistActivePresetSlot(slot, hex) {
  if (slot !== "base" && slot !== "progress") return;
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const { selected, presets } = getCalPresetsStateForTheme(theme);
  const next = presets.map((p, i) =>
    i === selected ? { ...p, [slot]: normalizeHexColor(hex) } : { ...p },
  );
  setCalPresetsStateForTheme(theme, { selected, presets: next });
}

function setActiveCalPresetIndex(idx) {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const n = Math.min(CAL_PRESET_COUNT - 1, Math.max(0, Number(idx) || 0));
  const { presets } = getCalPresetsStateForTheme(theme);
  setCalPresetsStateForTheme(theme, { selected: n, presets });
}

function applyCalendarCustomColors() {
  const root = document.documentElement;
  const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const { base, progress } = getActivePresetPair();
  const tones = deriveToneColorsFromProgress(base, progress, theme);
  root.style.setProperty("--cal-slot-base-bg", base);
  root.style.setProperty("--cal-slot-base-border", borderColorForFill(base, theme));
  CAL_DERIVED_TONES.forEach((k) => {
    const bg = tones[k];
    root.style.setProperty(`--cal-slot-${k}-bg`, bg);
    root.style.setProperty(`--cal-slot-${k}-border`, borderColorForFill(bg, theme));
  });
}

function syncCalPresetRadios() {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const { selected } = getCalPresetsStateForTheme(theme);
  document.querySelectorAll('input[name="cal-preset"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = Number(el.value) === selected;
  });
}

function renderCalPresetFaces() {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const { presets } = getCalPresetsStateForTheme(theme);
  for (let i = 0; i < CAL_PRESET_COUNT; i += 1) {
    const lab = document.querySelector(`#cal-preset-row label[data-cal-preset-index="${i}"]`);
    const outer = lab?.querySelector(".drawer-cal-preset-outer");
    const inner = lab?.querySelector(".drawer-cal-preset-inner");
    if (!(outer instanceof HTMLElement) || !(inner instanceof HTMLElement)) continue;
    const { base, progress } = presets[i];
    outer.style.backgroundColor = base;
    outer.style.borderColor = borderColorForFill(base, theme);
    inner.style.backgroundColor = progress;
  }
}

function syncCalColorPickersFromState() {
  const colors = getActivePresetPair();
  document.querySelectorAll("input.drawer-cal-color-input").forEach((inp) => {
    if (!(inp instanceof HTMLInputElement)) return;
    const slot = inp.getAttribute("data-cal-slot");
    if (slot !== "base" && slot !== "progress") return;
    const hex = colors[slot];
    inp.value = hex;
    const sw = inp.closest("label")?.querySelector(".drawer-cal-swatch");
    if (sw instanceof HTMLElement) sw.style.backgroundColor = hex;
    const wrap = inp.closest(".drawer-cal-swatch-btn");
    if (wrap instanceof HTMLElement) wrap.setAttribute("title", hex);
  });
}

function syncCalStyleDrawerUi() {
  syncCalPresetRadios();
  syncCalColorPickersFromState();
  renderCalPresetFaces();
}

function refreshCalColorDrawerI18n() {
  const leg = document.getElementById("calendar-colors-legend");
  if (leg) leg.textContent = t("styleLegend");
  document.getElementById("cal-preset-row")?.setAttribute("aria-label", t("calPresetGroupAria"));
  document.querySelectorAll("[data-cal-label-slot]").forEach((el) => {
    const slot = el.getAttribute("data-cal-label-slot");
    if (!slot) return;
    el.textContent = t(calColorLabelKey(slot));
  });
  document.querySelectorAll("input.drawer-cal-color-input").forEach((inp) => {
    if (!(inp instanceof HTMLInputElement)) return;
    const slot = inp.getAttribute("data-cal-slot");
    if (!slot) return;
    inp.setAttribute("aria-label", t(calColorAriaKey(slot)));
  });
  document.querySelectorAll("#cal-preset-row label[data-cal-preset-index]").forEach((lab) => {
    const i = Number(lab.getAttribute("data-cal-preset-index"));
    if (!Number.isFinite(i)) return;
    lab.setAttribute("aria-label", `${t("calPresetCombo")} ${i + 1}`);
  });
  syncCalStyleDrawerUi();
}

function stackItemsForLang() {
  const lang = i18n[currentLanguage];
  return Array.isArray(lang.stackItems) ? lang.stackItems : i18n.ko.stackItems;
}

function renderStackDialogList() {
  const ul = document.getElementById("stack-dialog-list");
  if (!ul) return;
  ul.innerHTML = "";
  stackItemsForLang().forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    ul.appendChild(li);
  });
}

function openStackDialog() {
  const dlg = document.getElementById("stack-dialog");
  if (!(dlg instanceof HTMLDialogElement)) return;
  renderStackDialogList();
  const titleEl = document.getElementById("stack-dialog-title");
  if (titleEl) {
    titleEl.setAttribute("lang", currentLanguage);
    titleEl.textContent = t("stackTitle");
  }
  dlg.showModal();
}

function closeStackDialog() {
  const dlg = document.getElementById("stack-dialog");
  if (dlg instanceof HTMLDialogElement && dlg.open) dlg.close();
}

function showApiFailure(error, fallbackTKey) {
  if (error && typeof error === "object" && error.apiCode === "STATIC_HTTP_SERVER") {
    showError(t("apiError501Static"));
    return;
  }
  showError(`${t(fallbackTKey)}\n(${error?.message ?? String(error)})`);
}

function shouldUseLocalFallback(error) {
  if (!error) return false;
  if (typeof error === "object" && error.apiCode === "STATIC_HTTP_SERVER") return true;
  const msg = String(error?.message ?? error).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("not implemented") ||
    msg.includes("not found") ||
    msg.includes("404:") ||
    msg.includes("<!doctype")
  );
}

function readLocalTodoStore() {
  try {
    const raw = localStorage.getItem(TODOS_LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalTodoStore(store) {
  localStorage.setItem(TODOS_LOCAL_KEY, JSON.stringify(store));
}

function makeTodoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLocalTodosByDate(dateKey) {
  const store = readLocalTodoStore();
  const list = store?.[dateKey];
  if (!Array.isArray(list)) return [];
  return list.map((todo) => ({
    id: String(todo.id ?? makeTodoId()),
    text: String(todo.text ?? ""),
    completed: !!todo.completed,
    taskDate: dateKey,
    createdAt: Number(todo.createdAt) || Date.now(),
    updatedAt: Number(todo.updatedAt) || Date.now(),
  }));
}

function setLocalTodosByDate(dateKey, list) {
  const store = readLocalTodoStore();
  store[dateKey] = list;
  writeLocalTodoStore(store);
}

function buildMonthSummaryFromLocal(year, month) {
  const store = readLocalTodoStore();
  const counts = {};
  Object.entries(store).forEach(([key, value]) => {
    if (!Array.isArray(value)) return;
    const [y, m] = key.split("-").map(Number);
    if (y !== year || m !== month) return;
    let total = 0;
    let done = 0;
    value.forEach((todo) => {
      total += 1;
      if (todo?.completed) done += 1;
    });
    if (total > 0) counts[key] = { total, done };
  });
  return counts;
}

async function fetchJson(url, opts = {}) {
  const headers = { ...opts.headers };
  if (
    opts.body &&
    typeof opts.body === "string" &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    if (res.status === 501) {
      /** Python http.server 등 정적 제공만 하는 경우 일반적인 응답 */
      throw Object.assign(new Error("501 Not Implemented"), { apiCode: "STATIC_HTTP_SERVER" });
    }
    if (res.status === 404) {
      const body = typeof text === "string" ? text : "";
      if (/<!DOCTYPE\s+HTML/i.test(body) && /Error response/i.test(body)) {
        throw Object.assign(new Error("404 Not Found (static hub)"), { apiCode: "STATIC_HTTP_SERVER" });
      }
      /** GitHub Pages·정적 호스팅의 HTML 404 등 → LocalStorage 폴백으로 이어지게 */
      if (/<!DOCTYPE/i.test(body)) {
        throw Object.assign(new Error("404 Not Found (HTML)"), { apiCode: "STATIC_HTTP_SERVER" });
      }
    }
    const detail =
      typeof data === "object" && data?.error ? data.error : String(text || res.statusText).slice(0, 480);
    throw new Error(`${res.status}: ${detail}`);
  }
  return data;
}

function todayDateKey() {
  return toDateKey(Date.now());
}

function toDateKey(tsOrDate) {
  const d = tsOrDate instanceof Date ? tsOrDate : new Date(tsOrDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateKeyToDate(key) {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function refreshMonthSummary() {
  const y = calendarCursor.getFullYear();
  const mo = calendarCursor.getMonth() + 1;
  if (dataMode === "local") {
    monthSummary = buildMonthSummaryFromLocal(y, mo);
    return;
  }
  try {
    const data = await fetchJson(`${API_BASE}/api/stats/month?year=${y}&month=${mo}`);
    monthSummary = data?.counts || {};
  } catch (e) {
    if (shouldUseLocalFallback(e)) {
      dataMode = "local";
      monthSummary = buildMonthSummaryFromLocal(y, mo);
      return;
    }
    monthSummary = {};
  }
}

async function loadTodosForSelectedDate() {
  if (dataMode === "local") {
    todos = getLocalTodosByDate(selectedDateKey);
    renderTodos();
    updateHeaderDateText();
    return;
  }
  try {
    const data = await fetchJson(`${API_BASE}/api/todos?date=${encodeURIComponent(selectedDateKey)}`);
    todos = Array.isArray(data?.todos) ? data.todos : [];
    dataMode = "api";
    renderTodos();
    updateHeaderDateText();
  } catch (e) {
    if (shouldUseLocalFallback(e)) {
      dataMode = "local";
      todos = getLocalTodosByDate(selectedDateKey);
      renderTodos();
      updateHeaderDateText();
      return;
    }
    todos = [];
    renderTodos();
    showApiFailure(e, "apiErrorLoad");
  }
}

async function addTodoRemote(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return;
  if (dataMode === "local") {
    const list = getLocalTodosByDate(selectedDateKey);
    const now = Date.now();
    list.push({
      id: makeTodoId(),
      text: trimmed,
      completed: false,
      taskDate: selectedDateKey,
      createdAt: now,
      updatedAt: now,
    });
    setLocalTodosByDate(selectedDateKey, list);
    return;
  }
  try {
    await fetchJson(`${API_BASE}/api/todos`, {
      method: "POST",
      body: JSON.stringify({ text: trimmed, taskDate: selectedDateKey }),
    });
  } catch (e) {
    if (!shouldUseLocalFallback(e)) throw e;
    dataMode = "local";
    const list = getLocalTodosByDate(selectedDateKey);
    const now = Date.now();
    list.push({
      id: makeTodoId(),
      text: trimmed,
      completed: false,
      taskDate: selectedDateKey,
      createdAt: now,
      updatedAt: now,
    });
    setLocalTodosByDate(selectedDateKey, list);
  }
}

async function deleteTodoRemote(id) {
  if (dataMode === "local") {
    const list = getLocalTodosByDate(selectedDateKey).filter((x) => x.id !== id);
    setLocalTodosByDate(selectedDateKey, list);
    return;
  }
  try {
    await fetchJson(`${API_BASE}/api/todos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (e) {
    if (!shouldUseLocalFallback(e)) throw e;
    dataMode = "local";
    const list = getLocalTodosByDate(selectedDateKey).filter((x) => x.id !== id);
    setLocalTodosByDate(selectedDateKey, list);
  }
}

async function toggleTodoRemote(id) {
  const todo = todos.find((x) => x.id === id);
  if (!todo) return;
  if (dataMode === "local") {
    const list = getLocalTodosByDate(selectedDateKey).map((x) =>
      x.id === id ? { ...x, completed: !x.completed, updatedAt: Date.now() } : x,
    );
    setLocalTodosByDate(selectedDateKey, list);
    return;
  }
  try {
    await fetchJson(`${API_BASE}/api/todos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !todo.completed }),
    });
  } catch (e) {
    if (!shouldUseLocalFallback(e)) throw e;
    dataMode = "local";
    const list = getLocalTodosByDate(selectedDateKey).map((x) =>
      x.id === id ? { ...x, completed: !x.completed, updatedAt: Date.now() } : x,
    );
    setLocalTodosByDate(selectedDateKey, list);
  }
}

function filterTodos(type) {
  currentFilter = type;
  updateFilterButtons();
  renderTodos();
}

function updateFilterButtons() {
  const map = {
    all: document.getElementById("filter-all"),
    active: document.getElementById("filter-active"),
    completed: document.getElementById("filter-completed"),
  };
  Object.keys(map).forEach((key) => {
    map[key]?.setAttribute("aria-pressed", key === currentFilter ? "true" : "false");
  });
}

function getFilteredList() {
  let list = [...todos].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  if (currentFilter === "active") list = list.filter((todo) => !todo.completed);
  if (currentFilter === "completed") list = list.filter((todo) => todo.completed);
  return list;
}

function renderTodos() {
  const ul = document.getElementById("todo-list");
  const empty = document.getElementById("empty-message");
  if (!ul || !empty) return;

  const list = getFilteredList();
  ul.innerHTML = "";

  list.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item${todo.completed ? " is-completed" : ""}`;
    li.dataset.id = todo.id;

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("data-action", "toggle");

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete-btn";
    delBtn.setAttribute("data-action", "delete");
    delBtn.textContent = t("delete");

    label.appendChild(checkbox);
    label.appendChild(span);
    li.appendChild(label);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });

  empty.hidden = list.length !== 0;
  const dayEmpty = todos.length === 0;
  if (!empty.hidden) {
    empty.textContent = dayEmpty ? t("emptyAll") : t("emptyFiltered");
  }
}

function formatDateKeyForDisplay(dateKey) {
  const [y, m, day] = dateKey.split("-").map(Number);
  if (!y || !m || !day) return dateKey;
  const localeMap = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" };
  return new Intl.DateTimeFormat(localeMap[currentLanguage] || "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(y, m - 1, day));
}

function formatDateKeyForHover(dateKey) {
  const [y, m, day] = dateKey.split("-").map(Number);
  if (!y || !m || !day) return dateKey;
  const localeMap = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" };
  return new Intl.DateTimeFormat(localeMap[currentLanguage] || "ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(y, m - 1, day));
}

function updateHeaderDateText() {
  const el = document.getElementById("header-date-display");
  if (!el) return;
  el.textContent = formatDateKeyForDisplay(selectedDateKey);
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-month-label");
  if (!grid || !label) return;

  const localeMap = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" };
  const locale = localeMap[currentLanguage] || "ko-KR";
  label.textContent = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(calendarCursor);

  grid.innerHTML = "";
  t("calendarWeekdays").forEach((wd) => {
    const head = document.createElement("div");
    head.className = "calendar-weekday";
    head.textContent = wd;
    grid.appendChild(head);
  });

  const firstDay = startOfMonth(calendarCursor);
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + i);
    const key = toDateKey(cellDate);
    const stats = monthSummary[key] || { total: 0, done: 0 };

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day-btn";
    if (cellDate.getMonth() !== calendarCursor.getMonth()) btn.classList.add("is-other-month");
    if (key === selectedDateKey) btn.classList.add("is-selected");
    btn.dataset.date = key;

    const dayNum = document.createElement("span");
    dayNum.className = "calendar-day-number";
    dayNum.textContent = String(cellDate.getDate());
    btn.appendChild(dayNum);

    if (stats.total > 0) {
      btn.classList.add("has-todos");
      let tone = "0";
      if (stats.done === stats.total) {
        tone = "100";
      } else {
        const r = stats.done / stats.total;
        if (r <= 0) tone = "0";
        else if (r <= 0.25) tone = "25";
        else if (r <= 0.5) tone = "50";
        else if (r <= 0.75) tone = "75";
        else tone = "75";
      }
      btn.classList.add(`cal-tone-${tone}`);
      if (stats.done === stats.total) btn.classList.add("is-all-done");
      const statsWrap = document.createElement("span");
      statsWrap.className = "calendar-day-stats";

      const line1 = document.createElement("span");
      line1.className = "calendar-stat-line";
      line1.textContent = `- ${t("countTodoLabel")} ${stats.total}`;

      const line2 = document.createElement("span");
      line2.className = "calendar-stat-line";
      line2.textContent = `- ${t("countDoneLabel")} ${stats.done}`;

      statsWrap.appendChild(line1);
      statsWrap.appendChild(line2);
      btn.appendChild(statsWrap);
    }

    const hoverLines =
      stats.total > 0
        ? `${formatDateKeyForHover(key)}\n- ${t("countTodoLabel")} ${stats.total}\n- ${t("countDoneLabel")} ${stats.done}`
        : formatDateKeyForHover(key);
    btn.setAttribute("data-hover-info", hoverLines);

    grid.appendChild(btn);
  }
}

function setView(view) {
  currentView = view === "calendar" ? "calendar" : "todo";
  const todoEl = document.getElementById("todo-view");
  const calEl = document.getElementById("calendar-view");
  if (!todoEl || !calEl) return;
  todoEl.hidden = currentView !== "todo";
  calEl.hidden = currentView !== "calendar";
  updateHeaderDateButtonState();
}

async function openCalendarAroundSelection() {
  calendarCursor = startOfMonth(dateKeyToDate(selectedDateKey));
  setView("calendar");
  await refreshMonthSummary();
  renderCalendar();
}

function syncThemeRadios() {
  const th = document.documentElement.getAttribute("data-theme") || "light";
  document.querySelectorAll('input[name="app-theme"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = el.value === th;
  });
}

function syncLanguageRadios() {
  document.querySelectorAll('input[name="app-language"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = el.value === currentLanguage;
  });
}

function refreshDrawerControlsI18n() {
  const legendLang = document.getElementById("language-label");
  const legendTheme = document.getElementById("theme-label");
  if (legendLang) legendLang.textContent = t("language");
  if (legendTheme) legendTheme.textContent = t("theme");

  /** @type {Record<string, string>} */
  const langKeys = { ko: "langNameKo", en: "langNameEn", ja: "langNameJa", zh: "langNameZh" };
  document.querySelectorAll("label[data-lang-opt]").forEach((lab) => {
    const c = lab.getAttribute("data-lang-opt") || "";
    const key = langKeys[c];
    if (key) lab.setAttribute("aria-label", t(key));
  });
  document.querySelector('label[data-theme-opt="light"]')?.setAttribute("aria-label", t("themeLightAria"));
  document.querySelector('label[data-theme-opt="dark"]')?.setAttribute("aria-label", t("themeDarkAria"));
  document.querySelector(".drawer-footer")?.setAttribute("aria-label", t("drawerFooterMetaAria"));
  refreshCalColorDrawerI18n();
}

function setTheme(theme) {
  const html = document.documentElement;
  const normalized = theme === "dark" ? "dark" : "light";
  html.setAttribute("data-theme", normalized);
  localStorage.setItem(THEME_KEY, normalized);
  syncThemeRadios();
  applyCalendarCustomColors();
  syncCalStyleDrawerUi();
}

function updateHeaderDateButtonState() {
  const headerDateBtn = document.getElementById("header-date-btn");
  if (!headerDateBtn) return;
  const inCalendar = currentView === "calendar";
  headerDateBtn.setAttribute(
    "aria-label",
    inCalendar ? t("headerDateAriaBackTodo") : t("headerDateAriaOpenCal"),
  );
  headerDateBtn.setAttribute("data-open-hint", inCalendar ? t("headerDateHintBack") : t("headerDateHintOpen"));
}

function setDrawerOpen(open) {
  drawerOpen = open;
  const body = document.body;
  const backdrop = document.getElementById("drawer-backdrop");
  const drawer = document.getElementById("options-drawer");
  const toggle = document.getElementById("menu-toggle");
  const closeBtn = document.getElementById("drawer-close");

  if (!backdrop || !drawer || !toggle) return;

  if (!open) {
    closeStackDialog();
  }

  if (open) {
    drawer.removeAttribute("hidden");
    backdrop.removeAttribute("hidden");
    body.classList.add("drawer-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", t("menuCloseAria"));
    closeBtn?.focus();
  } else {
    drawer.setAttribute("hidden", "");
    backdrop.setAttribute("hidden", "");
    body.classList.remove("drawer-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("menuOpenAria"));
    toggle.focus();
  }
}

function applyLanguage(lang) {
  currentLanguage = i18n[lang] ? lang : "ko";
  localStorage.setItem(LANG_KEY, currentLanguage);

  document.documentElement.lang = currentLanguage;

  document.getElementById("app-title").textContent = t("appTitle");
  document.getElementById("options-drawer")?.setAttribute("aria-label", t("drawerTitle"));
  document.getElementById("calendar-heading").textContent = t("calendarTitle");
  updateHeaderDateButtonState();

  refreshDrawerControlsI18n();

  const stackLbl = document.getElementById("stack-open-label");
  if (stackLbl) stackLbl.textContent = t("stackTitle");
  const stackOpenBtnEl = document.getElementById("stack-open-btn");
  if (stackOpenBtnEl) {
    stackOpenBtnEl.setAttribute("aria-label", t("stackOpen"));
    stackOpenBtnEl.setAttribute("title", t("stackOpen"));
  }
  const f1 = document.getElementById("dev-footer-l1");
  const f2 = document.getElementById("dev-footer-l2");
  const f3 = document.getElementById("dev-footer-l3");
  const f4 = document.getElementById("dev-footer-l4");
  if (f1) f1.textContent = t("devFooter1");
  if (f2) f2.textContent = t("devFooter2");
  if (f3) f3.innerHTML = t("devFooter3");
  if (f4) f4.innerHTML = t("devFooter4");
  document.getElementById("stack-dialog-close")?.setAttribute("aria-label", t("stackCloseAria"));
  document.getElementById("todo-input").placeholder = t("inputPlaceholder");
  document.getElementById("add-button").textContent = t("add");
  document.getElementById("filter-all").textContent = t("all");
  document.getElementById("filter-active").textContent = t("active");
  document.getElementById("filter-completed").textContent = t("completed");
  document.getElementById("filter-row")?.setAttribute("aria-label", t("filterGroupAria"));
  document.getElementById("stack-dialog-title").textContent = t("stackTitle");
  renderStackDialogList();

  document.getElementById("calendar-prev")?.setAttribute("aria-label", t("calendarPrevAria"));
  document.getElementById("calendar-next")?.setAttribute("aria-label", t("calendarNextAria"));
  document.getElementById("drawer-close")?.setAttribute("aria-label", t("drawerCloseAria"));

  const menuToggle = document.getElementById("menu-toggle");
  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", drawerOpen ? "true" : "false");
    menuToggle.setAttribute("aria-label", drawerOpen ? t("menuCloseAria") : t("menuOpenAria"));
  }

  syncLanguageRadios();

  updateHeaderDateText();
  renderTodos();
  renderCalendar();
}

async function tryAddFromInput() {
  const input = document.getElementById("todo-input");
  if (!input) return;
  if (!String(input.value).trim()) return;
  try {
    await addTodoRemote(input.value);
    input.value = "";
    input.focus();
    await loadTodosForSelectedDate();
    await refreshMonthSummary();
    renderCalendar();
  } catch (e) {
    showApiFailure(e, "apiErrorSave");
  }
}

function onTodoListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
  if (target.getAttribute("data-action") !== "toggle") return;
  const id = target.closest(".todo-item")?.dataset.id;
  if (id) {
    toggleTodoRemote(id)
      .then(() => loadTodosForSelectedDate())
      .then(() => refreshMonthSummary())
      .then(() => renderCalendar())
      .catch((e) => showApiFailure(e, "apiErrorSave"));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await resolveApiBaseFromHubMap();
  /** Pages에서는 hub가 잘못된 API_BASE를 넣을 수 있으므로 meta 가 없을 때만 로컬 모드 + 베이스 초기화 */
  if (isGithubPagesHost() && !readTodoApiBase()) {
    API_BASE = "";
    dataMode = "local";
  }

  selectedDateKey = todayDateKey();
  calendarCursor = startOfMonth(new Date());

  const input = document.getElementById("todo-input");
  const addButton = document.getElementById("add-button");
  const list = document.getElementById("todo-list");
  const drawerBody = document.querySelector(".drawer-body-scroll");
  const stackOpenBtn = document.getElementById("stack-open-btn");
  const stackDialogClose = document.getElementById("stack-dialog-close");
  const stackDialog = document.getElementById("stack-dialog");
  const menuToggle = document.getElementById("menu-toggle");
  const drawerClose = document.getElementById("drawer-close");
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const headerDateBtn = document.getElementById("header-date-btn");
  const calendarPrev = document.getElementById("calendar-prev");
  const calendarNext = document.getElementById("calendar-next");
  const calendarGrid = document.getElementById("calendar-grid");

  document.getElementById("filter-all")?.addEventListener("click", () => filterTodos("all"));
  document.getElementById("filter-active")?.addEventListener("click", () => filterTodos("active"));
  document.getElementById("filter-completed")?.addEventListener("click", () => filterTodos("completed"));

  addButton?.addEventListener("click", tryAddFromInput);
  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    tryAddFromInput();
  });

  list?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.getAttribute("data-action") !== "delete") return;
    const id = target.closest(".todo-item")?.dataset.id;
    if (!id) return;
    deleteTodoRemote(id)
      .then(() => loadTodosForSelectedDate())
      .then(() => refreshMonthSummary())
      .then(() => renderCalendar())
      .catch((e) => showApiFailure(e, "apiErrorSave"));
  });
  list?.addEventListener("change", onTodoListChange);

  drawerBody?.addEventListener("change", (event) => {
    const tgt = event.target;
    if (!(tgt instanceof HTMLInputElement)) return;
    if (tgt.classList.contains("drawer-cal-color-input")) {
      const slot = tgt.getAttribute("data-cal-slot");
      if (!slot) return;
      persistActivePresetSlot(slot, tgt.value);
      applyCalendarCustomColors();
      syncCalStyleDrawerUi();
      renderCalendar();
      return;
    }
    if (tgt.name === "cal-preset") {
      setActiveCalPresetIndex(Number(tgt.value));
      applyCalendarCustomColors();
      syncCalStyleDrawerUi();
      renderCalendar();
      return;
    }
    if (tgt.name === "app-language") {
      applyLanguage(tgt.value);
      setDrawerOpen(false);
      return;
    }
    if (tgt.name === "app-theme") {
      setTheme(tgt.value);
      setDrawerOpen(false);
    }
  });

  stackOpenBtn?.addEventListener("click", () => openStackDialog());
  stackDialogClose?.addEventListener("click", () => closeStackDialog());
  stackDialog?.addEventListener("click", (e) => {
    if (e.target === stackDialog) closeStackDialog();
  });

  headerDateBtn?.addEventListener("click", () => {
    if (currentView === "calendar") {
      setView("todo");
      return;
    }
    openCalendarAroundSelection().catch((e) => showApiFailure(e, "apiErrorLoad"));
  });

  calendarPrev?.addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    refreshMonthSummary()
      .then(() => renderCalendar())
      .catch((e) => console.error(e));
  });
  calendarNext?.addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    refreshMonthSummary()
      .then(() => renderCalendar())
      .catch((e) => console.error(e));
  });

  calendarGrid?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest(".calendar-day-btn");
    const dateKey = btn?.getAttribute("data-date");
    if (!dateKey) return;
    selectedDateKey = dateKey;
    calendarCursor = startOfMonth(dateKeyToDate(selectedDateKey));
    setView("todo");
    loadTodosForSelectedDate()
      .then(() => refreshMonthSummary())
      .then(() => renderCalendar())
      .catch((e) => showApiFailure(e, "apiErrorLoad"));
  });

  menuToggle?.addEventListener("click", () => setDrawerOpen(!drawerOpen));
  drawerClose?.addEventListener("click", () => setDrawerOpen(false));
  drawerBackdrop?.addEventListener("click", () => setDrawerOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (stackDialog instanceof HTMLDialogElement && stackDialog.open) {
      closeStackDialog();
      event.preventDefault();
      return;
    }
    if (!drawerOpen) return;
    event.preventDefault();
    setDrawerOpen(false);
  });

  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  const savedLang = localStorage.getItem(LANG_KEY) || "ko";

  setTheme(savedTheme);
  setView("todo");
  applyLanguage(savedLang);

  updateFilterButtons();
  updateHeaderDateText();

  try {
    await loadTodosForSelectedDate();
    await refreshMonthSummary();
    renderCalendar();
  } catch {
    /* loadTodosForSelectedDate 가 이미 알림 처리 */
  }
});
