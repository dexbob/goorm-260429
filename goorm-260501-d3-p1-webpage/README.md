# Goorm 260501 Day 3 Project 1 - 오늘의 할일

구름 260501 과정의 Day 3 To-do 앱입니다. 메인 타이틀은 **오늘의 할일**이며, 한 줄 헤더에서 **왼쪽 메뉴 버튼 · 가운데 제목 · 오른쪽 선택 날짜(캘린더로 이동)**로 구성합니다. 슬라이드 메뉴에서는 **언어를 국기 이모지 라디오**로, **테마를 ☀️/🌙 토글(라디오 형태)** 로 고르고, 하단에서는 **기술 스택(이모지+제목 버튼 → 모달)** 다음에 줄 단위 연락·날짜 정보를 표시합니다.

## 프로젝트 개요

- 형태: Express로 정적 파일을 서빙하고, 할 일 데이터는 **SQLite**에 저장
- 화면 제목(한국어): `오늘의 할일`
- 목적: **날짜별** 할 일을 추가·완료·삭제하고, 캘린더에서 월별 요약(할일 수·완료 수)을 확인
- 진입 파일: `index.html` — 로컬·배포 시 **Node 서버**로 열면 SQLite API 사용; **GitHub Pages**(`*.github.io`)처럼 API가 없으면 브라우저 **LocalStorage**에만 저장

## 주요 기능

- 할 일 추가/완료/삭제 (선택한 **어느 날짜**든 동일)
- 필터: All / Active / Completed
- `SQLite` 영속화 (`todos.sqlite`, 기본 경로는 프로젝트 루트)
- `localStorage`: 테마·언어; API를 쓸 수 없을 때(GitHub Pages 등)에는 **날짜별 할 일·월 통계**도 동일 키 공간에 저장(페이지를 열 때 선택 날짜 기본은 **오늘**)
- 헤더 우측 날짜 클릭 → 해당 달이 열린 **캘린더**로 이동
- 캘린더 셀: 해당 날짜에 할 일이 있을 때만 날짜 아래 **할일 수 / 완료 수** 두 줄 표시; 그날 모두 완료면 셀 배경을 다르게 표시
- 캘린더에서 날짜 클릭 → 그날 **할일 목록**으로 돌아가 편집
- 라이트/다크 테마, 다국어(한/영/일/중), 기술 스택 모달

## 사용된 기술 스택

- HTML5, CSS3, Vanilla JavaScript
- Express, SQLite (`node:sqlite` — Node 22+ 내장, 네이티브 애드온 없음)
- LocalStorage (테마·언어, 및 API 불가 시 할 일·월 통계)

## 파일 구성

| 파일 | 설명 |
|------|------|
| `index.html` | 헤더/할일 뷰/캘린더 뷰/슬라이드 메뉴 |
| `style.css` | 테마, 드로어, 캘린더 UI |
| `script.js` | API 연동, i18n, 캘린더 |
| `server.js` | 정적 서빙 + REST API |
| `README.html` | `README.md` 뷰어 |

## 실행 방법

```bash
cd goorm-260501-d3-p1-webpage
npm install
npm start
```

브라우저: `http://localhost:3333` (환경 변수 `PORT`로 변경 가능). **Node.js 22 이상**에서 실행하세요.

데이터베이스 파일 경로는 환경 변수 `TODO_DB_PATH`로 바꿀 수 있습니다.

## 참고

- DB는 **Node 22 이상**의 내장 모듈 `node:sqlite`를 사용합니다. Node 20 이하에서는 서버가 시작 시 안내 메시지와 함께 종료됩니다.
- 저장소 루트에서 **`./start-servers.sh`** 로 띄운 뒤 `http://<호스트>:<허브포트>/goorm-260501-d3-p1-webpage/` 로 열면, 루트의 **`hub-dev-ports.json`** 을 읽어 같은 호스트의 Node API 포트로 자동 연결됩니다(수동 `meta todo-api-origin` 없이 동작).
- 루트 연습 허브(예: 저장소 최상단에서 실행하는 Python `http.server`, 보통 포트 5000)로 이 프로젝트만 열면, 저장 시 **HTTP 501 (Not Implemented)** 이 납니다. Python 정적 서버는 `POST /api/todos`를 처리하지 않기 때문입니다. **반드시 이 폴더에서 `npm start` 후 나오는 주소**에서 사용하거나, 허브를 쓸 경우 `index.html`의 **`meta todo-api-origin`** 에 API 서버 URL(예: `http://내IP:3333`)을 지정하고 Node API 서버도 함께 띄우세요(CORS 허용됨).
- 언어/테마 선택 UI는 `<select>`가 아니라 라디오(이모지 버튼) 형태입니다.
- 언어 또는 테마를 변경하면 드로어(서브 메뉴)는 자동으로 닫힙니다.
- API 서버를 사용할 수 없는 환경(예: GitHub Pages의 `*.github.io`)에서는 호스트명을 감지해 처음부터 **LocalStorage 저장 모드**로 두거나, 정적 서버 HTML 404 등으로 API 실패 시 같은 모드로 전환되어 날짜별 할 일/월 통계를 브라우저에 저장합니다. `meta todo-api-origin`으로 외부 API를 지정한 경우에는 해당 URL을 우선합니다.
- 동일 워크스페이스의 다른 프로젝트는 루트 `README.md`에서 확인할 수 있습니다.
