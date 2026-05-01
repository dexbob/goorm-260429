export const state = {
  habits: [],
  records: []
};

export const uiState = {
  selectedHabit: null,
  modalOpen: false
};

export function setState(next) {
  state.habits = Array.isArray(next.habits) ? next.habits : [];
  state.records = Array.isArray(next.records) ? next.records : [];
}
