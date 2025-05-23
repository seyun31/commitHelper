"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMessages = generateMessages;
const simple_git_1 = __importDefault(require("simple-git"));
async function generateMessages(files) {
    const git = (0, simple_git_1.default)();
    const messages = [];
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
        // case1 : 테스트 파일 추가
        if (lowerFile.includes('.test.')) {
            messages.push({ type: 'Test', filename, action: '추가' });
            continue;
        }
        // case2 : 스타일 변경만 있는 경우 (포맷팅, 세미콜론 등)
        if (addedLines.length + removedLines.length > 0 &&
            addedLines.every((line) => /^[+\s;]*$/.test(line.replace(/^[+-]\s*/, ''))) &&
            removedLines.every((line) => /^[+\s;]*$/.test(line.replace(/^[+-]\s*/, '')))) {
            messages.push({ type: 'Style', filename, action: '수정' });
            continue;
        }
        // case3 : 버그 & 코드 수정
        if (addedLines.length > 0 && removedLines.length > 0) {
            messages.push({ type: 'Fix', filename, action: '수정' });
            messages.push({ type: 'Refactor', filename, action: '수정' });
            continue;
        }
        // case4 : 기능 추가
        if (addedLines.length > 0 && removedLines.length === 0) {
            messages.push({ type: 'Feat', filename, action: '추가' });
            continue;
        }
        // case5 : 코드, 파일 삭제
        if (addedLines.length === 0 && removedLines.length > 0) {
            messages.push({ type: 'Remove', filename, action: '삭제' });
            continue;
        }
        // case6 : 그 외
        messages.push({ type: 'Etc', filename, action: '수정' });
    }
    return messages;
}
