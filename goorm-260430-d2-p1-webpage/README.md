# d2 차트 해설 AI 웹앱 MVP

바이브코딩 입문자를 위한 주식 차트 해설 데모 웹앱입니다.

- 프론트엔드: `index.html`, `styles.css`, `script.js`
- 백엔드: `server.js` (Express + multer)
- 분석 모드: Demo Stub (실 OpenAI 호출 없음)

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
- 현재는 데모 응답 모드입니다.
- 이후 OpenAI 연동 시 `createDemoAnalysis()`를 LLM 호출 로직으로 교체하면 됩니다.
