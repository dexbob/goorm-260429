function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createHabit({ name, targetCount, color, icon }) {
  return {
    id: makeId(),
    name: String(name).trim(),
    targetCount: Number(targetCount),
    color: String(color || "#22c55e"),
    icon: String(icon || "✅"),
    createdAt: Date.now()
  };
}
