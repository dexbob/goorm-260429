# Goorm 260504 Day 4 Project 1 — 명언 카드 생성기

## 개요

카드를 클릭할 때마다 **유명 인물의 명언**을 보여 주는 소형 웹앱입니다. 상단에는 **한글 명언**과 그 아래 **영문 원문**, 하단(가운데 정렬)에는 **`이름 (영문)  생년–사년`** 한 줄과 **주요 업적** 한 줄을 배치했습니다. 배경색은 무작위로 바뀌며, 전환 애니메이션(플립·슬라이드·줌 등)이 적용됩니다.

명언은 **[OpenRouter](https://openrouter.ai/)** 의 무료 라우터 모델 [`openrouter/free`](https://openrouter.ai/openrouter/free)로 생성합니다. API가 자주 실패하거나(429 등) 연결되지 않을 때는 **브라우저에 내장된 샘플 목록**으로 대체합니다.

## 데이터 흐름 (클라이언트)

1. **시드 30건** (`script.js` 의 `SEED_QUOTES`): 페이지 로드 시 셔플하여 **대기 큐**를 채웁니다. OpenRouter 없이도 첫 화면부터 다양한 명언으로 시작합니다.
2. **초기 API**: 로드 직후 `GET /api/quote` 를 **동시 5회**만 호출합니다. 응답이 **끝나는 순서대로** 성공 건마다 처리합니다.
3. **성공 시 큐 갱신**: 새 명언이 큐에 이미 없으면, **화면에 가장 많이 노출된 명언** 하나를 큐에서 제거한 뒤(동점이면 앞쪽 항목), 새 명언을 큐 **끝**에 넣습니다. 노출 횟수는 카드가 그려질 때마다 누적합니다.
4. **클릭(다음 명언)**: 다음 카드는 **항상 큐에서 동기로** 꺼내며 API를 기다리지 않습니다. 큐가 비었을 때만 **로컬 폴백 샘플**을 한 장 보여 줍니다. 동시에, 이전 **병렬 5회 배치가 아직 끝나지 않았다면** 새 배치를 쏘지 않고, 끝난 뒤에만 다시 **동시 5회**를 시도합니다(`parallelFetchLocked`).
5. **중복**: 큐 안에 동일 `(명언 한글 + 저자)` 키가 있으면 API로 받은 중복 건은 무시합니다.

## 기술 스택

- **프론트**: 정적 `index.html`, `style.css`, `script.js` — 카드 UI·애니메이션·`hub-dev-ports.json` 기반 API 베이스 자동 인식
- **백엔드**: `server.mjs` — Node 내장 `http` 만으로 정적 파일 제공 + `GET /api/quote` 에서 OpenRouter Chat Completions 호출
- **환경 변수**: `dotenv` 로 프로젝트 루트 `.env` 로딩

## 실행 방법

### 1) 이 폴더에서만 실행

```bash
cd goorm-260504-d4-p1-webpage-v1
npm install
cp .env.example .env
# .env 에 OPENROUTER_API_KEY=... 입력 (https://openrouter.ai/keys)
npm start
```

터미널에 표시되는 주소(기본 `http://127.0.0.1:8787/`, `.env` 의 `PORT` 가 있으면 해당 포트)로 브라우저에서 엽니다.

### 2) 저장소 루트에서 통합 실행

저장소 루트에서 **`./start-servers.sh`** 를 실행하면 정적 허브(Python `http.server`)와, `server.js` 또는 **`server.mjs`** + `npm start` 가 있는 하위 Node 프로젝트가 함께 기동됩니다.

- 허브 예: `http://localhost:5000/goorm-260504-d4-p1-webpage-v1/`
- 루트에 생성되는 **`hub-dev-ports.json`** 을 프론트가 읽어, 같은 호스트의 Node 포트로 `GET /api/quote` 요청을 보냅니다.
- **GitHub Pages** (`*.github.io`) 에서는 허브 맵 조회를 하지 않습니다.

## 환경 변수 (`.env`)

| 변수 | 설명 |
|------|------|
| `OPENROUTER_API_KEY` | OpenRouter API 키. 없으면 서버는 503 JSON을 반환하고, 클라이언트는 시드·폴백만 사용합니다. |
| `PORT` | (선택) 로컬 Node 서버 포트. 미설정 시 기본 `8787`. `start-servers.sh` 가 할당한 `PORT` 환경 변수가 우선됩니다. |

## API

### `GET /api/quote`

성공 시 `200`, 본문 JSON:

- `quoteKo` (string) — 한글 명언  
- `quoteEn` (string, 선택) — 영문 원문  
- `author` (string) — 발언자 한글 이름  
- `authorEn` (string, 선택) — 발언자 영문 표기(라틴 문자)  
- `lifespan` (string, 선택) — 생몰년 등  
- `achievements` (string, 선택) — 주요 업적 한 줄  

화면 하단 한 줄에는 `이름 (authorEn)  lifespan` 형식으로 붙여 표시합니다(`authorEn`이 비면 괄호 생략).

키가 없거나 OpenRouter 오류 시 `503` / `502` 와 `{ "error": true, "message": "..." }` 형태를 반환할 수 있으며, 클라이언트는 이 경우에도 **큐·시드·폴백**으로 동작을 이어 갑니다.

## 운영 참고

- 무료 라우터 `openrouter/free` 는 **후보 모델이 바뀔 수 있고** 응답 지연·한도(429)가 있을 수 있습니다.
- 모델이 JSON 외 문자를 섞으면 서버에서 `{` … `}` 구간을 잘라 파싱합니다.
- 크로스 오리진(허브 포트 ≠ Node 포트)에서도 API가 동작하도록 `GET/OPTIONS /api/quote` 에 CORS 헤더를 붙였습니다.
