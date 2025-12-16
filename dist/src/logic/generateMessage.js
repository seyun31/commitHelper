"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMessages = generateMessages;
const simple_git_1 = __importDefault(require("simple-git"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
require("dotenv/config");
const fs_1 = require("fs");
const path_1 = require("path");
const groq = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY,
});
// 시스템 프롬프트 로드
const SYSTEM_PROMPT = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../prompts/system-prompt.txt'), 'utf-8');
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
                    content: SYSTEM_PROMPT,
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
    catch {
        // API 호출 실패 시 조용히 fallback으로 넘어감
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
            fallbackMessages.push({
                type: 'test',
                description: `${filename} 테스트 ${addedLines.length > 0 ? '추가' : '수정'}`,
            });
            continue;
        }
        // case2: 파일 삭제
        if (addedLines.length === 0 && removedLines.length > 0) {
            fallbackMessages.push({ type: 'remove', description: `${filename} 제거` });
            continue;
        }
        // case3: 새 파일 추가
        if (removedLines.length === 0 && addedLines.length > 0 && diff.includes('new file')) {
            fallbackMessages.push({ type: 'feat', description: `${filename} 기능 추가` });
            continue;
        }
        // case4: 버그 수정 & 리팩토링 (추가와 삭제가 모두 있음)
        if (addedLines.length > 0 && removedLines.length > 0) {
            fallbackMessages.push({ type: 'fix', description: `${filename} 버그 수정` });
            fallbackMessages.push({ type: 'refactor', description: `${filename} 리팩토링` });
            continue;
        }
        // case5: 기능 추가
        if (addedLines.length > 0 && removedLines.length === 0) {
            fallbackMessages.push({ type: 'feat', description: `${filename}에 기능 추가` });
            continue;
        }
        // case6: 그 외
        fallbackMessages.push({ type: 'etc', description: `${filename} 수정` });
    }
    return fallbackMessages;
}
