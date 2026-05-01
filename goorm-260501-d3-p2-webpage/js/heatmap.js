export function getIntensity(count, target) {
  const safeTarget = Math.max(1, Number(target) || 1);
  const ratio = count / safeTarget;

  if (ratio === 0) return 0;
  if (ratio < 0.5) return 1;
  if (ratio < 1) return 2;
  return 3;
}

export function toHeatmapCells(entries, targetCount) {
  return entries.map((entry) => ({
    ...entry,
    intensity: getIntensity(entry.count, targetCount)
  }));
}
