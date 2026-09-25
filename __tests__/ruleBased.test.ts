import { buildRuleBasedMessages } from '../src/logic/ruleBased';

const added = (n: number, text = 'line') => Array.from({ length: n }, () => `+${text}`).join('\n');
const removed = (n: number, text = 'line') =>
  Array.from({ length: n }, () => `-${text}`).join('\n');
const newFile = (body: string) => `new file mode 100644\n${body}`;
const top = (fileDiffs: { file: string; diff: string }[]) => buildRuleBasedMessages(fileDiffs)[0];

describe('buildRuleBasedMessages - 커밋 전체 기준 대표 타입', () => {
  it('returns nothing when every diff is empty', () => {
    expect(buildRuleBasedMessages([{ file: 'a.ts', diff: '' }])).toEqual([]);
  });

  it('classifies docs-only changes as etc instead of fix', () => {
    expect(top([{ file: 'README.md', diff: `${added(3)}\n${removed(2)}` }])).toEqual({
      type: 'etc',
      description: 'README.md 문서 수정',
    });
  });

  it('classifies config-only changes as etc', () => {
    expect(
      top([
        { file: 'package.json', diff: `${added(1)}\n${removed(1)}` },
        { file: 'pnpm-lock.yaml', diff: added(40) },
      ]).type,
    ).toBe('etc');
  });

  it('picks test when test files outnumber code files, regardless of file order', () => {
    expect(
      top([
        { file: 'src/app/page.tsx', diff: `${added(1)}\n${removed(1)}` },
        { file: 'src/test/e2e/home.spec.ts', diff: newFile(added(20)) },
        { file: 'src/test/unit/page.test.tsx', diff: newFile(added(20)) },
      ]),
    ).toEqual({ type: 'test', description: 'home.spec.ts 외 1개 파일 테스트 추가' });
  });

  it('follows the code files when tests and code are tied', () => {
    expect(
      top([
        { file: 'src/a.test.ts', diff: `${added(1)}\n${removed(1)}` },
        { file: 'src/a.ts', diff: `${added(2, 'x?.y')}\n${removed(1)}` },
      ]).type,
    ).toBe('fix');
  });

  it('classifies binary-only changes (no text diff) as etc', () => {
    expect(
      top([{ file: 'public/icon.png', diff: 'Binary files a/icon.png and b/icon.png differ' }])
        .type,
    ).toBe('etc');
  });

  it('classifies deletions only as remove', () => {
    expect(
      top([{ file: 'src/old.ts', diff: `deleted file mode 100644\n${removed(10)}` }]).type,
    ).toBe('remove');
  });

  it('classifies new code files as feat', () => {
    expect(
      top([
        { file: 'src/Checkbox.tsx', diff: newFile(added(30)) },
        { file: 'src/index.ts', diff: `${added(1)}\n${removed(1)}` },
      ]),
    ).toEqual({ type: 'feat', description: 'Checkbox.tsx 추가' });
  });

  it('classifies new files as refactor when more code moves out of existing files', () => {
    expect(
      top([
        { file: 'src/page.tsx', diff: `${added(3)}\n${removed(40)}` },
        { file: 'src/Section.tsx', diff: newFile(added(30)) },
      ]).type,
    ).toBe('refactor');
  });

  it('classifies added guard logic in existing code as fix', () => {
    expect(
      top([{ file: 'src/a.ts', diff: `${added(2, '  if (!user) return;')}\n${removed(1)}` }]).type,
    ).toBe('fix');
  });

  it('classifies mostly-additive changes to existing code as feat', () => {
    expect(
      top([{ file: 'src/a.ts', diff: `${added(20, 'const x = 1;')}\n${removed(2)}` }]).type,
    ).toBe('feat');
  });

  it('keeps per-file suggestions as alternatives with distinct types, up to 5', () => {
    const messages = buildRuleBasedMessages([
      { file: 'src/a.ts', diff: `${added(2)}\n${removed(2)}` },
      { file: 'src/b.ts', diff: `${added(2)}\n${removed(2)}` },
      { file: 'src/c.ts', diff: newFile(added(5)) },
    ]);
    const types = messages.map((m) => m.type);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toEqual(expect.arrayContaining(['fix', 'refactor']));
    expect(messages.length).toBeLessThanOrEqual(5);
  });
});
