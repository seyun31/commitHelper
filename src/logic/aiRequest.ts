// CLI와 공용 API 서버(server/)가 함께 쓰는 AI 요청 규칙.
// 서버는 Cloudflare Workers에서 돌기 때문에 이 파일은 Node 전용 모듈(fs, simple-git 등)을 불러오면 안 된다.

export type CommitType = 'test' | 'style' | 'fix' | 'refactor' | 'feat' | 'remove' | 'etc';

export interface CommitMessage {
  type: CommitType;
  description: string;
}

export const GROQ_MODEL = 'openai/gpt-oss-120b';
export const TEMPERATURE = 0.3;
export const MAX_DIFF_CHARS = 4000;
export const MAX_FILES = 100;

export function buildUserPrompt(files: string[], fullDiff: string): string {
  return `변경된 파일 목록: ${files.slice(0, MAX_FILES).join(', ')}\n\n전체 diff:\n${fullDiff.slice(0, MAX_DIFF_CHARS)}`;
}

export function parseAIContent(content: string | null | undefined): CommitMessage[] {
  const response = content?.trim();
  if (!response) throw new Error('AI returned an empty response');

  const parsed = JSON.parse(response);
  const messagesArray: CommitMessage[] = Array.isArray(parsed) ? parsed : parsed.messages || [];
  if (messagesArray.length === 0) throw new Error('AI returned no messages');

  return messagesArray.slice(0, 5);
}
