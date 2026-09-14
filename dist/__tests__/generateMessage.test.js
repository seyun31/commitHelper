"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const simple_git_1 = __importDefault(require("simple-git"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const generateMessage_1 = require("../src/logic/generateMessage");
jest.mock('simple-git');
jest.mock('groq-sdk');
describe('generateMessages', () => {
    const mockDiff = jest.fn();
    beforeEach(() => {
        simple_git_1.default.mockReturnValue({ diff: mockDiff });
        mockDiff.mockReset();
        groq_sdk_1.default.mockClear();
        delete process.env.GROQ_API_KEY;
    });
    it('falls back to rule-based messages without creating a Groq client when GROQ_API_KEY is missing', async () => {
        mockDiff
            .mockResolvedValueOnce('new file\n+++ b/feature.ts\n+ line1')
            .mockResolvedValueOnce('new file\n+++ b/feature.ts\n+ line1');
        const messages = await (0, generateMessage_1.generateMessages)(['feature.ts']);
        expect(groq_sdk_1.default).not.toHaveBeenCalled();
        expect(messages[0]).toMatchObject({ type: 'feat' });
    });
    it('returns empty array when no staged changes', async () => {
        mockDiff.mockResolvedValue('');
        const messages = await (0, generateMessage_1.generateMessages)(['file.ts']);
        expect(messages).toEqual([]);
    });
    it('returns feat when new file with only additions', async () => {
        mockDiff
            .mockResolvedValueOnce('new file\n+++ b/file.ts\n+ line1\n+ line2')
            .mockResolvedValueOnce('new file\n+++ b/file.ts\n+ line1\n+ line2');
        const messages = await (0, generateMessage_1.generateMessages)(['file.ts']);
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
        const messages = await (0, generateMessage_1.generateMessages)(['old.ts']);
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
        const messages = await (0, generateMessage_1.generateMessages)(['mixed.ts']);
        expect(messages.length).toBeGreaterThan(0);
        const types = messages.map((m) => m.type);
        expect(types).toContain('fix');
    });
    it('returns test for .test.ts files', async () => {
        mockDiff
            .mockResolvedValueOnce('+++ b/example.test.ts\n+ test')
            .mockResolvedValueOnce('+++ b/example.test.ts\n+ test');
        const messages = await (0, generateMessage_1.generateMessages)(['example.test.ts']);
        expect(messages.length).toBeGreaterThan(0);
        expect(messages[0]).toMatchObject({
            type: 'test',
            description: expect.stringContaining('example.test.ts'),
        });
    });
});
