# 카드 사용 내역 앱

4개 카드(NH농협, 롯데, 우리, 삼성)의 사용 내역을 기록하고, 카드별·월별 사용 금액을 확인하는 웹 앱입니다.

**Supabase**를 사용해 부부가 같은 데이터를 실시간으로 공유할 수 있습니다.

## 기능

- 카드 선택, 사용 금액, 사용 일자, 사용 내역 입력
- 항목 삭제
- 카드별 사용 총액 자동 표시
- 월별 카드별 사용 금액 합산
- 이메일 로그인 / 회원가입
- 가계(부부) 공유 — 초대 코드로 배우자 참여
- Supabase 클라우드 저장 + 실시간 동기화
- 기존 브라우저 데이터(localStorage) 자동 이전

---

## Supabase 설정 (최초 1회)

### 1단계: Supabase 프로젝트 만들기

1. [https://supabase.com](https://supabase.com) 에서 회원가입 / 로그인
2. **New project** 클릭
3. 프로젝트 이름 입력 (예: `card-expense`)
4. Database Password 설정 (잘 보관)
5. Region: **Northeast Asia (Seoul)** 권장
6. **Create new project** → 프로젝트 생성 완료까지 1~2분 대기

### 2단계: 데이터베이스 테이블 만들기

1. Supabase 대시보드 → **SQL Editor**
2. **New query** 클릭
3. 이 저장소의 `supabase/schema.sql` 파일 내용을 **전체 복사**하여 붙여넣기
4. **Run** 클릭 → Success 확인

### 3단계: 이메일 로그인 활성화

1. **Authentication** → **Providers**
2. **Email** 이 Enabled 인지 확인 (기본값: 켜짐)
3. (선택) **Authentication** → **Settings** → **Confirm email** 을 끄면 이메일 확인 없이 바로 로그인 가능

### 4단계: API 키를 앱에 연결

1. **Project Settings** → **API**
2. **Project URL** 과 **anon public** 키 복사
3. 프로젝트의 `config.js` 파일을 열고 값 입력:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

4. 저장 후 GitHub에 푸시 (GitHub Pages 배포 시)

> anon key는 클라이언트에 노출되어도 됩니다. Row Level Security(RLS)로 데이터를 보호합니다.

---

## 부부 함께 쓰는 방법

1. **먼저 가입하는 사람 (예: 남편)**
   - 회원가입 → 로그인
   - **새 가계 만들기** 선택
   - 화면 상단에 표시되는 **6자리 초대 코드**를 배우자에게 전달

2. **나중에 가입하는 사람 (예: 아내)**
   - 회원가입 → 로그인
   - **초대 코드로 참여** 에 코드 입력
   - 같은 사용 내역이 양쪽에 표시됨

3. 한쪽에서 입력·삭제하면 다른 쪽에도 **실시간 반영**

---

## 로컬에서 실행

1. `config.js`에 Supabase 설정 입력
2. `index.html` 파일을 브라우저로 엽니다.

---

## GitHub Pages로 배포

#### 자동 배포 (PowerShell)

```powershell
gh auth login --hostname github.com --git-protocol https --web
cd "프로젝트 폴더"
.\deploy.ps1
```

배포 주소: `https://[GitHub아이디].github.io/card-expense-app/`

> `config.js`가 커밋·푸시되어 있어야 배포된 앱에서 Supabase에 연결됩니다.

---

## 기술 스택

- HTML / CSS / 바닐라 JavaScript
- [Supabase](https://supabase.com) (Auth, PostgreSQL, Realtime)

## 파일 구조

```
├── index.html          # 메인 화면 + 로그인 UI
├── styles.css          # 스타일
├── app.js              # 앱 로직 + Supabase 연동
├── config.js           # Supabase URL / Anon Key
├── config.example.js   # 설정 예시
├── supabase/
│   └── schema.sql      # DB 테이블 및 RLS 설정
└── README.md
```

## 데이터 저장

사용 내역은 **Supabase 클라우드 DB**에 저장됩니다. 같은 가계(초대 코드)에 속한 부부만 데이터를 볼 수 있습니다.
