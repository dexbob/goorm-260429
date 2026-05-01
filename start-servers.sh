#!/usr/bin/env bash
set -euo pipefail

echo "[start-servers] 스크립트 시작 (잠시만 기다리세요…)" >&2

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBPAGE_DIR="${ROOT_DIR}/goorm-260430-d2-p1-webpage"
WEBPAGE_ENV="${WEBPAGE_DIR}/.env"

# --- 포트: 환경변수 PORT가 없으면 webpage .env의 PORT, 없으면 3000
if [[ -z "${PORT:-}" ]] && [[ -f "$WEBPAGE_ENV" ]]; then
  _port_line="$(grep -E '^[[:space:]]*PORT=' "$WEBPAGE_ENV" 2>/dev/null | tail -n1 || true)"
  if [[ -n "${_port_line}" ]]; then
    PORT="${_port_line#*=}"
    PORT="${PORT//$'\r'/}"
    PORT="${PORT//\"/}"
    PORT="${PORT//\'/}"
  fi
fi
APP_PORT="${PORT:-3000}"
export PORT="$APP_PORT"

STATIC_PORT_START="${STATIC_PORT:-5000}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 명령을 찾을 수 없습니다."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm 명령을 찾을 수 없습니다."
  exit 1
fi

# 127.0.0.1:port 에 연결되면 누군가 LISTEN 중으로 간주 (짧은 timeout으로 드물게 걸리는 /dev/tcp 대기 방지)
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

if port_is_listening "${APP_PORT}"; then
  echo "[서버] 분석 API 포트 ${APP_PORT}이(가) 이미 사용 중입니다."
  echo "       다른 터미널의 node/npm을 종료하거나, ${WEBPAGE_ENV} 에서 PORT를 바꾼 뒤 다시 실행하세요. (예: PORT=3001)"
  exit 1
fi

STATIC_PORT="$(pick_free_static_port)" || STATIC_PORT=""
if [[ -z "${STATIC_PORT}" ]]; then
  echo "[서버] ${STATIC_PORT_START}~(+) 구간에서 비어 있는 정적 서버 포트를 찾지 못했습니다."
  exit 1
fi
if [[ "${STATIC_PORT}" != "${STATIC_PORT_START}" ]]; then
  echo "[서버] 정적 포트 ${STATIC_PORT_START} 사용 중 → ${STATIC_PORT} 로 시작합니다." >&2
fi

cleanup() {
  if [[ -n "${STATIC_PID:-}" ]] && kill -0 "${STATIC_PID}" >/dev/null 2>&1; then
    kill "${STATIC_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "[1/2] 정적 서버 시작: http://localhost:${STATIC_PORT}" >&2
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

echo "[2/2] 분석 서버 시작: http://localhost:${APP_PORT}" >&2
echo "[안내] Node 서버가 이 터미널을 점유합니다. 아래에 'running' 메시지가 보인 뒤에는 입력이 없어 멈춘 것처럼 보여도 정상입니다. 종료: Ctrl+C" >&2
cd "${WEBPAGE_DIR}"
npm start
