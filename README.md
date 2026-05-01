# Goorm 260429 Workspace

구름 실습 프로젝트를 Day 단위로 모아 둔 저장소입니다.  
루트 `index.html`에서 각 프로젝트로 이동할 수 있고, 각 프로젝트 폴더에는 별도의 `README.md`가 있습니다.

## 프로젝트 목록
- Day 1: `goorm-260429-d1-p1-webpage` (정적 랜딩 웹페이지)
- Day 2: `goorm-260430-d2-p1-webpage` (차트 해설 AI 웹앱)
- Day 3: `goorm-260501-d3-p1-webpage` (날짜 기반 To-do + 캘린더)

## 바로 열기
- Day 1: [goorm-260429-d1-p1-webpage](./goorm-260429-d1-p1-webpage/)
- Day 2: [goorm-260430-d2-p1-webpage](./goorm-260430-d2-p1-webpage/)
- Day 3: [goorm-260501-d3-p1-webpage](./goorm-260501-d3-p1-webpage/)

## 루트 인덱스 생성
루트 `index.html`은 하위 프로젝트 링크 목록을 자동 생성합니다.

```bash
node scripts/generate-root-index.js
```

규칙:
- 루트 바로 아래 디렉터리만 검사
- 각 디렉터리에 `index.html`이 있으면 포함
- `.git`, `.cursor`, `node_modules`, `scripts` 제외

## 통합 실행 (`start-servers.sh`)
루트에서 다음 스크립트를 실행하면:
- 정적 허브 서버(Python)
- `server.js` + `package.json`의 `scripts.start`가 있는 하위 프로젝트(Node)

를 함께 기동합니다.

```bash
./start-servers.sh
```

실행 중 루트에 `hub-dev-ports.json`이 생성되며(종료 시 삭제), 허브 주소로 접속한 프론트가 해당 파일을 읽어 API 포트를 자동 연결합니다.

## 참고
- 개별 실행 방법/기능은 각 프로젝트의 `README.md`를 확인하세요.
- 루트 정적 페이지만 띄우려면:

```bash
python3 -m http.server 5500
```

