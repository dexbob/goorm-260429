#!/usr/bin/env bash
# start-servers.sh 가 기록한 PID 목록을 읽어 전체 서버를 한 번에 종료합니다.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="${ROOT_DIR}/.start-servers.pids"
HUB_DEV_PORTS_FILE="${ROOT_DIR}/hub-dev-ports.json"
START_SCRIPT_PATH="${ROOT_DIR}/start-servers.sh"

declare -a ALL_PIDS=()

signal_pid_or_group() {
  local sig="$1"
  local pid="$2"
  [[ -n "${pid}" ]] || return 0
  [[ "${pid}" =~ ^[0-9]+$ ]] || return 0
  kill "-${sig}" "--" "-${pid}" >/dev/null 2>&1 || kill "-${sig}" "${pid}" >/dev/null 2>&1 || true
}

collect_descendants() {
  local parent="$1"
  local line pid ppid
  while IFS= read -r line; do
    pid="${line%% *}"
    ppid="${line##* }"
    if [[ "${ppid}" == "${parent}" ]]; then
      printf '%s\n' "${pid}"
      collect_descendants "${pid}"
    fi
  done < <(ps -e -o pid= -o ppid=)
}

collect_pids_from_runtime_file() {
  [[ -f "${PID_FILE}" ]] || return 1
  mapfile -t ALL_PIDS <"${PID_FILE}"
  (( ${#ALL_PIDS[@]} > 0 )) || return 1
  return 0
}

collect_pids_from_start_script_tree() {
  local root_pid child
  while IFS= read -r root_pid; do
    [[ -n "${root_pid}" ]] || continue
    [[ "${root_pid}" =~ ^[0-9]+$ ]] || continue
    [[ "${root_pid}" == "$$" || "${root_pid}" == "${PPID:-}" ]] && continue
    ALL_PIDS+=("${root_pid}")
    while IFS= read -r child; do
      [[ -n "${child}" ]] && ALL_PIDS+=("${child}")
    done < <(collect_descendants "${root_pid}")
  done < <(pgrep -f "start-servers.sh" || true)
}

dedupe_numeric_pids() {
  local pid
  declare -A seen=()
  local -a deduped=()
  for pid in "${ALL_PIDS[@]:-}"; do
    [[ "${pid}" =~ ^[0-9]+$ ]] || continue
    [[ -n "${seen[${pid}]:-}" ]] && continue
    seen["${pid}"]=1
    deduped+=("${pid}")
  done
  ALL_PIDS=("${deduped[@]}")
}

if ! collect_pids_from_runtime_file; then
  echo "[stop-servers] PID 파일이 없거나 비어 있어 start-servers 프로세스 트리 탐색으로 대체합니다."
  collect_pids_from_start_script_tree
fi

dedupe_numeric_pids

if (( ${#ALL_PIDS[@]} == 0 )); then
  echo "[stop-servers] 종료할 서버 프로세스를 찾지 못했습니다."
  rm -f "${PID_FILE}" "${PID_FILE}.tmp" "${HUB_DEV_PORTS_FILE}" "${HUB_DEV_PORTS_FILE}.tmp" 2>/dev/null || true
  exit 0
fi

echo "[stop-servers] 서버 종료를 시작합니다…"

for pid in "${ALL_PIDS[@]}"; do
  signal_pid_or_group "TERM" "${pid}"
done

sleep 0.8

for pid in "${ALL_PIDS[@]}"; do
  signal_pid_or_group "KILL" "${pid}"
done

sleep 0.2
REMAINING="$(pgrep -af "start-servers.sh|python3 -m http.server|uvicorn api.index:app|npm start|node server\\.js|node server\\.mjs" || true)"
if [[ -n "${REMAINING}" ]]; then
  echo "[stop-servers] 일부 프로세스가 남아 있습니다:"
  printf '%s\n' "${REMAINING}"
  exit 1
fi

rm -f "${PID_FILE}" "${PID_FILE}.tmp" "${HUB_DEV_PORTS_FILE}" "${HUB_DEV_PORTS_FILE}.tmp" 2>/dev/null || true

echo "[stop-servers] 종료 완료."
