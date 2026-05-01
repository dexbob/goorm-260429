const STORAGE_KEY = "habit-maker-v1";

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { habits: [], records: [] };
    const parsed = JSON.parse(raw);
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch (_error) {
    return { habits: [], records: [] };
  }
}

export function saveData(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
