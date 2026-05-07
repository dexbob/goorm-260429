# RAG Pipeline Visualizer

문서를 넣어 **청킹 → 임베딩 → 유사도 검색 → 답변 합성** 흐름을 한 화면에서 학습할 수 있는 RAG 시각화 웹앱입니다.

## 주요 기능

- 단계 탭 기반 학습 UI (`정보 입력`, `청킹`, `임베딩`, `검색`)
- TXT/PDF 업로드 + 본문 직접 입력
- 청크 결과와 overlap 시각화
- 임베딩 벡터 미리보기 및 2차원 산점도
- 코사인 유사도 Top-K 검색 + 분포 차트
- 검색 결과 기반 LLM 답변 합성

## 실행 방법

- 개발 모드: `npm run dev`
  - 프론트(Vite)와 로컬 API가 함께 실행됩니다.
- 빌드: `npm run build`
  - 정적 허브에서 바로 열 수 있도록 `index.html`/`assets` 출력이 갱신됩니다.
- 단일 프로세스 실행: `npm start`
  - 빌드 산출물 정적 서빙 + API를 함께 제공합니다.

## 환경 변수

- `OPENAI_API_KEY` 또는 `OPENROUTER_API_KEY`: 임베딩 생성용 키
- `OPENROUTER_API_KEY`: 답변 합성(LLM) 호출용 키
- `OPENROUTER_MODEL` (선택): 합성 답변 모델 지정
- `OPENROUTER_FALLBACK_MODELS` (선택): 폴백 모델 목록(쉼표 구분)
- `RAG_API_PORT` 또는 `PORT` (선택): API 포트 지정

## 구조 요약

- UI/상태: `src/pages/Home.tsx`, `src/components/*`, `src/store/ragStore.ts`
- 클라이언트 API: `src/services/ragService.ts`
- 서버 로직: `lib/rag-backend.ts`, `server/index.ts`
- 서버리스 엔드포인트: `api/*.ts`
