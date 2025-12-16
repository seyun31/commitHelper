import simpleGit from 'simple-git';
import Groq from 'groq-sdk';
import 'dotenv/config';

export type CommitType = 'Test' | 'Style' | 'Fix' | 'Refactor' | 'Feat' | 'Remove' | 'Etc';

export interface CommitMessage {
  type: CommitType;
  filename: string;
  action: '추가' | '수정' | '삭제';
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateMessages(files: string[]): Promise<CommitMessage[]> {
  const git = simpleGit();

  // 전체 diff 가져오기
  const fullDiff = await git.diff(['--cached']);

  if (!fullDiff.trim()) {
    return [];
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Groq 모델
      messages: [
        {
          role: 'system',
          content: `당신은 git commit 메시지를 생성하는 전문가입니다.
변경된 각 파일에 대해 적절한 commit 메시지를 추천해주세요.

type은 다음 중 하나를 선택하세요:
- Test: 테스트 파일 추가/수정
- Style: 코드 포맷팅, 세미콜론 추가 등 스타일 변경
- Fix: 버그 수정
- Refactor: 코드 리팩토링
- Feat: 새로운 기능 추가
- Remove: 파일/코드 삭제
- Etc: 기타 변경사항

action은 다음 중 하나를 선택하세요:
- 추가: 새로운 파일이나 기능이 추가된 경우
- 수정: 기존 파일이 변경된 경우
- 삭제: 파일이나 코드가 삭제된 경우

응답은 반드시 JSON 형식으로 해주세요. 각 파일당 1-2개의 commit 메시지를 추천해주세요:
{"messages": [{"type": "...", "filename": "...", "action": "..."}]}`,
        },
        {
          role: 'user',
          content: `변경된 파일 목록: ${files.join(', ')}\n\n전체 diff:\n${fullDiff.slice(0, 4000)}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content?.trim();
    if (response) {
      const parsed = JSON.parse(response);
      // Groq가 {messages: [...]} 형식으로 반환할 수도 있으므로 처리
      const messagesArray = Array.isArray(parsed) ? parsed : parsed.messages || [];
      return messagesArray.slice(0, 10); // 최대 10개로 제한
    }
  } catch (error) {
    console.error('Groq API 호출 실패:', error);
    console.log('기본 메시지로 fallback합니다.');
  }

  // Fallback: API 실패 시 기본 메시지 생성
  return files.slice(0, 5).map((file) => ({
    type: 'Etc' as CommitType,
    filename: file.split('/').pop() ?? file,
    action: '수정' as const,
  }));
}
