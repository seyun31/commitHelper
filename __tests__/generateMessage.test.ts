import simpleGit from 'simple-git';
import Groq from 'groq-sdk';
import {
  buildRuleBasedMessages,
  describeFallbackReason,
  generateMessages,
  GROQ_MODEL,
  requestAIMessages,
} from '../src/logic/generateMessage';

jest.mock('simple-git');
jest.mock('groq-sdk');

const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const fetchMock = jest.fn();
global.fetch = fetchMock;

beforeEach(() => {
  warnSpy.mockClear();
  fetchMock.mockReset();
  process.env.COMMITHELPER_API_URL = 'off';
});

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
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('GROQ_API_KEY가 없어');
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

describe('generateMessages - Groq 실패 시 규칙 기반 폴백', () => {
  const mockDiff = jest.fn();
  const mockCreate = jest.fn();
  const newFileDiff = 'new file\n+++ b/feature.ts\n+ line1';

  const groqResponse = (content: string | null) => ({ choices: [{ message: { content } }] });

  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue({ diff: mockDiff });
    mockDiff.mockReset();
    mockDiff.mockResolvedValue(newFileDiff);
    mockCreate.mockReset();
    (Groq as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterAll(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('returns AI messages without reading per-file diffs when Groq succeeds', async () => {
    mockCreate.mockResolvedValue(
      groqResponse(JSON.stringify({ messages: [{ type: 'refactor', description: 'AI 추천' }] })),
    );

    const messages = await generateMessages(['feature.ts']);
    expect(messages).toEqual([{ type: 'refactor', description: 'AI 추천' }]);
    expect(mockDiff).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('accepts a bare JSON array response', async () => {
    mockCreate.mockResolvedValue(
      groqResponse(JSON.stringify([{ type: 'fix', description: 'AI 추천' }])),
    );

    const messages = await generateMessages(['feature.ts']);
    expect(messages).toEqual([{ type: 'fix', description: 'AI 추천' }]);
  });

  it.each([
    ['요청 오류', () => mockCreate.mockRejectedValue(new Error('429 Too Many Requests'))],
    ['빈 응답', () => mockCreate.mockResolvedValue(groqResponse(null))],
    ['공백만 있는 응답', () => mockCreate.mockResolvedValue(groqResponse('   '))],
    ['JSON 파싱 실패', () => mockCreate.mockResolvedValue(groqResponse('not json'))],
    ['빈 messages 배열', () => mockCreate.mockResolvedValue(groqResponse('{"messages": []}'))],
  ])('falls back to rule-based messages on %s', async (_, arrange) => {
    arrange();

    const messages = await generateMessages(['feature.ts']);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('AI 추천에 실패해 규칙 기반 추천을 사용합니다');
    expect(messages).toEqual([{ type: 'feat', description: 'feature.ts 추가' }]);
  });
});

describe('generateMessages - 키가 없으면 공용 서버 사용', () => {
  const mockDiff = jest.fn();
  const API_URL = 'https://proxy.test/v1/suggest';

  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue({ diff: mockDiff });
    mockDiff.mockReset();
    mockDiff.mockResolvedValue('new file\n+++ b/feature.ts\n+ line1');
    (Groq as unknown as jest.Mock).mockClear();
    delete process.env.GROQ_API_KEY;
    process.env.COMMITHELPER_API_URL = API_URL;
  });

  it('sends only files and diff to the shared server and parses its content', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ content: '{"messages":[{"type":"feat","description":"서버 추천"}]}' }),
      ),
    );

    const messages = await generateMessages(['feature.ts']);
    expect(messages).toEqual([{ type: 'feat', description: '서버 추천' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(API_URL);
    expect(Object.keys(JSON.parse(init.body)).sort()).toEqual(['diff', 'files']);
    expect(Groq).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('explains the shared quota and falls back when the server returns 429', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"error":{"message":"Too many requests"}}', { status: 429 }),
    );

    const messages = await generateMessages(['feature.ts']);
    expect(messages).toEqual([{ type: 'feat', description: 'feature.ts 추가' }]);
    expect(warnSpy.mock.calls[0][0]).toContain('공용 서버 요청이 많아');
  });

  it('falls back when the shared server is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const messages = await generateMessages(['feature.ts']);
    expect(messages).toEqual([{ type: 'feat', description: 'feature.ts 추가' }]);
    expect(warnSpy.mock.calls[0][0]).toContain('AI 추천에 실패해');
  });

  it('does not contact the shared server when COMMITHELPER_API_URL is off', async () => {
    process.env.COMMITHELPER_API_URL = 'off';

    await generateMessages(['feature.ts']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('describeFallbackReason', () => {
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('extracts the inner message from a Groq SDK error', () => {
    process.env.GROQ_API_KEY = 'test-key';
    // 지금 쓰는 모델이 종료됐을 때 Groq가 돌려주는 404 오류 형태
    const error = new Error(
      `404 {"error":{"message":"The model \`${GROQ_MODEL}\` does not exist or you do not have access to it.","type":"invalid_request_error"}}`,
    );
    expect(describeFallbackReason(error)).toBe(
      `⚠️  AI 추천에 실패해 규칙 기반 추천을 사용합니다: The model \`${GROQ_MODEL}\` does not exist or you do not have access to it.`,
    );
  });

  it('keeps the warning to one short line', () => {
    process.env.GROQ_API_KEY = 'test-key';
    const warning = describeFallbackReason(new Error(`line1\n${'x'.repeat(500)}`));
    expect(warning).not.toContain('\n');
    expect(warning.length).toBeLessThan(200);
  });
});

describe('requestAIMessages', () => {
  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('throws instead of silently falling back so callers can tell AI failures apart', async () => {
    await expect(requestAIMessages(['a.ts'], 'diff')).rejects.toThrow('GROQ_API_KEY is not set');
  });
});

describe('buildRuleBasedMessages', () => {
  it('skips files with empty diffs and keeps per-file order', () => {
    const messages = buildRuleBasedMessages([
      { file: 'src/empty.ts', diff: '' },
      { file: 'src/a.spec.ts', diff: '+ it()' },
      { file: 'docs/old.md', diff: '- line' },
    ]);
    expect(messages.map((m) => m.type)).toEqual(['test', 'remove']);
  });
});
