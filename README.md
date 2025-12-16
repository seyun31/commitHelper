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

| 커밋 타입 | 설명 | AI 분류 기준 |
| --- | --- | --- |
| `test` | 테스트 파일 추가/수정 | *.test.*, *.spec.* 파일 |
| `style` | 코드 포맷팅, 세미콜론 등 | 로직 변경 없이 포맷만 변경 |
| `fix` | 버그 수정 | 오류 수정, 예외 처리 개선 |
| `refactor` | 코드 리팩터링 | 기능 변경 없이 코드 재구성 |
| `feat` | 새로운 기능 추가 | 완전히 새로운 기능 구현 |
| `remove` | 코드/파일 삭제 | 파일이나 기능 제거 |
| `etc` | 그 외 변경 | 문서, 설정 파일, 의존성 등 |

---

### 🛠️ 개발 & 품질 보증

- 빌드 환경
  - `TypeScript` 기반으로 개발되었으며, `npm run build1`를 통해 `dist/` 디렉토리에 JavaScript로 트랜스파일됩니다.
  - CLI 실행을 위한 `bin`설정이 되어 있으며, 실제 배포 시 실행 파일이 `dist/bin/cli.js`로 출력됩니다.

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
  
