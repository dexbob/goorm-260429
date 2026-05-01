export function getProgress(count, targetCount) {
  const safeTarget = Math.max(1, Number(targetCount) || 1);
  return count / safeTarget;
}

export function isCompleted(count, targetCount) {
  return getProgress(count, targetCount) >= 1;
}

export function getProgressLabel(count, targetCount) {
  return isCompleted(count, targetCount)
    ? `${count} / ${targetCount} 완료 ✅`
    : `${count} / ${targetCount} 진행 중`;
}
