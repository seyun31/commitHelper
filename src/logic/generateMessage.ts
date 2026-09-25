import simpleGit from 'simple-git';
import Groq from 'groq-sdk';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  buildUserPrompt,
  CommitMessage,
  GROQ_MODEL,
  parseAIContent,
  TEMPERATURE,
} from './aiRequest';
import { buildRuleBasedMessages, FileDiff } from './ruleBased';

export { CommitMessage, CommitType, GROQ_MODEL } from './aiRequest';
export { buildRuleBasedMessages, FileDiff } from './ruleBased';

// 공용 API 서버(server/). 사용자는 키 없이도 AI 추천을 받는다.
// COMMITHELPER_API_URL로 주소를 바꿀 수 있고, 'off'로 두면 diff를 외부 서버로 보내지 않는다.
export const DEFAULT_API_URL = 'https://commithelper-api.seyun31.workers.dev/v1/suggest';
const API_TIMEOUT_MS = 15_000;

let groqClient: Groq | null = null;

// GROQ_API_KEY가 없으면 클라이언트를 만들지 않고 공용 서버로 요청한다.
// 모듈 로드 시점에 생성하면 키가 없을 때 생성자 예외로 CLI가 폴백 전에 종료된다.
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) groqClient = new Groq({ apiKey });
  return groqClient;
}

function getApiUrl(): string {
  const configured = process.env.COMMITHELPER_API_URL;
  if (configured === 'off') return '';
  return configured || DEFAULT_API_URL;
}

// 시스템 프롬프트 로드
const SYSTEM_PROMPT = readFileSync(join(__dirname, '../prompts/system-prompt.txt'), 'utf-8');

// 규칙 기반이 diff를 읽는 최대 파일 수. 커밋 전체를 보고 대표 타입을 정하려면 5개로는 부족하다.
export const RULE_MAX_FILES = 20;

// 사용자 키로 Groq를 직접 호출한다
async function requestViaGroq(groq: Groq, files: string[], fullDiff: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(files, fullDiff) },
    ],
    temperature: TEMPERATURE,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0].message.content ?? '';
}

// 키가 없으면 공용 서버에 diff만 보낸다. 프롬프트와 모델은 서버가 정한다.
async function requestViaApi(apiUrl: string, files: string[], fullDiff: string): Promise<string> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, diff: fullDiff }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${body}`);
  return (JSON.parse(body) as { content?: string }).content ?? '';
}

// AI에게 추천 메시지를 받는다. 사용자 키가 있으면 Groq 직접, 없으면 공용 서버를 쓴다.
// 요청 오류 · 빈 응답 · JSON 파싱 실패면 예외를 던지고, 폴백 여부는 호출하는 쪽이 정한다.
export async function requestAIMessages(
  files: string[],
  fullDiff: string,
): Promise<CommitMessage[]> {
  const groq = getGroqClient();
  if (groq) return parseAIContent(await requestViaGroq(groq, files, fullDiff));

  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('GROQ_API_KEY is not set');
  return parseAIContent(await requestViaApi(apiUrl, files, fullDiff));
}

const MAX_REASON_LENGTH = 120;

export function describeFallbackReason(error: unknown): string {
  if (!process.env.GROQ_API_KEY && !getApiUrl()) {
    return '⚠️  GROQ_API_KEY가 없어 규칙 기반 추천을 사용합니다. (설정 방법은 README 참고)';
  }
  const raw = error instanceof Error ? error.message : String(error);
  if (!process.env.GROQ_API_KEY && raw.startsWith('429')) {
    return '⚠️  공용 서버 요청이 많아 규칙 기반 추천을 사용합니다. 개인 GROQ_API_KEY를 설정하면 공용 한도와 상관없이 쓸 수 있어요.';
  }
  // Groq SDK·공용 서버 오류는 '404 {"error":{"message":"..."}}' 형태라 안쪽 message만 꺼낸다.
  const reason = (raw.match(/"message"\s*:\s*"([^"]+)"/)?.[1] ?? raw).replace(/\s+/g, ' ').trim();
  const short =
    reason.length > MAX_REASON_LENGTH ? `${reason.slice(0, MAX_REASON_LENGTH)}…` : reason;
  return `⚠️  AI 추천에 실패해 규칙 기반 추천을 사용합니다: ${short}`;
}

export async function generateMessages(files: string[]): Promise<CommitMessage[]> {
  const git = simpleGit();

  // 전체 diff 가져오기
  const fullDiff = await git.diff(['--cached']);

  if (!fullDiff.trim()) {
    return [];
  }

  try {
    return await requestAIMessages(files, fullDiff);
  } catch (error) {
    // 조용히 넘어가면 모델 종료 같은 장애를 한참 뒤에야 알게 되므로 이유를 한 줄 남긴다.
    // stderr로 출력해서 추천 목록 프롬프트(stdout)와 섞이지 않게 한다.
    console.warn(describeFallbackReason(error));
  }

  // Fallback: API 실패 시 규칙 기반으로 기본 메시지 생성
  const fileDiffs: FileDiff[] = [];
  for (const file of files.slice(0, RULE_MAX_FILES)) {
    fileDiffs.push({ file, diff: await git.diff(['--cached', file]) });
  }

  return buildRuleBasedMessages(fileDiffs);
}
