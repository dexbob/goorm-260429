function todayKey() {
  return formatDateKeyLocal(new Date());
}

function formatDateKeyLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function incrementHabit(records, habitId, targetCount) {
  const safeTarget = Math.max(1, Number(targetCount) || 1);
  const today = todayKey();
  const found = records.find((record) => record.habitId === habitId && record.date === today);
  if (found) {
    if (found.count < safeTarget) {
      found.count += 1;
    }
    return found;
  }

  const created = {
    habitId,
    date: today,
    count: 1
  };
  records.push(created);
  return created;
}

export function getRecord(records, habitId, date = todayKey()) {
  return records.find((record) => record.habitId === habitId && record.date === date) || null;
}

export function setHabitCount(records, habitId, count) {
  const safeCount = Math.max(0, Number(count) || 0);
  const today = todayKey();
  const found = records.find((record) => record.habitId === habitId && record.date === today);
  if (found) {
    found.count = safeCount;
    return found;
  }

  const created = { habitId, date: today, count: safeCount };
  records.push(created);
  return created;
}

export function getRecentRecords(records, habitId, days = 90) {
  const out = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDateKeyLocal(d);
    const record = records.find((r) => r.habitId === habitId && r.date === key);
    out.push({
      date: key,
      count: record ? record.count : 0
    });
  }

  return out;
}
