"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMessages = generateMessages;
const simple_git_1 = __importDefault(require("simple-git"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
require("dotenv/config");
const groq = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY,
});
async function generateMessages(files) {
    const git = (0, simple_git_1.default)();
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
                    content: `You are an expert at analyzing git diffs and generating meaningful commit messages.

Analyze the provided git diff and generate appropriate commit messages for each file.

**Classification Rules:**

1. **test**: Test files or test-related changes
   - Files with .test., .spec., __tests__ in path
   - Adding/modifying test cases

2. **style**: Code formatting or style changes only
   - Whitespace, indentation, semicolons
   - Import reordering without logic changes
   - No functional changes

3. **fix**: Bug fixes
   - Fixing incorrect behavior
   - Error handling improvements
   - Patching issues

4. **refactor**: Code restructuring without changing behavior
   - Renaming variables/functions
   - Extracting functions
   - Code organization improvements

5. **feat**: New features or functionality
   - Adding new functions/classes
   - Implementing new capabilities
   - Extending existing features significantly

6. **remove**: Deletions
   - Removing files, functions, or features
   - Deprecating code

7. **etc**: Other changes
   - Documentation
   - Configuration files
   - Build scripts
   - Dependencies

**Action Selection:**
- "추가": New files or major additions
- "수정": Modifying existing code
- "삭제": Removing code or files

**Response Format:**
Return a JSON object with this exact structure:
{"messages": [{"type": "test|style|fix|refactor|feat|remove|etc", "filename": "exact filename", "action": "추가|수정|삭제"}]}

**Important:**
- Generate 1-2 commit message options per file based on the most likely intent
- Choose the most specific type that fits (prefer feat/fix/refactor over etc)
- Base your decision on actual code changes, not just file names`,
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
            if (messagesArray.length > 0) {
                return messagesArray.slice(0, 5);
            }
        }
    }
    catch (error) {
        console.error('\n⚠️  Groq API 호출 실패:');
        if (error instanceof Error) {
            console.error('   Error:', error.message);
            if (error.stack) {
                console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
            }
        }
        else {
            console.error('   Unknown error:', error);
        }
        console.log('\n   기본 메시지로 fallback합니다...\n');
    }
    // Fallback: API 실패 시 규칙 기반으로 기본 메시지 생성
    const fallbackMessages = [];
    for (const file of files.slice(0, 5)) {
        const lowerFile = file.toLowerCase();
        const filename = file.split('/').pop() ?? file;
        const diff = await git.diff(['--cached', file]);
        if (!diff.trim())
            continue;
        const addedLines = diff
            .split('\n')
            .filter((line) => line.startsWith('+') && !line.startsWith('+++'));
        const removedLines = diff
            .split('\n')
            .filter((line) => line.startsWith('-') && !line.startsWith('---'));
        // 규칙 기반 분석
        // case1: 테스트 파일
        if (lowerFile.includes('.test.') || lowerFile.includes('.spec.')) {
            fallbackMessages.push({ type: 'test', filename, action: addedLines.length > 0 ? '추가' : '수정' });
            continue;
        }
        // case2: 파일 삭제
        if (addedLines.length === 0 && removedLines.length > 0) {
            fallbackMessages.push({ type: 'remove', filename, action: '삭제' });
            continue;
        }
        // case3: 새 파일 추가
        if (removedLines.length === 0 && addedLines.length > 0 && diff.includes('new file')) {
            fallbackMessages.push({ type: 'feat', filename, action: '추가' });
            continue;
        }
        // case4: 버그 수정 & 리팩토링 (추가와 삭제가 모두 있음)
        if (addedLines.length > 0 && removedLines.length > 0) {
            fallbackMessages.push({ type: 'fix', filename, action: '수정' });
            fallbackMessages.push({ type: 'refactor', filename, action: '수정' });
            continue;
        }
        // case5: 기능 추가
        if (addedLines.length > 0 && removedLines.length === 0) {
            fallbackMessages.push({ type: 'feat', filename, action: '추가' });
            continue;
        }
        // case6: 그 외
        fallbackMessages.push({ type: 'etc', filename, action: '수정' });
    }
    return fallbackMessages;
}
