# 카드 사용 내역 앱

4개 카드(NH농협, 롯데, 우리, 삼성)의 사용 내역을 기록하고, 카드별·월별 사용 금액을 확인하는 웹 앱입니다.

## 기능

- 카드 선택, 사용 금액, 사용 일자, 사용 내역 입력
- 항목 삭제
- 카드별 사용 총액 자동 표시
- 월별 카드별 사용 금액 합산
- 브라우저 `localStorage`에 저장 (앱을 다시 열어도 데이터 유지)

## 사용 방법

### 로컬에서 실행

1. 이 저장소를 다운로드하거나 클론합니다.
2. `index.html` 파일을 브라우저로 엽니다.

### GitHub Pages로 공유 (추천)

저장소를 GitHub에 올린 뒤 **무료 웹 주소**에서 누구나 사용할 수 있습니다.

#### 자동 배포 (PowerShell)

1. GitHub 로그인 (최초 1회)
   ```powershell
   gh auth login --hostname github.com --git-protocol https --web
   ```
   브라우저에서 인증 코드 입력 후 완료

2. 프로젝트 폴더에서 배포 스크립트 실행
   ```powershell
   cd "g:\내 드라이브\경북여상26\커서\todo_app"
   .\deploy.ps1
   ```

3. 1~2분 후 아래 주소로 접속
   ```
   https://[GitHub아이디].github.io/card-expense-app/
   ```

#### 수동 배포

1. [GitHub](https://github.com)에 로그인
2. **New repository** → 저장소 이름: `card-expense-app` → **Create repository**
3. 이 폴더의 파일을 저장소에 업로드
4. 저장소 **Settings** → **Pages** → Source: **GitHub Actions**
5. `main` 브랜치에 푸시되면 자동 배포됩니다.

## 기술 스택

- HTML
- CSS
- 바닐라 JavaScript

## 파일 구조

```
├── index.html   # 메인 화면
├── styles.css   # 스타일
├── app.js       # 앱 로직 및 localStorage 저장
└── README.md
```

## 데이터 저장

모든 사용 내역은 **각 사용자의 브라우저**에만 저장됩니다. GitHub 서버에는 데이터가 올라가지 않으며, 기기·브라우저가 바뀌면 이전 데이터는 보이지 않습니다.
