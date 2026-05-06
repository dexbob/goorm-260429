#!/usr/bin/env bash
# 루트 정적 허브 + "server.js 또는 server.mjs + npm start 가 있는" 하위 프로젝트를 자동 기동합니다.
# 새 Node 서버 프로젝트를 추가하면 이 파일을 수정할 필요 없이, 아래 디스커버리 규칙에 맞으면 함께 뜹니다.
# 종료: 이 터미널에서 Ctrl+C (정적 서버 및 기동한 npm 프로세스 정리).

set -euo pipefail

echo "[start-servers] 서버를 시작합니다…" >&2

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATIC_PORT_START="${STATIC_PORT:-5000}"
# 각 Node 앱 포트 후보 시작값 (비어 있는 포트를 순서대로 찾음)
NODE_PORT_SCAN_START="${NODE_PORT_SCAN_START:-3020}"

# 탐색에서 제외 (generate-root-index.js 와 비슷한 기준)
IGNORE_DIR_NAMES=(
  ".git"
  ".cursor"
  "node_modules"
  "scripts"
)

# 자동 탐색과 별개로 항상 정적 프로젝트 목록에 넣고 싶은 경로(루트 기준 상대경로)
PINNED_STATIC_DIRS=(
  "goorm-260501-d3-p2-webpage/streaky"
)

# 서버 시작 시 무조건 `npm run build` 를 돌려 .build 에 최신 프론트를 반영하는 Vite 프로젝트(루트 기준 상대경로).
# (기본 규칙은 .build/index.html 이 있으면 빌드를 생략하므로, 수정 사항이 npm start(Node) 에 안 붙을 수 있음.)
PINNED_VITE_ALWAYS_BUILD=(
  "goorm-260504-d4-p2-webpage"
  "goorm-260506-d5-p1-webpage"
)

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 명령을 찾을 수 없습니다."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm 명령을 찾을 수 없습니다."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node 명령을 찾을 수 없습니다."
  exit 1
fi

# goorm-260506-d5-p1-webpage: npm install, Python venv + requirements, .env 를 한 번에 맞춤 (OpenRouter 등)
prepare_goorm_260506_d5_p1() {
  local d="${ROOT_DIR}/goorm-260506-d5-p1-webpage"
  [[ -d "${d}" ]] || return 0

  if [[ ! -f "${d}/.env" ]] && [[ -f "${d}/.env.example" ]]; then
    cp "${d}/.env.example" "${d}/.env"
  fi

  local d4="${ROOT_DIR}/goorm-260504-d4-p2-webpage/.env"
  if [[ -f "${d}/.env" ]] && [[ -f "${d4}" ]]; then
    if ! grep -qE '^OPENROUTER_API_KEY=.{3,}' "${d}/.env" 2>/dev/null; then
      local kr
      kr="$(grep -E '^OPENROUTER_API_KEY=.' "${d4}" 2>/dev/null | head -n1 || true)"
      if [[ -n "${kr}" ]]; then
        grep -vE '^[[:space:]]*OPENROUTER_API_KEY=' "${d}/.env" >"${d}/.env.tmp.$$" 2>/dev/null || true
        [[ -f "${d}/.env.tmp.$$" ]] && mv -f "${d}/.env.tmp.$$" "${d}/.env"
        printf '%s\n' "${kr}" >>"${d}/.env"
      fi
    fi
  fi

  if (cd "${d}" && npm install >/dev/null 2>&1); then
    :
  else
    echo "    [경고] npm install 실패 — 해당 프로젝트 수동 확인" >&2
  fi

  if [[ -x "${d}/.venv/bin/pip" ]]; then
    if "${d}/.venv/bin/pip" install -q -r "${d}/requirements.txt"; then
      :
    else
      echo "    [경고] .venv pip install 실패" >&2
    fi
  elif python3 -m venv "${d}/.venv" 2>/dev/null && [[ -x "${d}/.venv/bin/pip" ]]; then
    "${d}/.venv/bin/pip" install -q -U pip >/dev/null 2>&1 || true
    if "${d}/.venv/bin/pip" install -q -r "${d}/requirements.txt"; then
      :
    fi
  else
    echo "    [안내] python3 -m venv 불가 시: apt install python3-venv 후 재시도 또는 pip --user" >&2
    python3 -m pip install -q --user -r "${d}/requirements.txt" 2>/dev/null || \
      python3 -m pip install -q --break-system-packages -r "${d}/requirements.txt" 2>/dev/null || \
      echo "    [경고] 시스템 pip 로 requirements 설치 실패 — python3-venv 권장" >&2
  fi
}

prepare_goorm_260506_d5_p1

GENERATE_ROOT_INDEX_SCRIPT="${ROOT_DIR}/scripts/generate-root-index.js"

if [[ -f "${GENERATE_ROOT_INDEX_SCRIPT}" ]]; then
  if ! node "${GENERATE_ROOT_INDEX_SCRIPT}" >/dev/null 2>&1; then
    echo "[start-servers] 경고: index.html 자동 생성에 실패했습니다. 기존 파일로 계속 진행합니다." >&2
  fi
else
  echo "[start-servers] 안내: ${GENERATE_ROOT_INDEX_SCRIPT} 파일이 없어 index.html 자동 생성을 건너뜁니다." >&2
fi

# 127.0.0.1:port 에 연결되면 누군가 LISTEN 중으로 간주
port_is_listening() {
  local port="$1"
  if command -v timeout >/dev/null 2>&1; then
    timeout 0.5 bash -c "{ echo >/dev/tcp/127.0.0.1/${port}; }" 2>/dev/null
  else
    { echo >/dev/tcp/127.0.0.1/"${port}"; } 2>/dev/null
  fi
}

pick_free_static_port() {
  local p="${STATIC_PORT_START}"
  local max=$((STATIC_PORT_START + 40))
  while (( p <= max )); do
    if ! port_is_listening "${p}"; then
      echo "${p}"
      return 0
    fi
    p=$((p + 1))
  done
  echo ""
  return 1
}

is_ignored_dirname() {
  local name="$1"
  [[ "$name" == .* ]] && return 0
  local ign
  for ign in "${IGNORE_DIR_NAMES[@]}"; do
    [[ "$name" == "$ign" ]] && return 0
  done
  return 1
}

# package.json 에 scripts.start (문자열) 있는지 확인
project_has_start_script() {
  local dir="$1"
  node "${ROOT_DIR}/scripts/check-package-start.cjs" "$dir"
}

preferred_port_from_env() {
  local dir="$1"
  local envf="${dir}/.env"
  [[ -f "$envf" ]] || return 1
  local _line _val
  _line="$(grep -E '^[[:space:]]*PORT=' "${envf}" 2>/dev/null | tail -n1 || true)"
  [[ -z "${_line}" ]] && return 1
  _val="${_line#*=}"
  _val="${_val//$'\r'/}"
  _val="${_val//\"/}"
  _val="${_val//\'/}"
  [[ "${_val}" =~ ^[0-9]+$ ]] || return 1
  echo "${_val}"
}

# 출력: 줄 단위 디렉터리 절대경로 (server.js|server.mjs · package.json · start 스크립트 존재)
discover_node_server_projects() {
  local sorted=()
  while IFS= read -r -d '' item; do
    sorted+=("${item%/}")
  done < <(
    find "${ROOT_DIR}" -maxdepth 1 -mindepth 1 -type d -print0 2>/dev/null | LC_ALL=C sort -z
  )
  local d name
  for d in "${sorted[@]}"; do
    name="${d##*/}"
    if is_ignored_dirname "${name}"; then
      continue
    fi
    if [[ ! -f "${d}/package.json" ]]; then
      continue
    fi
    if [[ ! -f "${d}/server.js" ]] && [[ ! -f "${d}/server.mjs" ]]; then
      continue
    fi
    if project_has_start_script "${d}"; then
      printf '%s\n' "${d}"
    fi
  done
}

discover_static_web_projects() {
  local sorted=()
  while IFS= read -r -d '' item; do
    sorted+=("${item%/}")
  done < <(
    find "${ROOT_DIR}" -maxdepth 2 -mindepth 1 -type d -print0 2>/dev/null | LC_ALL=C sort -z
  )

  local d rel name leaf
  for d in "${sorted[@]}"; do
    rel="${d#${ROOT_DIR}/}"
    name="${rel%%/*}"
    leaf="${d##*/}"

    if is_ignored_dirname "${name}" || is_ignored_dirname "${leaf}"; then
      continue
    fi

    if [[ -f "${d}/index.html" || -f "${d}/index.vite.html" ]]; then
      printf '%s\n' "${d}"
    fi
  done
}

append_pinned_static_projects() {
  local rel abs existing
  for rel in "${PINNED_STATIC_DIRS[@]}"; do
    abs="${ROOT_DIR}/${rel}"
    [[ -f "${abs}/index.html" ]] || continue

    existing=0
    for dir in "${STATIC_WEB_DIRS[@]:-}"; do
      if [[ "${dir}" == "${abs}" ]]; then
        existing=1
        break
      fi
    done

    if (( existing == 0 )); then
      STATIC_WEB_DIRS+=("${abs}")
    fi
  done
}

# 정적 허브가 프로젝트 디렉터리의 index.html 을 그대로 내리므로,
# 루트 index 가 Vite 개발 템플릿(main.tsx)이거나 .build 가 없으면 npm run build 가 필요하다.
has_vite_config() {
  local dir="$1"
  [[ -f "${dir}/vite.config.ts" ]] || [[ -f "${dir}/vite.config.js" ]] || [[ -f "${dir}/vite.config.mjs" ]]
}

vite_static_hub_needs_build() {
  local dir="$1"
  has_vite_config "${dir}" || return 1
  [[ -f "${dir}/package.json" ]] || return 1

  local abs="${dir%/}"
  local rel="${abs#"${ROOT_DIR}"/}"

  local pinned
  for pinned in "${PINNED_VITE_ALWAYS_BUILD[@]}"; do
    if [[ "${rel}" == "${pinned}" ]]; then
      return 0
    fi
  done

  if [[ ! -f "${dir}/.build/index.html" ]]; then
    return 0
  fi
  if [[ -f "${dir}/index.html" ]] && grep -qF "main.tsx" "${dir}/index.html"; then
    return 0
  fi
  return 1
}

# Node 앱 목록 + 정적 웹 목록을 합쳐 한 번씩만 검사(npm install 직후 루트 index 가 dev 로 덮인 경우 포함).
ensure_vite_projects_for_static_hub() {
  declare -A vite_build_seen=()
  local dir label
  for dir in "${APP_DIRS[@]:-}" "${STATIC_WEB_DIRS[@]:-}"; do
    [[ -z "${dir}" ]] && continue
    [[ -n "${vite_build_seen[$dir]:-}" ]] && continue
    vite_build_seen["$dir"]=1
    if ! vite_static_hub_needs_build "${dir}"; then
      continue
    fi
    label="${dir##*/}"
    local rel="${dir%/}"
    rel="${rel#"${ROOT_DIR}"/}"
    if ! (cd "${dir}" && npm run build >/dev/null 2>&1); then
      echo "    [경고] ${label}: npm run build 실패 — 정적 허브 링크는 동작하지 않을 수 있습니다." >&2
    fi
  done
}

NEXT_APP_PORT="${NODE_PORT_SCAN_START}"

declare -A PORT_RESERVED_IN_THIS_RUN=()

reserve_app_port_runtime() {

  PORT_RESERVED_IN_THIS_RUN["$1"]=1

}

port_blocked_for_hub() {

  local p="$1"

  port_is_listening "${p}" && return 0

  [[ -n "${PORT_RESERVED_IN_THIS_RUN[$p]:-}" ]] && return 0

  return 1

}

# 비어 있는 tcp 포트 하나 (순차 스캔). 다른 앱 기동 중 listen 전이어도 이번 실행에서 예약된 포트는 건너뜀.
allocate_free_app_port_scan() {

  local max=$((NEXT_APP_PORT + 400))

  while (( NEXT_APP_PORT <= max )); do

    local try="${NEXT_APP_PORT}"

    NEXT_APP_PORT=$((NEXT_APP_PORT + 1))

    if ! port_blocked_for_hub "${try}"; then

      echo "${try}"

      return 0

    fi



  done

  return 1

}

choose_app_port_for_dir() {

  local dir="$1"

  local label="${dir##*/}"

  local pref

  if pref="$(preferred_port_from_env "${dir}" 2>/dev/null)" && [[ -n "${pref}" ]]; then

    if ! port_blocked_for_hub "${pref}"; then

      echo "${pref}"

      return 0



    fi

    echo "[서버] ${label}: ${dir}/.env 의 PORT=${pref} 이미 예약 또는 사용 중 → 자동 포트로 대체합니다." >&2



  fi

  allocate_free_app_port_scan

}

STATIC_PID=""
declare -a NODE_PIDS=()

HUB_DEV_PORTS_FILE="${ROOT_DIR}/hub-dev-ports.json"

cleanup() {
  local pid
  for pid in "${NODE_PIDS[@]:-}"; do
    if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
      kill "${pid}" >/dev/null 2>&1 || true
    fi
  done

  NODE_PIDS=()

  if [[ -n "${STATIC_PID:-}" ]] && kill -0 "${STATIC_PID}" >/dev/null 2>&1; then
    kill "${STATIC_PID}" >/dev/null 2>&1 || true

  fi

  rm -f "${HUB_DEV_PORTS_FILE}" "${HUB_DEV_PORTS_FILE}.tmp" 2>/dev/null || true
}

write_hub_dev_ports_json() {
  [[ ${#APP_LABELS[@]} -eq 0 ]] && return 0
  local tmp="${HUB_DEV_PORTS_FILE}.tmp"
  local i c=0
  printf '{' >"${tmp}"
  for ((i = 0; i < ${#APP_LABELS[@]}; i++)); do
    ((c++)) && printf ',' >>"${tmp}"
    printf '"%s":%s' "${APP_LABELS[i]}" "${APP_PORTS[i]}" >>"${tmp}"
  done
  printf '}' >>"${tmp}"
  mv -f "${tmp}" "${HUB_DEV_PORTS_FILE}"
}

trap cleanup EXIT INT TERM HUP

STATIC_PORT="$(pick_free_static_port)" || STATIC_PORT=""
if [[ -z "${STATIC_PORT}" ]]; then
  echo "[서버] ${STATIC_PORT_START}~(+) 구간에서 비어 있는 정적 서버 포트를 찾지 못했습니다."

  exit 1
fi

if [[ "${STATIC_PORT}" != "${STATIC_PORT_START}" ]]; then
  echo "[서버] 정적 포트 ${STATIC_PORT_START} 사용 중 → ${STATIC_PORT} 로 시작합니다." >&2

fi

mapfile -t APP_DIRS < <(discover_node_server_projects)
mapfile -t STATIC_WEB_DIRS < <(discover_static_web_projects)
append_pinned_static_projects

declare -a APP_LABELS=()
declare -a APP_PORTS=()

if (( ${#APP_DIRS[@]} > 0 )); then
  echo "[0] Node 앱 ${#APP_DIRS[@]}개 포트 할당 (${NODE_PORT_SCAN_START}대 또는 각 .env 의 PORT):" >&2
  for dir in "${APP_DIRS[@]}"; do
    label="${dir##*/}"
    if ! chosen_port="$(choose_app_port_for_dir "${dir}")"; then
      echo "[서버] ${label}: 빈 포트를 찾지 못했습니다. NODE_PORT_SCAN_START 를 올려 보세요."
      exit 1
    fi
    reserve_app_port_runtime "${chosen_port}"
    APP_LABELS+=("${label}")
    APP_PORTS+=("${chosen_port}")
    echo "    • ${label}  →  포트 ${chosen_port}" >&2
  done
  write_hub_dev_ports_json
fi

echo "[1] 정적 허브: http://localhost:${STATIC_PORT}  (${ROOT_DIR})" >&2
python3 -m http.server "${STATIC_PORT}" --directory "${ROOT_DIR}" &
STATIC_PID=$!

for _ in {1..50}; do
  if ! kill -0 "${STATIC_PID}" 2>/dev/null; then
    echo "[서버] 정적 서버가 바로 종료되었습니다. 포트 ${STATIC_PORT}를 확인하세요."
    exit 1
  fi
  if port_is_listening "${STATIC_PORT}"; then
    break
  fi

  sleep 0.1
done

if ! port_is_listening "${STATIC_PORT}"; then
  echo "[서버] 정적 서버가 ${STATIC_PORT}에서 응답하지 않습니다."
  exit 1
fi

ensure_vite_projects_for_static_hub

if [[ -f "${GENERATE_ROOT_INDEX_SCRIPT}" ]]; then
  if ! node "${GENERATE_ROOT_INDEX_SCRIPT}" --force >/dev/null 2>&1; then
    echo "[start-servers] 경고: 루트 index.html 재생성 실패 — 허브 링크가 오래된 상태일 수 있습니다." >&2
  fi
fi

if (( ${#APP_DIRS[@]} == 0 )); then
  echo "[안내] server.js|server.mjs + npm start 가 있는 하위 디렉터리가 없습니다. 정적 허브만 실행 중입니다." >&2

  echo "[종료] Ctrl+C" >&2

  wait "${STATIC_PID}" || true

  exit 0
fi

echo "[2] Node 서버 ${#APP_DIRS[@]}개 기동:" >&2

for ((i = 0; i < ${#APP_DIRS[@]}; i++)); do
  dir="${APP_DIRS[i]}"
  label="${dir##*/}"
  chosen_port="${APP_PORTS[i]}"

  echo "    • ${label}  →  http://localhost:${chosen_port}" >&2

  (
    cd "${dir}"

    exec env PORT="${chosen_port}" npm start
  ) &

  NODE_PIDS+=($!)
  sleep 0.15

done

echo "" >&2
echo "--- 열 주소 요약 ---"
echo " 정적 허브     http://localhost:${STATIC_PORT}"
echo " Node+Vite(p2)는 빌드 후 프로젝트 루트 index.html 로 …/<프로젝트>/ 만 열어도 됩니다. /api 는 hub-dev-ports.json 로 Node 포트에 붙습니다."
i=0
while ((i < ${#APP_LABELS[@]})); do

  printf ' %-14s http://localhost:%s\n' "${APP_LABELS[i]}" "${APP_PORTS[i]}"

  i=$((i + 1))
done | LC_ALL=C sort

if (( ${#STATIC_WEB_DIRS[@]} > 0 )); then
  echo ""
  echo " 정적 프로젝트 경로:"
  for dir in "${STATIC_WEB_DIRS[@]}"; do
    rel="${dir#${ROOT_DIR}/}"
    printf ' %-14s http://localhost:%s/%s/\n' "${rel##*/}" "${STATIC_PORT}" "${rel}"
  done | LC_ALL=C sort
fi

echo "---"
echo "[안내] 위 Node 앱 목록 종료 포함 전체 종료 → 이 창에서 Ctrl+C"
echo ""

wait || true
