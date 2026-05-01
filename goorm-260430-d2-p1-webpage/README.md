# d2 차트 해설 AI 웹앱 MVP

바이브코딩 입문자를 위한 주식 차트 해설 데모 웹앱입니다.

- 프론트엔드: `index.html`, `styles.css`, `script.js`
- 백엔드: `server.js` (Express + multer)
- 분석 모드: Gemini Vision (`GEMINI_API_KEY` 필요)

## 기능
- 차트 이미지 업로드(드래그앤드롭/파일 선택)
- `/analyze` API 호출
- 결과 카드 렌더링
  - 차트 요약
  - 시장 상태(상승/하락/횡보)
  - 초보자 인사이트
  - 주의사항

## 실행 방법
```bash
cd goorm-260430-d2-p1-webpage
npm install
cp .env.example .env
# .env 파일에서 GEMINI_API_KEY 값을 실제 키로 수정
npm start
```

브라우저:
- `http://localhost:3000`

## API 스펙
### `POST /analyze`
- Content-Type: `multipart/form-data`
- Field: `image` (파일)

응답(JSON):
- `summary`
- `marketState`
- `trendReason`
- `insight`
- `cautions[]`
- `detected: { symbol, timeframe, indicators[] }`

## 참고
- `.env` 파일의 `GEMINI_API_KEY`가 없거나 잘못되면 `/analyze`가 실패하며, 실패 원인이 화면에 표시됩니다.
- 모델 기본값은 `gemini-2.0-flash`이며, 모델 미지원(404)일 때 `gemini-2.5-flash`를 순차 fallback 합니다. (`GEMINI_MODEL`로 우선 모델을 바꿀 수 있습니다.)
- 호출량 완화를 위해 서버는 Gemini 요청 사이 최소 간격(`GEMINI_MIN_INTERVAL_MS`, 기본 6000ms)을 강제합니다.
- `429` 발생 시 서버는 즉시 재시도하지 않고 전역 쿨다운(`GEMINI_429_COOLDOWN_MS`, 기본 20000ms) 후 다음 요청을 허용합니다.

## 장애 대응 빠른 점검
- `API키가 유효하지 않습니다.`: `GEMINI_API_KEY` 값/오타/공백 확인 후 서버 재시작
- `요청 한도를 초과했습니다...`: 무료 티어 사용량 확인 후 잠시 뒤 재시도
- 모델 미지원 오류: `GEMINI_MODEL`에 `models/...`를 넣어도 자동 보정되며, 기본 fallback 체인이 동작

## 운영 체크리스트
1. `.env` 확인 (`GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `GEMINI_MIN_INTERVAL_MS`, `GEMINI_429_COOLDOWN_MS`)
2. 서버 재시작
   ```bash
   cd goorm-260430-d2-p1-webpage
   npm start
   ```
3. 루트 진입 확인: `http://localhost:3000`에서 `260430` 프로젝트 링크 진입
4. 분석 API 확인: 업로드 후 `/analyze` 요청 성공 여부 확인
