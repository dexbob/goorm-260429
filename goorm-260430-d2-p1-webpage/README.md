# Day 2 차트 해설 AI 웹앱

주식 차트 이미지 업로드 후 AI 해설을 반환하는 웹앱입니다.

## 구성
- 프론트엔드: `index.html`, `styles.css`, `script.js`
- 백엔드: `server.js` (Express + multer)
- AI: Gemini Vision (`GEMINI_API_KEY` 필요)

## 기능
- 차트 이미지 업로드(드래그앤드롭/파일 선택)
- `/analyze` API 호출
- 결과 카드 표시
  - 차트 요약
  - 시장 상태(상승/하락/횡보)
  - 추세 근거
  - 초보자 인사이트
  - 주의사항

## 실행
```bash
cd goorm-260430-d2-p1-webpage
npm install
cp .env.example .env
# .env에서 GEMINI_API_KEY 입력
npm start
```

브라우저:
- `http://localhost:3000` (또는 `.env`의 `PORT`)

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

## 운영/장애 참고
- `GEMINI_API_KEY` 미설정/오류 시 `/analyze` 실패
- 기본 모델: `gemini-2.0-flash`
- 미지원 모델(404) 시 `gemini-2.5-flash` fallback
- 호출 간격 제한: `GEMINI_MIN_INTERVAL_MS` (기본 6000ms)
- 429 쿨다운: `GEMINI_429_COOLDOWN_MS` (기본 20000ms)
