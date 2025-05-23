# 👾 Commit Helper
> Git commit message를 자동으로 추천해주는 CLI 도구

---

### 🎯 문제 정의
  
- 어떤 커밋 타입을 사용해야 할지 판단하기 위해 코드를 일일이 확인해야 하는 번거로움
- 팀에서 모두가 일관된 형식의 커밋 메시지 작성를 작성하여 사용하기에 어려움
- github, commit이 익숙하지 않은 개발자들이 쉽게 사용할 수 있도록 도와줌
<br>

➡️ **CommitHelper**는 스테이징된 변경 사항을 분석하여 적절한 커밋 타입과 메시지를 자동으로 추천해드립니다!

---

### 🚀 설치

- npx 사용
```bash
npx commitHepler
```

---

### 💡 기본 사용법

1. 코드를 자유롭게 수정하고 추가합니다.
<br>

2. 변경 사항을 스테이지에 올립니다.
```bash
git add .
```
<br>

3. `commitHelper` 명령을 실행합니다.
```bash
npx commitHepler
```
<br>

4. 추천 커밋 메시지 목록에서 원하는 항목을 선택하거나, 직접 입력 후 최종 확인을 거쳐 커밋이 수행됩니다.
- case1 : 추천 메시지 선택
```bash
$ git add .
$ npx commitHelper

? ✨ 추천 commit message를 선택하세요: (Use arrow keys)
> ✨ Feat: login.ts 추가
  ✨ Fix: auth.ts 수정
  ✏️ 직접 입력

# 사용자가 화살표로 첫 항목 선택 후 Enter
✔ ✨ 추천 commit message를 선택하세요: ✨ Feat: login.ts 추가

? ✅ 최종 commit message로 "Feat: login.ts 추가" 을(를) 사용하시겠습니까? (Y/n) y

[master 123abcd] Feat: login.ts 추가
 1 file changed, 30 insertions(+)
```
<br>

- case2 : (사용자) 직접 입력
```bash
$ git add .
$ npx commitHelper

? ✨ 추천 commit message를 선택하세요: (Use arrow keys)
  ✨ Feat: login.ts 추가
  ✨ Fix: auth.ts 수정
> ✏️ 직접 입력

# 사용자가 직접 입력 옵션 선택 후 Enter
? ✏️ 직접 commit message를 입력하세요: Added user validation logic

? ✅ 최종 commit message로 "Added user validation logic" 을(를) 사용하시겠습니까? (Y/n) y

[master 456def0] Added user validation logic
 1 file changed, 10 insertions(+)
```

---

### 📖 커맨드 레퍼런스
- 다음과 같은 타입을 기본 커밋 타입으로 지원합니다.

| 커밋 타입 | 설명 | 예시 |
| --- | --- | --- |
| Test | 테스트 파일 추가/수정 | Test: foo.test.ts 추가 |
| Style | 코드 포맷팅 · 세미콜론 등 | Style: formatter.ts 수정 |
| Fix | 버그 수정 | Fix: auth.ts 수정 |
| Refactor | 코드 리팩터링 | Refactor: apiClient.ts 수정 |
| Feat | 새로운 기능 추가 | Feat: login.ts 추가 |
| Remove | 코드 · 파일 삭제 | Remove: oldUtils.ts 삭제 |
| Etc | 그 외 변경 | Etc: docs.md 수정 |

- 만약 사용자가 원하는 commit message가 없을 경우, 직접 수정할 수 있는 기능을 추가하였습니다.
- 추천 받은 commit message를 선택하여도 마지막에 수정이 가능하도록 기능을 추가하였습니다.
- commit type이나 commit message를 상황에 맞게 수정하여 사용할 수 있습니다.

---
