# Goorm 260430 Day 2 Project 1

## 개요

**주식 차트 해설 AI**를 목표로 한 소규모 웹 MVP입니다. 사용자는 차트 캡처(이미지)를 올리고, 필요하면 미리보기에서 확대·이동하며 펜·도형으로 표시를 덧붙인 뒤 **분석하기**를 누릅니다. 서버가 이미지를 받아 비전 모델에 넘기면, 화면에는 **요약·시장 상태·추세 해석·초보자용 인사이트·주의할 점** 등이 카드 형태로 정리되어 나옵니다.

초보자가 “이 차트가 뭐라고 말하는지”를 빠르게 훑어보는 용도를 가정했고, 별도 프레임워크 없이 브라우저와 Node 한 대로 동작하는 구성입니다.

## 기술 스택

- **프론트엔드**: 정적 `index.html`, `styles.css`, `script.js` — 업로드·미리보기·Canvas 기반 그리기·결과 표시
- **백엔드**: `server.js` — **Express**, **multer**(multipart 업로드), `POST /analyze`에서 이미지 처리 후 AI 호출
- **AI**: **Google Gemini Vision**(1순위) + **OpenRouter** Chat Completions(동일 이미지·프롬프트로 폴백 또는 OpenRouter만 사용). 폴백 시 기본 모델: [openrouter/free](https://openrouter.ai/openrouter/free)

## 주요 기능

- 차트 이미지 업로드 (드래그앤드롭/파일 선택)
- **미리보기 편집**
  - 뷰 안에 이미지 전체가 보이도록 **비율 유지(contain)** 배치(잘리지 않음)
  - **줌**(축소·확대)·**뷰 맞춤**(위치·배율 초기화)·**휠**로 확대/축소, **이동** 도구로 드래그 패닝
  - **그리기**: 펜, 직선, 사각형, 원/타원, 색상 선택 — 아이콘 버튼
  - **다운로드**: 원본 픽셀 크기에 맞춰 이미지와 그림을 합성한 PNG/JPEG 저장
- **툴바 배치**(한 줄 기준)
  - **왼쪽**: 줌 묶음(축소 · 뷰 맞춤 · 확대)
  - **가운데**: 이동·그리기 묶음(이동, 펜, 선, 사각형, 원, 색상) — 화면이 매우 좁을 때만 이 묶음에 가로 스크롤
  - **오른쪽**: 다운로드
- `/analyze` API 호출
- 결과 카드 표시
  - 차트 요약
  - 시장 상태 (상승/하락/횡보)
  - 추세 근거
  - 초보자 인사이트
  - 주의사항

## 실행 방법

```bash
cd goorm-260430-d2-p1-webpage
npm install
cp .env.example .env
# .env에서 GEMINI_API_KEY 입력 (선택)
# 폴백 또는 Gemini 없이 쓰려면 OPENROUTER_API_KEY 입력
npm start
```

- 브라우저: `http://localhost:3000` (또는 `.env`의 `PORT`)
- OpenRouter 키: [openrouter.ai/keys](https://openrouter.ai/keys) — 무료 라우터 설명: [openrouter/free](https://openrouter.ai/openrouter/free)

## API

### `POST /analyze`

- Content-Type: `multipart/form-data`
- Field: `image` (파일 1개)

응답(JSON):
- `summary`
- `marketState`
- `trendReason`
- `insight`
- `cautions[]`
- `detected` (`symbol`, `timeframe`, `indicators[]`)
- `analysisProvider` (선택): `"gemini"` | `"openrouter"` — 어느 경로로 분석했는지 표시

## 운영 참고

- **분석 순서**: `GEMINI_API_KEY`가 있으면 Gemini 먼저; 실패 시 `OPENROUTER_API_KEY`가 있으면 OpenRouter(`OPENROUTER_MODEL`, 기본 `openrouter/free`)로 폴백. Gemini 키가 없고 OpenRouter 키만 있으면 OpenRouter만 사용.
- `GEMINI_API_KEY`와 `OPENROUTER_API_KEY`가 **둘 다 없으면** `/analyze`는 설정 오류로 실패한다.
- OpenRouter 무료 라우터는 **후보 모델이 바뀔 수 있고** 한도·지연이 있을 수 있다.
- 기본 Gemini 모델: `gemini-2.0-flash`
- 미지원 모델(404) 시 `gemini-2.5-flash` fallback
- 호출 간격 제한: `GEMINI_MIN_INTERVAL_MS` (기본 6000ms)
- 429 쿨다운: `GEMINI_429_COOLDOWN_MS` (기본 20000ms)
