import { getRecord } from "./record.js";

const habitList = document.querySelector("#habit-list");
const cardTemplate = document.querySelector("#habit-card-template");
const WEEKDAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];
const EMPTY_CELL_COLOR = "#1f2937";
const selectedYearByHabit = new Map();

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatDateKeyLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toRowFromWeekday(date) {
  return date.getDay();
}

function startOfWeekSunday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeekSaturday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d;
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map((v) => `${v}${v}`).join("") : cleaned;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(baseHex, targetHex, weight) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex({
    r: base.r + (target.r - base.r) * w,
    g: base.g + (target.g - base.g) * w,
    b: base.b + (target.b - base.b) * w
  });
}

function getYearRange(habit, records) {
  const currentYear = new Date().getFullYear();
  const years = records.map((r) => parseDateKey(r.date).getFullYear());
  const createdYear = new Date(habit.createdAt).getFullYear();
  const minYear = Math.min(createdYear, ...(years.length ? years : [currentYear]));
  const maxYear = Math.max(currentYear, ...(years.length ? years : [currentYear]));
  return { minYear, maxYear };
}

function getYearOptions(habit, records) {
  const { minYear, maxYear } = getYearRange(habit, records);
  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    return [new Date().getFullYear()];
  }
  const options = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    options.push(year);
  }
  return options.length ? options : [new Date().getFullYear()];
}

function getCellColor(count, targetCount, habitColor) {
  if (count <= 0) return EMPTY_CELL_COLOR;
  const ratio = Math.min(1, count / Math.max(1, targetCount));
  const weight = 0.2 + ratio * 0.8;
  return mixHex(EMPTY_CELL_COLOR, habitColor, weight);
}

function buildGithubHeatmap(habit, records, year) {
  const targetCount = Math.max(1, Number(habit.targetCount) || 1);
  const byDate = new Map(records.map((record) => [record.date, record.count]));
  const rangeStart = new Date(year, 0, 1);
  const rangeEnd = new Date(year, 11, 31);
  const gridStart = startOfWeekSunday(rangeStart);
  const gridEnd = endOfWeekSaturday(rangeEnd);

  const totalDays = Math.floor((gridEnd - gridStart) / 86400000) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  const cells = [];
  for (let i = 0; i < totalDays; i += 1) {
    const cursor = new Date(gridStart);
    cursor.setDate(gridStart.getDate() + i);
    const key = formatDateKeyLocal(cursor);
    const inRange = cursor >= rangeStart && cursor <= rangeEnd;
    const count = inRange ? byDate.get(key) || 0 : 0;
    cells.push({
      date: key,
      count,
      color: getCellColor(count, targetCount, habit.color),
      inRange
    });
  }

  const dayCells = cells
    .map(
      (cell) =>
        `<span class="heat-cell${cell.inRange ? "" : " heat-out"}" style="background:${cell.color}" title="${cell.date}: ${cell.count}"></span>`
    )
    .join("");

  const monthLabels = [];
  for (let month = 0; month < 12; month += 1) {
    const firstOfMonth = new Date(year, month, 1);
    const weekIndex = Math.floor((startOfWeekSunday(firstOfMonth) - gridStart) / (86400000 * 7));
    monthLabels.push(`<span class="gh-month" style="grid-column:${weekIndex + 1}">${month + 1}월</span>`);
  }

  const legend = [0, 0.33, 0.66, 1]
    .map((step) => `<span class="heat-cell" style="background:${step === 0 ? EMPTY_CELL_COLOR : getCellColor(step * targetCount, targetCount, habit.color)}"></span>`)
    .join("");

  return `
    <div class="gh-heatmap">
      <div class="gh-months" style="--weeks:${totalWeeks}">${monthLabels.join("")}</div>
      <div class="gh-body">
        <div class="gh-weekdays">
          ${WEEKDAY_NAMES_KO.map((name) => `<span>${name}</span>`).join("")}
        </div>
        <div class="gh-grid" style="--weeks:${totalWeeks}">
          ${dayCells}
        </div>
      </div>
      <div class="gh-legend">
        <span>적음</span>
        ${legend}
        <span>많음</span>
      </div>
    </div>
  `;
}

export function setHabitYearSelection(habitId, year) {
  const parsed = Number(year);
  if (!Number.isFinite(parsed)) return;
  selectedYearByHabit.set(habitId, parsed);
}

export function shiftHabitYearSelection(habitId, offset, state) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;
  const records = state.records.filter((record) => record.habitId === habitId);
  const options = getYearOptions(habit, records);
  const current = selectedYearByHabit.get(habitId) ?? options[options.length - 1];
  const idx = options.indexOf(current);
  const nextIdx = Math.max(0, Math.min(options.length - 1, (idx === -1 ? options.length - 1 : idx) + offset));
  selectedYearByHabit.set(habitId, options[nextIdx]);
}

export function renderHabits(state) {
  if (!habitList || !cardTemplate) return;

  if (!state.habits.length) {
    habitList.innerHTML = `<p class="empty">아직 습관이 없습니다. 첫 습관을 추가해보세요.</p>`;
    return;
  }

  habitList.innerHTML = "";

  state.habits.forEach((habit) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".habit-card");
    const nameEl = fragment.querySelector("[data-name]");
    const incrementBtn = fragment.querySelector("[data-increment]");
    const removeTrigger = fragment.querySelector("[data-remove-trigger]");
    const iconEl = fragment.querySelector("[data-icon]");
    const yearPrevBtn = fragment.querySelector("[data-year-prev]");
    const yearNextBtn = fragment.querySelector("[data-year-next]");
    const yearLabel = fragment.querySelector("[data-year-label]");
    const heatmapEl = fragment.querySelector("[data-heatmap]");
    const waterFill = fragment.querySelector("[data-water]");
    const waterLabel = fragment.querySelector("[data-water-label]");
    const batteryEl = fragment.querySelector("[data-battery]");

    const todayRecord = getRecord(state.records, habit.id);
    const todayCount = todayRecord ? todayRecord.count : 0;

    nameEl.textContent = habit.name;
    iconEl.textContent = habit.icon || "✅";
    incrementBtn.dataset.habitId = habit.id;
    removeTrigger.dataset.habitId = habit.id;
    removeTrigger.style.backgroundColor = habit.color;
    const ratio = Math.min(1, todayCount / Math.max(1, Number(habit.targetCount) || 1));
    if (waterFill) {
      waterFill.style.width = `${ratio * 100}%`;
      waterFill.style.backgroundColor = habit.color;
    }
    if (waterLabel) {
      waterLabel.textContent = `${todayCount}/${habit.targetCount}`;
    }
    if (batteryEl) {
      batteryEl.classList.toggle("charging", ratio > 0 && ratio < 1);
      batteryEl.classList.toggle("full", ratio >= 1);
    }

    const records = state.records.filter((record) => record.habitId === habit.id);
    const yearOptions = getYearOptions(habit, records);
    const selectedYear = selectedYearByHabit.get(habit.id) ?? yearOptions[yearOptions.length - 1];
    const finalYear = yearOptions.includes(selectedYear) ? selectedYear : yearOptions[yearOptions.length - 1];
    selectedYearByHabit.set(habit.id, finalYear);
    const currentIdx = yearOptions.indexOf(finalYear);
    if (yearPrevBtn) {
      yearPrevBtn.dataset.habitId = habit.id;
      yearPrevBtn.disabled = currentIdx <= 0;
    }
    if (yearNextBtn) {
      yearNextBtn.dataset.habitId = habit.id;
      yearNextBtn.disabled = currentIdx >= yearOptions.length - 1;
    }
    if (yearLabel) {
      yearLabel.textContent = `${finalYear}년`;
    }
    heatmapEl.innerHTML = buildGithubHeatmap(habit, records, finalYear);

    card.style.borderLeft = `6px solid ${habit.color}`;
    habitList.append(card);
  });
}
