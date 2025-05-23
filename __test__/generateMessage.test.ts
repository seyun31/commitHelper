import simpleGit from 'simple-git';
import { generateMessages } from '../src/logic/generateMessage';

describe('generateMessages', () => {
  const mockDiff = jest.fn();
  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue({ diff: mockDiff });
  });

  it('returns feat when only additions', async () => {
    mockDiff.mockResolvedValue('+ line1\n+ line2');
    const messages = await generateMessages(['file.ts']);
    expect(messages).toEqual(['Feat: file.ts 추가']);
  });

  it('returns remove when only deletions', async () => {
    mockDiff.mockResolvedValue('- line1\n- line2');
    const messages = await generateMessages(['old.ts']);
    expect(messages).toEqual(['Remove: old.ts 삭제']);
  });

  it('returns refactor when mixed changes', async () => {
    mockDiff.mockResolvedValue('+ line1\n- line2');
    const messages = await generateMessages(['mixed.ts']);
    expect(messages).toEqual(['Refactor: mixed.ts 수정']);
  });
});