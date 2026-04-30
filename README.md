# Goorm 260429 정적 웹페이지 모음

루트 진입용 `index.html`에서 각 연습 디렉터리의 정적 웹페이지로 이동할 수 있도록 구성한 저장소입니다.
현재 포함된 개별 연습 페이지 중 하나는 AI 에이전트 기반의 현대적인 애플리케이션 빌드를 소개하는 `단일 페이지(SPA)` 랜딩입니다. (프레임워크 없음, 순수 `HTML/CSS/JS`)

## 루트 랜딩 페이지
- 루트 `index.html`은 각 연습 디렉터리의 `index.html`을 자동으로 수집해 링크 목록을 만듭니다.
- 생성 스크립트: `scripts/generate-root-index.js`
- 루트 스타일: `styles.css`

### 생성/갱신 방법
새 연습 디렉터리를 루트 바로 아래에 추가하고, 그 안에 `index.html`을 만든 뒤 아래 명령을 실행합니다.

```bash
node scripts/generate-root-index.js
```

생성 규칙:
- 루트 바로 아래 디렉터리만 검사
- 각 디렉터리에 `index.html`이 있으면 링크에 포함
- `.git`, `.cursor`, `node_modules`, `scripts`는 제외

루트 페이지까지 함께 확인하려면 저장소 루트에서 정적 서버를 실행하면 됩니다.

```bash
python3 -m http.server 5500
```

브라우저 접속:
- `http://localhost:5500`

## 포함된 기능
- 라이트/다크 테마 토글 (`localStorage`에 저장)
- 다국어 전환: `KO / EN / JA / ZH(간체)`
- FAQ 아코디언(열고 닫기)
- 섹션 등장 애니메이션 + 스크롤 스파이(네비 하이라이트)
- 하단 고객 문의 폼
  - 수신 이메일: `mimacro.kr@gmail.com`
  - 문의사항 입력 후 제출하면 `mailto:` 링크로 이동하며, 입력 내용이 이메일 본문에 포함됩니다.

## 기술 스택
- `HTML`, `CSS`, `JavaScript`
- CSR 없이 정적 문서 중심

## 실행 방법 (로컬 서버)
이 프로젝트는 정적 웹페이지이므로 로컬에서 간단히 서빙해서 확인할 수 있습니다.

1. 웹페이지 폴더로 이동
   - `goorm-260429-d1-p1-webpage`
2. Python `http.server`로 실행
   - 포트 예시: `5500` 또는 `5151`
3. 브라우저에서 접속
   - `http://localhost:<port>`

예)
```bash
cd goorm-260429-d1-p1-webpage
python3 -m http.server 5500
```

## 파일 구조
- `index.html`
- `styles.css`
- `scripts/generate-root-index.js`
- `goorm-260429-d1-p1-webpage/index.html`
- `goorm-260429-d1-p1-webpage/styles.css`
- `goorm-260429-d1-p1-webpage/script.js`
- `goorm-260429-d1-p1-webpage/assets/`

## 커스터마이즈 포인트
- 문의 수신 이메일 변경:
  - `goorm-260429-d1-p1-webpage/script.js`의 `EMAIL_TO` 값을 수정
- 기본 언어/테마 변경:
  - `goorm-260429-d1-p1-webpage/script.js`의 초기값 로직(`localStorage`, `prefers-color-scheme`)을 수정

