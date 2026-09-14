import simpleGit from 'simple-git';
import Groq from 'groq-sdk';
import { generateMessages } from '../src/logic/generateMessage';

jest.mock('simple-git');
jest.mock('groq-sdk');

describe('generateMessages', () => {
  const mockDiff = jest.fn();

  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue({ diff: mockDiff });
    mockDiff.mockReset();
    (Groq as unknown as jest.Mock).mockClear();
    delete process.env.GROQ_API_KEY;
  });

  it('falls back to rule-based messages without creating a Groq client when GROQ_API_KEY is missing', async () => {
    mockDiff
      .mockResolvedValueOnce('new file\n+++ b/feature.ts\n+ line1')
      .mockResolvedValueOnce('new file\n+++ b/feature.ts\n+ line1');

    const messages = await generateMessages(['feature.ts']);
    expect(Groq).not.toHaveBeenCalled();
    expect(messages[0]).toMatchObject({ type: 'feat' });
  });

  it('returns empty array when no staged changes', async () => {
    mockDiff.mockResolvedValue('');
    const messages = await generateMessages(['file.ts']);
    expect(messages).toEqual([]);
  });

  it('returns feat when new file with only additions', async () => {
    mockDiff
      .mockResolvedValueOnce('new file\n+++ b/file.ts\n+ line1\n+ line2')
      .mockResolvedValueOnce('new file\n+++ b/file.ts\n+ line1\n+ line2');

    const messages = await generateMessages(['file.ts']);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toMatchObject({
      type: 'feat',
      description: expect.stringContaining('file.ts'),
    });
  });

  it('returns remove when only deletions', async () => {
    mockDiff
      .mockResolvedValueOnce('--- a/old.ts\n- line1\n- line2')
      .mockResolvedValueOnce('--- a/old.ts\n- line1\n- line2');

    const messages = await generateMessages(['old.ts']);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toMatchObject({
      type: 'remove',
      description: expect.stringContaining('old.ts'),
    });
  });

  it('returns fix and refactor when mixed changes', async () => {
    mockDiff
      .mockResolvedValueOnce('+++ b/mixed.ts\n--- a/mixed.ts\n+ line1\n- line2')
      .mockResolvedValueOnce('+++ b/mixed.ts\n--- a/mixed.ts\n+ line1\n- line2');

    const messages = await generateMessages(['mixed.ts']);
    expect(messages.length).toBeGreaterThan(0);
    const types = messages.map((m) => m.type);
    expect(types).toContain('fix');
  });

  it('returns test for .test.ts files', async () => {
    mockDiff
      .mockResolvedValueOnce('+++ b/example.test.ts\n+ test')
      .mockResolvedValueOnce('+++ b/example.test.ts\n+ test');

    const messages = await generateMessages(['example.test.ts']);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toMatchObject({
      type: 'test',
      description: expect.stringContaining('example.test.ts'),
    });
  });
});
