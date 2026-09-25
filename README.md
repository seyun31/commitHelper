# 👾 Commit Helper

[![CI](https://github.com/seyun31/commitHelper/actions/workflows/ci.yml/badge.svg)](https://github.com/seyun31/commitHelper/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/v/@seyun31/commithelper)

> **AI 기반** Git commit message 자동 생성 CLI 도구

---

### 🎯 문제 정의

- 어떤 커밋 타입을 사용해야 할지 판단하기 위해 코드를 일일이 확인해야 하는 번거로움
- 팀에서 모두가 일관된 형식의 커밋 메시지를 작성하여 사용하기 어려움
- "파일명 수정" 같은 모호한 커밋 메시지 대신 구체적인 변경 내용이 필요함
- github, commit이 익숙하지 않은 개발자들이 쉽게 사용할 수 있도록 도와줌
  <br>

➡️ **CommitHelper**는 **AI**를 활용하여 git diff를 분석하고, 구체적이고 기술적인 커밋 메시지를 자동으로 생성합니다!

---

### 🚀 설치

```bash
# 전역 설치
npm install -g @seyun31/commithelper

# npx 사용 (권장)
npx @seyun31/commithelper

# 로컬 설치
npm install @seyun31/commithelper
```

---

### 🔑 AI 연결

**설정 없이 바로 AI 추천을 받을 수 있습니다.** 키가 없으면 CLI가 Commit Helper 공용 서버로 diff를 보내고, 서버가 Groq를 호출해 추천을 돌려줍니다.

공용 서버는 모든 사용자가 무료 한도를 나눠 씁니다. 자주 쓰거나 한도에 걸리면 개인 [Groq](https://console.groq.com/keys) API 키(무료)를 설정하세요. 키가 있으면 공용 서버를 거치지 않고 Groq를 직접 호출합니다.

```bash
# 터미널 환경 변수로 설정
export GROQ_API_KEY=your_api_key

# 또는 명령을 실행하는 프로젝트 루트의 .env 파일에 작성
GROQ_API_KEY=your_api_key
```

| 환경 변수              | 설명                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| `GROQ_API_KEY`         | 개인 Groq 키. 있으면 Groq를 직접 호출합니다.                                |
| `COMMITHELPER_API_URL` | 공용 서버 주소를 바꿉니다. `off`로 두면 diff를 외부 서버로 보내지 않습니다. |

> 🔒 공용 서버는 diff 앞 4000자와 파일 목록만 받아 Groq로 전달합니다. 서버 코드는 요청 내용을 저장하거나 로그로 남기지 않습니다(Groq의 데이터 처리는 [Groq 정책](https://console.groq.com/docs/your-data)을 따릅니다). 회사 코드처럼 외부로 보내면 안 되는 저장소에서는 `COMMITHELPER_API_URL=off`로 두거나 개인 키를 쓰세요.

---

### 🧭 추천 구조: AI 우선, 규칙 기반 폴백

```
git diff --cached
 │
 ├─▶ 개인 GROQ_API_KEY 있음 → Groq 직접 호출
 │
 ├─▶ 키 없음 → 공용 서버(server/)를 거쳐 Groq 호출
 │
 └─▶ 키 없음 + COMMITHELPER_API_URL=off → 규칙 기반 추천

Groq 호출 결과
 │
 ├─▶ 성공 → AI 추천 목록
 │
 └─▶ 실패 → 규칙 기반 추천 (buildRuleBasedMessages)
     요청 오류 · 한도 초과 · 빈 응답 · JSON 파싱 실패
```

규칙 기반 추천은 커밋 전체(최대 20개 파일)를 보고 대표 타입을 먼저 고른 뒤, 파일별 추천을 서로 다른 타입의 대안으로 붙입니다.

| 변경 모양 | 대표 타입 |
| --- | --- |
| 문서·설정 파일만 바뀜 | `etc` |
| 테스트 파일이 코드 파일보다 많음 | `test` |
| 코드가 삭제되기만 함 | `remove` |
| 새 코드 파일이 생김 | `feat` (기존 파일에서 더 많이 빠져나갔으면 `refactor`) |
| 기존 코드에 방어 로직(`?.`, `??`, `try/catch`, `if (!…)`) 추가 | `fix` |
| 기존 코드에 거의 추가만 함 | `feat` |

- 공용 서버는 IP당 분당 10회까지 요청할 수 있습니다.
- AI 추천에 실패하면 이유를 한 줄 보여 주고 규칙 기반 추천으로 넘어갑니다.
  ```
  ⚠️  AI 추천에 실패해 규칙 기반 추천을 사용합니다: <실패 이유>
  ```

---

### 💡 기본 사용법

1. 코드를 자유롭게 수정하고 추가합니다.

2. 변경 사항을 스테이지에 올립니다.

```bash
git add .
```

3. `commitHelper` 명령을 실행합니다.

```bash
npx commitHelper
```

4. **AI가 분석한 구체적인 커밋 메시지**를 확인하고 선택하거나, 직접 입력 후 최종 확인을 거쳐 커밋이 수행됩니다.
   **예시 1: AI 추천 메시지 선택**

```bash
$ git add .
$ npx commitHelper

? ✨ 추천 commit message를 선택하세요: (Use arrow keys)
> refactor: 프롬프트 엔지니어링으로 commit 타입 분류 정확도 개선
  refactor: Groq API 연동 및 에러 처리 로직 추가
  ✏️ 직접 입력

# 사용자가 화살표로 첫 항목 선택 후 Enter
✔ ✨ 추천 commit message를 선택하세요: refactor: 프롬프트 엔지니어링으로 commit 타입 분류 정확도 개선

? ✅ 최종 commit message로 "refactor: 프롬프트 엔지니어링으로 commit 타입 분류 정확도 개선" 을(를) 사용하시겠습니까? (Y/n) y

[main 123abcd] refactor: 프롬프트 엔지니어링으로 commit 타입 분류 정확도 개선
 2 files changed, 150 insertions(+), 30 deletions(-)
```

**예시 2: 직접 입력**

```bash
$ git add .
$ npx commitHelper

? ✨ 추천 commit message를 선택하세요: (Use arrow keys)
  feat: 사용자 인증 로직 추가
  fix: 로그인 오류 수정
> ✏️ 직접 입력

# 사용자가 직접 입력 옵션 선택 후 Enter
? ✏️ 직접 commit message를 입력하세요: docs: README에 API 설정 가이드 추가

? ✅ 최종 commit message로 "docs: README에 API 설정 가이드 추가" 을(를) 사용하시겠습니까? (Y/n) y

[main 456def0] docs: README에 API 설정 가이드 추가
 1 file changed, 25 insertions(+)
```

---

### 📖 커밋 타입 레퍼런스

AI가 분석하여 자동으로 분류하는 커밋 타입:

| 커밋 타입  | 설명                     | AI 분류 기준               |
| ---------- | ------------------------ | -------------------------- |
| `test`     | 테스트 파일 추가/수정    | _.test._, _.spec._ 파일    |
| `style`    | 코드 포맷팅, 세미콜론 등 | 로직 변경 없이 포맷만 변경 |
| `fix`      | 버그 수정                | 오류 수정, 예외 처리 개선  |
| `refactor` | 코드 리팩터링            | 기능 변경 없이 코드 재구성 |
| `feat`     | 새로운 기능 추가         | 완전히 새로운 기능 구현    |
| `remove`   | 코드/파일 삭제           | 파일이나 기능 제거         |
| `etc`      | 그 외 변경               | 문서, 설정 파일, 의존성 등 |

---

### 🛠️ 개발 & 품질 보증

- 빌드 환경

  - `TypeScript` 기반으로 개발되었으며, `npm run build`를 통해 `dist/` 디렉토리에 JavaScript로 트랜스파일됩니다.
  - CLI 실행을 위한 `bin`설정이 되어 있으며, 실제 배포 시 실행 파일이 `dist/bin/index.js`로 출력됩니다.

- Lint & Format

```bash
npm run lint # ESLint 검사
npm run format # Prettier 자동 포맷
```

- 테스트

```bash
npm test # Jest 유닛 테스트 실행
```

- CI/CD

  1️⃣ `npm ci` 의존성 설치

  2️⃣ `npm run lint` 코드 스타일 검사

  3️⃣ `npm run build` TypeScript build

  4️⃣ `npm test` Jest 유닛 테스트
