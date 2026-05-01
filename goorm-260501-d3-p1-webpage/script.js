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

async function resolveApiBaseFromHubMap() {
  if (API_BASE) return;
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
      "LocalStorage — 테마·언어만 저장",
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
      "LocalStorage — theme and language only",
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
      "LocalStorage — テーマと言語のみ",
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
      "LocalStorage — 仅保存主题与语言",
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
  try {
    const y = calendarCursor.getFullYear();
    const mo = calendarCursor.getMonth() + 1;
    const data = await fetchJson(`${API_BASE}/api/stats/month?year=${y}&month=${mo}`);
    monthSummary = data?.counts || {};
  } catch (e) {
    monthSummary = {};
    console.error(e);
  }
}

async function loadTodosForSelectedDate() {
  try {
    const data = await fetchJson(`${API_BASE}/api/todos?date=${encodeURIComponent(selectedDateKey)}`);
    todos = Array.isArray(data?.todos) ? data.todos : [];
    renderTodos();
    updateHeaderDateText();
  } catch (e) {
    todos = [];
    renderTodos();
    showApiFailure(e, "apiErrorLoad");
  }
}

async function addTodoRemote(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return;
  await fetchJson(`${API_BASE}/api/todos`, {
    method: "POST",
    body: JSON.stringify({ text: trimmed, taskDate: selectedDateKey }),
  });
}

async function deleteTodoRemote(id) {
  await fetchJson(`${API_BASE}/api/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function toggleTodoRemote(id) {
  const todo = todos.find((x) => x.id === id);
  if (!todo) return;
  await fetchJson(`${API_BASE}/api/todos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ completed: !todo.completed }),
  });
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
      if (stats.done === stats.total) btn.classList.add("is-all-done");
      const statsWrap = document.createElement("span");
      statsWrap.className = "calendar-day-stats";

      const line1 = document.createElement("span");
      line1.className = "calendar-stat-line";
      line1.textContent = `${t("countTodoLabel")} ${stats.total}`;

      const line2 = document.createElement("span");
      line2.className = "calendar-stat-line";
      line2.textContent = `${t("countDoneLabel")} ${stats.done}`;

      statsWrap.appendChild(line1);
      statsWrap.appendChild(line2);
      btn.appendChild(statsWrap);
    }

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
}

function setTheme(theme) {
  const html = document.documentElement;
  const normalized = theme === "dark" ? "dark" : "light";
  html.setAttribute("data-theme", normalized);
  localStorage.setItem(THEME_KEY, normalized);
  syncThemeRadios();
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
  document.getElementById("drawer-title").textContent = t("drawerTitle");
  document.getElementById("calendar-heading").textContent = t("calendarTitle");
  document.getElementById("header-date-btn")?.setAttribute("aria-label", t("headerDateAriaOpenCal"));

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
