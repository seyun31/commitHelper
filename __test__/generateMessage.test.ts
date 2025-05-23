import simpleGit from 'simple-git';
import { generateMessages, CommitMessage } from '../src/logic/generateMessage';

jest.mock('simple-git');

describe('generateMessages', () => {
  const mockDiff = jest.fn();
  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue({ diff: mockDiff });
    mockDiff.mockReset();
  });

  it('returns feat when only additions', async () => {
    mockDiff.mockResolvedValue('+ line1\n+ line2');
    const messages: CommitMessage[] = await generateMessages(['file.ts']);
    expect(messages).toEqual([
      { type: 'Feat', filename: 'file.ts', action: '추가' }
    ]);
  });

  it('returns remove when only deletions', async () => {
    mockDiff.mockResolvedValue('- line1\n- line2');
    const messages: CommitMessage[] = await generateMessages(['old.ts']);
    expect(messages).toEqual([
      { type: 'Remove', filename: 'old.ts', action: '삭제' }
    ]);
  });

  it('returns fix and refactor when mixed changes', async () => {
    mockDiff.mockResolvedValue('+ line1\n- line2');
    const messages: CommitMessage[] = await generateMessages(['mixed.ts']);
    expect(messages).toEqual([
      { type: 'Fix', filename: 'mixed.ts', action: '수정' },
      { type: 'Refactor', filename: 'mixed.ts', action: '수정' }
    ]);
  });

  it('returns test for .test.ts files', async () => {
    mockDiff.mockResolvedValue('+');
    const messages: CommitMessage[] = await generateMessages(['example.test.ts']);
    expect(messages).toEqual([
      { type: 'Test', filename: 'example.test.ts', action: '추가' }
    ]);
  });

  it('returns style for formatting-only changes', async () => {
    mockDiff.mockResolvedValue('+ ;\n- ;');
    const messages: CommitMessage[] = await generateMessages(['format.ts']);
    expect(messages).toEqual([
      { type: 'Style', filename: 'format.ts', action: '수정' }
    ]);
  });
});
