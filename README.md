# Goorm 260429 Workspace

구름 실습 프로젝트를 Day 단위로 관리하는 저장소입니다.  
루트 `index.html`에서 각 프로젝트로 이동할 수 있고, 각 프로젝트 폴더에 개별 `README.md`가 있습니다.

## 프로젝트 목록

| Day | 폴더 | 주제 |
|---|---|---|
| Day 1 | `goorm-260429-d1-p1-webpage` | 정적 랜딩 페이지 |
| Day 2 | `goorm-260430-d2-p1-webpage` | 차트 해설 AI 웹앱 |
| Day 3-1 | `goorm-260501-d3-p1-webpage` | 날짜 기반 To-do + 캘린더 |
| Day 3-2 | `goorm-260501-d3-p2-webpage` | 횟수 기반 습관 트래커 (습관제조기) |
| Day 4-1 | `goorm-260504-d4-p1-webpage` | 명언 카드 (OpenRouter + 폴백 샘플) |
| Day 4-2 | `goorm-260504-d4-p2-webpage` | 한국 명언 카드 (P1 분기, React/Vite 예정) |

## 바로 열기

- [Day 1](./goorm-260429-d1-p1-webpage/)
- [Day 2](./goorm-260430-d2-p1-webpage/)
- [Day 3-1](./goorm-260501-d3-p1-webpage/)
- [Day 3-2](./goorm-260501-d3-p2-webpage/)
- [Day 4-1](./goorm-260504-d4-p1-webpage/)
- [Day 4-2](./goorm-260504-d4-p2-webpage/)

## 루트 인덱스 생성

루트 `index.html`은 하위 프로젝트 링크를 자동 생성합니다.

```bash
node scripts/generate-root-index.js
```

포함 규칙:
- 루트 바로 아래 디렉터리만 검사
- 디렉터리에 `index.html`이 있으면 포함
- `.git`, `.cursor`, `node_modules`, `scripts` 제외

## 통합 실행

루트에서 `start-servers.sh`를 실행하면 다음을 함께 기동합니다.

- 정적 허브 서버(Python)
- `server.js` 또는 `server.mjs` + `package.json`의 `scripts.start`가 있는 하위 Node 프로젝트

```bash
./start-servers.sh
```

실행 중 루트에 `hub-dev-ports.json`이 생성되며(종료 시 삭제), 허브에서 연 프로젝트가 API 포트를 자동 인식할 수 있습니다.

## 참고

- 상세 기능/실행 방법은 각 프로젝트 `README.md`를 확인하세요.
- 루트 정적 페이지만 띄우려면:

```bash
python3 -m http.server 5500
```

