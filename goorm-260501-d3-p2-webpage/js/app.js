import { state, setState } from "./state.js";
import { loadData, saveData } from "./storage.js";
import { createHabit } from "./habit.js";
import { getRecord, incrementHabit, setHabitCount } from "./record.js";
import { renderHabits, shiftHabitYearSelection } from "./ui.js";

const form = document.querySelector("#habit-form");
const habitList = document.querySelector("#habit-list");
const nameInput = document.querySelector("#habit-name");
const targetInput = document.querySelector("#habit-target");
const targetDisplay = document.querySelector("#target-display");
const colorInput = document.querySelector("#habit-color");
const colorTrigger = document.querySelector("#color-trigger");
const addHabitBtn = document.querySelector("#add-habit-btn");
const iconInput = document.querySelector("#habit-icon");
const iconTrigger = document.querySelector("#icon-trigger");
const iconPreview = document.querySelector("#icon-preview");
const iconPopover = document.querySelector("#icon-popover");
const confirmModal = document.querySelector("#confirm-modal");
const confirmMessage = document.querySelector("#confirm-message");
const confirmOk = document.querySelector("#confirm-ok");
const confirmCancel = document.querySelector("#confirm-cancel");

function getContrastTextColor(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#f9fafb";
}

function applySelectedColor(color) {
  const textColor = getContrastTextColor(color);
  if (colorTrigger instanceof HTMLButtonElement) {
    colorTrigger.style.backgroundColor = color;
    colorTrigger.style.color = textColor;
  }
  if (iconTrigger instanceof HTMLButtonElement) {
    iconTrigger.style.backgroundColor = color;
    iconTrigger.style.color = textColor;
  }
  if (addHabitBtn instanceof HTMLButtonElement) {
    addHabitBtn.style.backgroundColor = color;
    addHabitBtn.style.color = textColor;
  }
  if (targetInput instanceof HTMLInputElement) {
    targetInput.style.accentColor = color;
  }
}

function persistAndRender() {
  saveData(state);
  renderHabits(state);
}

function updateTargetDisplay() {
  if (!(targetInput instanceof HTMLInputElement) || targetInput.type !== "range" || !targetDisplay) return;
  const value = Math.max(1, Math.min(10, Number(targetInput.value) || 5));
  targetInput.value = String(value);
  targetDisplay.textContent = `${value}회`;
}

function askConfirm(message) {
  return new Promise((resolve) => {
    if (
      !(confirmModal instanceof HTMLElement) ||
      !(confirmMessage instanceof HTMLElement) ||
      !(confirmOk instanceof HTMLButtonElement) ||
      !(confirmCancel instanceof HTMLButtonElement)
    ) {
      resolve(window.confirm(message));
      return;
    }

    confirmMessage.textContent = message;
    confirmModal.classList.remove("hidden");

    const cleanup = () => {
      confirmModal.classList.add("hidden");
      confirmOk.removeEventListener("click", onOk);
      confirmCancel.removeEventListener("click", onCancel);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    confirmOk.addEventListener("click", onOk);
    confirmCancel.addEventListener("click", onCancel);
  });
}

function handleAddHabit(event) {
  event.preventDefault();
  if (!form) return;

  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const targetCount = Number(formData.get("targetCount"));
  const color = String(formData.get("color") || "#22c55e");
  const icon = String(formData.get("icon") || "✅");

  if (!name) {
    nameInput?.focus();
    return;
  }

  if (!Number.isFinite(targetCount) || targetCount < 1) {
    targetInput?.focus();
    return;
  }

  state.habits.unshift(createHabit({ name, targetCount, color, icon }));
  form.reset();
  if (iconInput instanceof HTMLInputElement) {
    iconInput.value = "✅";
  }
  if (iconPreview) {
    iconPreview.textContent = "✅";
  }
  if (colorInput instanceof HTMLInputElement) {
    colorInput.value = "#22c55e";
    applySelectedColor(colorInput.value);
  }
  if (targetInput instanceof HTMLInputElement) {
    targetInput.value = "5";
    updateTargetDisplay();
  }
  persistAndRender();
}

async function handleHabitAction(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const incrementBtn = target.closest("[data-increment]");
  if (incrementBtn) {
    const habitId = incrementBtn.dataset.habitId;
    if (!habitId) return;
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) return;

    const todayRecord = getRecord(state.records, habitId);
    const currentCount = todayRecord ? todayRecord.count : 0;
    if (currentCount >= habit.targetCount) {
      const shouldReset = await askConfirm("오늘 진행도를 초기화할까요?");
      if (!shouldReset) return;
      setHabitCount(state.records, habitId, 0);
      persistAndRender();
      return;
    }

    incrementHabit(state.records, habitId, habit.targetCount);
    persistAndRender();
    return;
  }

  const removeTrigger = target.closest("[data-remove-trigger]");
  if (removeTrigger) {
    const habitId = removeTrigger.dataset.habitId;
    if (!habitId) return;
    const habit = state.habits.find((item) => item.id === habitId);
    const ok = await askConfirm(`"${habit?.name || "이 습관"}"을(를) 삭제할까요?`);
    if (!ok) return;
    state.habits = state.habits.filter((habit) => habit.id !== habitId);
    state.records = state.records.filter((record) => record.habitId !== habitId);
    persistAndRender();
  }
}

function handleHabitListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const prevBtn = target.closest("[data-year-prev]");
  if (prevBtn) {
    const habitId = prevBtn.dataset.habitId;
    if (!habitId) return;
    shiftHabitYearSelection(habitId, -1, state);
    renderHabits(state);
    return;
  }

  const nextBtn = target.closest("[data-year-next]");
  if (!nextBtn) return;
  const habitId = nextBtn.dataset.habitId;
  if (!habitId) return;
  shiftHabitYearSelection(habitId, 1, state);
  renderHabits(state);
}

function bindEvents() {
  if (!form || !habitList) return;
  form.addEventListener("submit", handleAddHabit);
  habitList.addEventListener("click", handleHabitAction);
  habitList.addEventListener("click", handleHabitListChange);
  if (iconTrigger instanceof HTMLButtonElement && iconPopover) {
    iconTrigger.addEventListener("click", () => {
      iconPopover.classList.toggle("hidden");
    });

    iconPopover.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const choice = target.closest(".icon-choice");
      if (!choice) return;
      const selected = choice.dataset.icon || "✅";
      if (iconInput instanceof HTMLInputElement) {
        iconInput.value = selected;
      }
      if (iconPreview) {
        iconPreview.textContent = selected;
      }
      iconPopover.classList.add("hidden");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!iconPopover.contains(target) && !iconTrigger.contains(target)) {
        iconPopover.classList.add("hidden");
      }
    });
  }

  if (colorTrigger instanceof HTMLButtonElement && colorInput instanceof HTMLInputElement) {
    colorTrigger.addEventListener("click", () => colorInput.click());
    colorInput.addEventListener("input", () => applySelectedColor(colorInput.value));
  }

  if (targetInput instanceof HTMLInputElement) {
    targetInput.addEventListener("input", updateTargetDisplay);
    targetInput.addEventListener("change", updateTargetDisplay);
  }
}

function init() {
  if (!form || !habitList) {
    console.error("필수 DOM 요소를 찾을 수 없습니다.");
    return;
  }
  const loaded = loadData();
  setState(loaded);
  if (colorInput instanceof HTMLInputElement) {
    applySelectedColor(colorInput.value);
  }
  updateTargetDisplay();
  if (addHabitBtn instanceof HTMLButtonElement) {
    addHabitBtn.style.backgroundColor = "#22c55e";
  }
  renderHabits(state);
  bindEvents();
}

init();
