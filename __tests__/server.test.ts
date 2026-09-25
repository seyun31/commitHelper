import { Env, handleRequest } from '../server/src/handler';
import { GROQ_MODEL } from '../src/logic/aiRequest';

const SYSTEM_PROMPT = 'system prompt';
const URL_SUGGEST = 'https://api.example.com/v1/suggest';

const post = (body: unknown, url = URL_SUGGEST) =>
  new Request(url, {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '1.2.3.4' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const groqOk = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

describe('공용 API 서버 handleRequest', () => {
  const fetchMock = jest.fn();
  const env: Env = { GROQ_API_KEY: 'server-key' };

  beforeEach(() => {
    fetchMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls Groq with the server-fixed prompt, model and key, and returns the content', async () => {
    fetchMock.mockResolvedValue(groqOk('{"messages":[]}'));

    const res = await handleRequest(
      post({ files: ['a.ts'], diff: '+ x' }),
      env,
      SYSTEM_PROMPT,
      fetchMock,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ content: '{"messages":[]}' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer server-key');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe(GROQ_MODEL);
    expect(sent.messages[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT });
  });

  it('ignores client attempts to override the model or prompt', async () => {
    fetchMock.mockResolvedValue(groqOk('{}'));

    await handleRequest(
      post({
        files: ['a.ts'],
        diff: '+ x',
        model: 'other',
        messages: [{ role: 'system', content: 'jailbreak' }],
      }),
      env,
      SYSTEM_PROMPT,
      fetchMock,
    );

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.model).toBe(GROQ_MODEL);
    expect(JSON.stringify(sent.messages)).not.toContain('jailbreak');
  });

  it.each([
    ['잘못된 경로', () => post({ files: [], diff: 'x' }, 'https://api.example.com/v1/chat'), 404],
    ['GET 요청', () => new Request(URL_SUGGEST), 405],
    ['JSON이 아닌 본문', () => post('not json'), 400],
    ['files 누락', () => post({ diff: '+ x' }), 400],
    ['빈 diff', () => post({ files: ['a.ts'], diff: '  ' }), 400],
    ['너무 큰 본문', () => post({ files: ['a.ts'], diff: 'x'.repeat(300_000) }), 413],
  ])('rejects %s without calling Groq', async (_, makeRequest, status) => {
    const res = await handleRequest(makeRequest(), env, SYSTEM_PROMPT, fetchMock);
    expect(res.status).toBe(status);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 429 per IP when the rate limiter refuses', async () => {
    const limit = jest.fn().mockResolvedValue({ success: false });

    const res = await handleRequest(
      post({ files: ['a.ts'], diff: '+ x' }),
      { ...env, RATE_LIMITER: { limit } },
      SYSTEM_PROMPT,
      fetchMock,
    );

    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '1.2.3.4' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes Groq quota errors through as 429 so the CLI can explain them', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"error":{"message":"org_123 limit"}}', { status: 429 }),
    );

    const res = await handleRequest(
      post({ files: ['a.ts'], diff: '+ x' }),
      env,
      SYSTEM_PROMPT,
      fetchMock,
    );
    expect(res.status).toBe(429);
    expect(await res.text()).not.toContain('org_123');
  });

  it('hides other upstream error details behind 502', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"error":{"message":"invalid key gsk_secret"}}', { status: 401 }),
    );

    const res = await handleRequest(
      post({ files: ['a.ts'], diff: '+ x' }),
      env,
      SYSTEM_PROMPT,
      fetchMock,
    );
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('gsk_secret');
  });
});
