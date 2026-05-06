# goorm-260506-d5-p1-webpage

CSV 업로드 기반 자동 데이터 분석 대시보드입니다.  
업로드한 데이터를 FastAPI + Python 파이프라인으로 분석하고, 차트/요약/인사이트와 `.ipynb` 결과물을 제공합니다.

## 기술 스택

- 프론트엔드: React + Vite + TypeScript + Tailwind
- API: FastAPI (`api/index.py`)
- 데이터 분석: pandas/scikit-learn 기반 파이프라인 (`python/pipeline.py`)
- 노트북 생성: `python/build_notebook.py`
- 인사이트 생성: OpenRouter 또는 OpenAI (SSE 스트리밍)

## 주요 기능

- CSV 파일 업로드(최대 10MB)
- 자동 EDA 요약(행/열/결측/타입/상관쌍 등)
- 수치/범주형 테이블 및 차트 시각화
- LLM 기반 인사이트 스트리밍 출력(마크다운 렌더링)
- 분석 결과 노트북 다운로드(`analysis_report.ipynb`)

## 로컬 실행

### 1) 의존성 설치

```bash
npm ci
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) 환경변수 설정

```bash
cp .env.example .env
```

최소 한 가지 키가 필요합니다.

- `OPENROUTER_API_KEY` (권장) 또는
- `OPENAI_API_KEY`

기본 모델/옵션은 `.env.example`을 참고해 필요 시 조정하세요.

### 3) 개발 서버 실행

```bash
npm run dev
```

`scripts/dev-orchestrator.mjs`가 아래를 자동 처리합니다.

- API 포트 자동 탐색(기본 8793~8999) 후 `uvicorn --reload` 실행
- 웹 포트 자동 탐색(기본 5173~5399) 후 Vite 실행
- `.runtime-ports.json` 생성/갱신
- 종료 시 자식 프로세스 그룹 정리 + `.runtime-ports.json` 삭제

개별 실행:

```bash
npm run dev:api   # API만
npm run dev:web   # 웹만
```

## API 엔드포인트

- `GET /api/health`
  - LLM 설정 여부/공급자/모델 상태 확인
- `POST /api/analyze`
  - `multipart/form-data`로 `file`(필수), `target`(선택) 수신
  - 분석 결과 + 노트북(base64) 반환
- `POST /api/insights/stream`
  - `analysis` JSON 입력
  - SSE(`text/event-stream`)로 토큰 스트리밍

## 프론트 API 연결 규칙

프론트(`src/services/api.ts`)는 아래 순서로 API Base URL을 결정합니다.

1. `VITE_API_BASE_URL`이 있으면 해당 값 사용
2. 현재 페이지 포트가 `5000~5999`(정적 허브)면 `http(s)://<host>:8793` 사용
3. 그 외에는 same-origin(`/api`) 사용

즉, 루트 정적 허브에서 열 때도 API에 자동 연결되도록 설계되어 있습니다.

## 빌드/프리뷰

```bash
npm run build
npm run preview
```

`build`는 `vite build` 뒤에 `scripts/publish-static-hub.mjs`를 실행합니다.

## 배포(Vercel 기준)

- Root Directory: `goorm-260506-d5-p1-webpage`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

권장 환경변수:

- 필수: `OPENROUTER_API_KEY` 또는 `OPENAI_API_KEY`
- 선택: `OPENROUTER_MODEL`, `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_NAME`, `OPENAI_MODEL`

`VITE_API_BASE_URL`은 같은 프로젝트에서 `/api`를 함께 배포할 때는 비워두는 것을 권장합니다.
