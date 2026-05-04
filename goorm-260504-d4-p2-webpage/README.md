# Goorm 260504 Day 4 Project 2 — 한국 명언 카드

## 개요

**한국 명언 카드**는 카드를 클릭할 때마다 **한국 역사·문화권 인물의 명언(한국어)** 을 보여 주고, 그 아래에 **영문 번역**을 붙이는 소형 웹앱입니다. 하단에는 **저자 이름(한글만)** 과 **생몰년**, 그리고 **주요 업적(한국어 1~2문장)** 을 가운데 정렬로 배치합니다. 배경색은 무작위로 바뀌며, 전환 애니메이션이 적용됩니다.

이 디렉터리는 **`goorm-260504-d4-p1-webpage`를 복사한 뒤** 범위를 **한국 인물·한국어 명언**으로 좁히고 UI·프롬프트·시드 데이터를 바꾼 버전입니다.

명언은 **[OpenRouter](https://openrouter.ai/)** 의 [`openrouter/free`](https://openrouter.ai/openrouter/free)로 생성합니다. API가 실패하면 **정적 뱅크 40건**(`STATIC_KOREAN_QUOTES`)으로 시드·폴백을 채웁니다.

## 데이터 흐름 (클라이언트)

1. **정적 뱅크 40건** (`src/staticQuotes.ts` — `SEED_QUOTES`·`FALLBACK_QUOTES`가 동일 참조): 로드 시 셔플하여 대기 큐에 넣고, 큐가 비었을 때 폴백 덱에서도 같은 목록을 씁니다.
2. **초기 API**: `GET /api/quote` 를 동시 5회 호출하고, 끝나는 순서대로 성공 건만 큐에 반영합니다.
3. **성공 시 큐 갱신**: 동일 명언이 없으면 노출 횟수가 가장 많은 항목 하나를 제거한 뒤 새 명언을 큐 끝에 넣습니다.
4. **클릭**: 다음 카드는 큐에서 동기로 꺼내며, 동시에 가능하면 병렬 5회를 다시 요청합니다(`parallelFetchLocked`).
5. **중복**: `(명언 한글 + 저자)` 키가 큐에 있으면 API 중복은 무시합니다.

## 기술 스택

- **프론트**: **React 19** + **TypeScript** + **Vite 6** (`src/`, `index.html`, `vite.config.ts`, `tsconfig.json`)
- **백엔드**: `server.mjs` — `GET /api/quote` 에서 OpenRouter 호출, 응답 JSON의 `authorEn` 은 서버에서 비움. **`.build/index.html`이 없으면 기동 시 `npm run build`를 한 번 자동 실행**한 뒤, 정적 파일은 항상 **`.build/`**에서 제공합니다. 브라우저 URL은 **`/`** (예: `http://127.0.0.1:8792/`) 만 쓰면 됩니다. HTML·JS·CSS는 **`Cache-Control: no-store`** 로 내려 캐시된 옛 번들로 인한 흰 화면을 줄입니다.
- **환경 변수**: `dotenv` (`.env`에 `OPENROUTER_API_KEY`, 선택 `PORT`)

## 실행 방법

### 한 번에 (프로덕션 번들 + API)

```bash
cd goorm-260504-d4-p2-webpage
npm install
cp .env.example .env
# .env 에 OPENROUTER_API_KEY=...
npm run build
npm start
```

브라우저: `http://127.0.0.1:8792/` (기본 포트; p1과 겹치지 않게 **8792**)

### 개발 (핫 리로드 + API)

터미널 1 — OpenRouter 프록시:

```bash
npm run dev:api
```

터미널 2 — Vite (`/api` → `http://127.0.0.1:8792` 로 프록시, 진입점 `src/main.tsx`):

```bash
npm run dev
```

타입 검사만: `npx tsc --noEmit`

### 루트 정적 허브 (`start-servers.sh`)

- **`./start-servers.sh`**: Node 앱 기동 **직전**에 `vite.config.ts`(또는 `.js`)가 있고 **`.build/index.html`이 없으면** 해당 디렉터리에서 **`npm run build`** 를 한 번 실행해, 흰 화면(번들 없이 `npm start`만 된 경우)을 줄입니다.
- **Node**로 뜬 앱: `hub-dev-ports.json` 으로 `/api/quote` 가 해당 포트로 연결됩니다. 실제 화면은 요약에 나온 **`http://<호스트>:<Node포트>/`** 로 여세요(URL에 `.build` 없음).
- Python 정적 서버의 `…/goorm-260504-d4-p2-webpage/` 만으로는 **`.tsx`를 브라우저가 실행할 수 없어** 카드 앱이 뜨지 않을 수 있습니다. **이 프로젝트는 위 Node 포트**로 여는 것을 권장합니다.

## API `GET /api/quote`

성공 시 JSON 필드:

| 필드 | 설명 |
|------|------|
| `quoteKo` | 한국어 명언(본문) |
| `quoteEn` | `quoteKo`의 영역 번역 |
| `author` | 저자 한글 이름만 |
| `authorEn` | 항상 빈 문자열(호환용) |
| `lifespan` | 생몰년 등 |
| `achievements` | 주요 업적 한국어 1~2문장(개행 가능) |

화면에는 **`저자  생년–사년`** 한 줄과 업적 블록만 표시합니다.

## 운영 참고

- `openrouter/free` 는 429·지연 가능.
- 서버는 모델 출력 JSON에서 `{` … `}` 만 잘라 파싱합니다.
- CORS: 허브와 Node 포트가 달라도 `/api/quote` 호출 가능.
