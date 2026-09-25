// API 없이 diff만 보고 커밋 타입을 고르는 규칙 기반 추천.
//
// 첫 번째 추천은 커밋 전체를 보고 정한 대표 타입이고, 뒤에는 파일별 추천을 대안으로 붙인다.
// 예전에는 파일마다 따로 판정해서 알파벳 순서상 첫 파일이 첫 추천이 됐고,
// 추가·삭제가 섞인 파일은 모두 fix로 판정해서 추천이 fix로 쏠렸다 (eval 기준 30개 중 23개).
import { CommitMessage, CommitType } from './aiRequest';

export interface FileDiff {
  file: string;
  diff: string;
}

type FileKind = 'test' | 'docs' | 'config' | 'code';

interface FileStat {
  file: string;
  name: string;
  kind: FileKind;
  added: string[];
  removed: string[];
  isNew: boolean;
  isDeleted: boolean;
}

const MAX_MESSAGES = 5;

// 추가·삭제가 섞인 기존 코드 수정의 기본 타입
const DEFAULT_MODIFIED_TYPE: CommitType = 'fix';

const TEST_PATH = /(^|\/)(__tests?__|tests?|e2e)\/|\.(test|spec)\.[a-z]+$/i;
const DOCS_PATH = /\.(md|mdx|mdc)$/i;
const CONFIG_PATH =
  /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig[^/]*\.json)$|(^|\/)\.[^/]+$|\.config\.[a-z]+$|\.ya?ml$|(^|\/)\.github\//i;

// 기존 코드에 방어 로직을 덧붙이는 모양 (옵셔널 체이닝, 기본값, 예외 처리, 빈 값 검사)
const FIX_PATTERN =
  /\?\.|\?\?|\bcatch\b|\btry\s*\{|if\s*\(\s*!|[!=]==?\s*(null|undefined)\b|typeof\s/;

function classifyFile(file: string): FileKind {
  if (TEST_PATH.test(file)) return 'test';
  if (DOCS_PATH.test(file)) return 'docs';
  if (CONFIG_PATH.test(file)) return 'config';
  return 'code';
}

function toStat({ file, diff }: FileDiff): FileStat {
  const lines = diff.split('\n');
  return {
    file,
    name: file.split('/').pop() ?? file,
    kind: classifyFile(file),
    added: lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')),
    removed: lines.filter((line) => line.startsWith('-') && !line.startsWith('---')),
    isNew: diff.includes('new file'),
    isDeleted: diff.includes('deleted file'),
  };
}

const sum = (stats: FileStat[], pick: (s: FileStat) => string[]) =>
  stats.reduce((total, s) => total + pick(s).length, 0);

// 변경량이 가장 큰 파일 이름 + 나머지 파일 수
function describeTarget(stats: FileStat[]): string {
  const main = [...stats].sort(
    (a, b) => b.added.length + b.removed.length - (a.added.length + a.removed.length),
  )[0];
  return stats.length > 1 ? `${main.name} 외 ${stats.length - 1}개 파일` : main.name;
}

// 커밋 전체를 보고 대표 타입을 하나 고른다
function decideCommitMessage(stats: FileStat[]): CommitMessage {
  const tests = stats.filter((s) => s.kind === 'test');
  const code = stats.filter((s) => s.kind === 'code');
  const docs = stats.filter((s) => s.kind === 'docs');

  // 1. 문서·설정만 바뀌었으면 etc
  if (tests.length === 0 && code.length === 0) {
    return docs.length > 0
      ? { type: 'etc', description: `${describeTarget(docs)} 문서 수정` }
      : { type: 'etc', description: `${describeTarget(stats)} 설정 변경` };
  }

  // 2. 코드보다 테스트 파일이 많으면 test (같으면 코드 쪽 판정을 따른다)
  if (tests.length > code.length) {
    const verb = tests.some((s) => s.isNew) ? '추가' : '수정';
    return { type: 'test', description: `${describeTarget(tests)} 테스트 ${verb}` };
  }

  const added = sum(code, (s) => s.added);
  const removed = sum(code, (s) => s.removed);

  // 이미지 같은 바이너리만 바뀌어서 텍스트 변경이 없으면 etc
  if (added === 0 && removed === 0 && sum(tests, (s) => s.added) === 0) {
    return { type: 'etc', description: `${describeTarget(code)} 리소스 변경` };
  }

  // 3. 코드가 지워지기만 했으면 remove
  if (added === 0 && removed > 0) {
    return { type: 'remove', description: `${describeTarget(code)} 제거` };
  }

  // 4. 새 코드 파일이 생겼으면 feat. 단, 기존 파일에서 더 많이 빠져나갔으면 코드를 옮겨 나눈 refactor
  const newFiles = code.filter((s) => s.isNew);
  if (newFiles.length > 0) {
    const modified = code.filter((s) => !s.isNew && !s.isDeleted);
    const movedOut = sum(modified, (s) => s.removed) - sum(modified, (s) => s.added);
    return movedOut >= 10
      ? { type: 'refactor', description: `${describeTarget(code)} 구조 분리` }
      : { type: 'feat', description: `${describeTarget(newFiles)} 추가` };
  }

  // 5. 기존 파일 수정: 방어 로직이 추가됐으면 fix, 거의 추가만 했으면 feat, 나머지는 기본값
  if (code.some((s) => s.added.some((line) => FIX_PATTERN.test(line)))) {
    return { type: 'fix', description: `${describeTarget(code)} 오류 수정` };
  }
  if (added >= removed * 3 && added - removed >= 10) {
    return { type: 'feat', description: `${describeTarget(code)} 기능 추가` };
  }
  return { type: DEFAULT_MODIFIED_TYPE, description: `${describeTarget(code)} 수정` };
}

// 파일 하나만 보고 고르는 추천. 대표 타입 뒤에 대안으로 붙인다.
function perFileMessages(stat: FileStat): CommitMessage[] {
  const { name, added, removed, isNew } = stat;
  if (stat.kind === 'test') {
    return [{ type: 'test', description: `${name} 테스트 ${added.length > 0 ? '추가' : '수정'}` }];
  }
  if (added.length === 0 && removed.length > 0)
    return [{ type: 'remove', description: `${name} 제거` }];
  if (removed.length === 0 && added.length > 0 && isNew) {
    return [{ type: 'feat', description: `${name} 기능 추가` }];
  }
  if (added.length > 0 && removed.length > 0) {
    return [
      { type: 'fix', description: `${name} 버그 수정` },
      { type: 'refactor', description: `${name} 리팩토링` },
    ];
  }
  if (added.length > 0) return [{ type: 'feat', description: `${name}에 기능 추가` }];
  return [{ type: 'etc', description: `${name} 수정` }];
}

export function buildRuleBasedMessages(fileDiffs: FileDiff[]): CommitMessage[] {
  const stats = fileDiffs.filter(({ diff }) => diff.trim()).map(toStat);
  if (stats.length === 0) return [];

  const messages = [decideCommitMessage(stats)];
  const seenTypes = new Set<string>([messages[0].type]);
  for (const message of stats.flatMap(perFileMessages)) {
    if (messages.length >= MAX_MESSAGES) break;
    // 같은 타입은 한 번만 보여서, 목록이 서로 다른 대안이 되게 한다
    if (seenTypes.has(message.type)) continue;
    seenTypes.add(message.type);
    messages.push(message);
  }
  return messages;
}
