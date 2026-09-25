import { buildUserPrompt, GROQ_MODEL, TEMPERATURE } from '../../src/logic/aiRequest';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BODY_BYTES = 200_000;

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  GROQ_API_KEY: string;
  RATE_LIMITER?: RateLimiter;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const error = (status: number, message: string) => json(status, { error: { message } });

function parseRequestBody(raw: string): { files: string[]; diff: string } | null {
  try {
    const body = JSON.parse(raw);
    const files = body?.files;
    const diff = body?.diff;
    if (!Array.isArray(files) || !files.every((f) => typeof f === 'string')) return null;
    if (typeof diff !== 'string' || !diff.trim()) return null;
    return { files, diff };
  } catch {
    return null;
  }
}

export async function handleRequest(
  request: Request,
  env: Env,
  systemPrompt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname !== '/v1/suggest') return error(404, 'Not found');
  if (request.method !== 'POST') return error(405, 'Method not allowed');

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return error(429, 'Too many requests');
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return error(413, 'Request body too large');

  const body = parseRequestBody(raw);
  if (!body) return error(400, 'Body must be { files: string[], diff: string }');

  const groqResponse = await fetchImpl(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(body.files, body.diff) },
      ],
      temperature: TEMPERATURE,
      response_format: { type: 'json_object' },
    }),
  });

  if (!groqResponse.ok) {
    // Groq 한도 초과는 CLI가 "공용 한도 초과" 안내를 띄울 수 있게 429 그대로 전달한다.
    // 그 밖의 오류 내용은 키·조직 정보가 섞일 수 있어 사용자에게 넘기지 않는다.
    console.error(`Groq request failed: ${groqResponse.status}`);
    return groqResponse.status === 429
      ? error(429, 'Shared quota exceeded')
      : error(502, 'Upstream AI request failed');
  }

  const completion = (await groqResponse.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return json(200, { content: completion.choices?.[0]?.message?.content ?? '' });
}
