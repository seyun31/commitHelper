"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const simple_git_1 = __importDefault(require("simple-git"));
const generateMessage_1 = require("../src/logic/generateMessage");
jest.mock('simple-git');
describe('generateMessages', () => {
    const mockDiff = jest.fn();
    beforeEach(() => {
        simple_git_1.default.mockReturnValue({ diff: mockDiff });
        mockDiff.mockReset();
    });
    it('returns feat when only additions', async () => {
        mockDiff.mockResolvedValue('+ line1\n+ line2');
        const messages = await (0, generateMessage_1.generateMessages)(['file.ts']);
        expect(messages).toEqual([{ type: 'Feat', filename: 'file.ts', action: '추가' }]);
    });
    it('returns remove when only deletions', async () => {
        mockDiff.mockResolvedValue('- line1\n- line2');
        const messages = await (0, generateMessage_1.generateMessages)(['old.ts']);
        expect(messages).toEqual([{ type: 'Remove', filename: 'old.ts', action: '삭제' }]);
    });
    it('returns fix and refactor when mixed changes', async () => {
        mockDiff.mockResolvedValue('+ line1\n- line2');
        const messages = await (0, generateMessage_1.generateMessages)(['mixed.ts']);
        expect(messages).toEqual([
            { type: 'Fix', filename: 'mixed.ts', action: '수정' },
            { type: 'Refactor', filename: 'mixed.ts', action: '수정' },
        ]);
    });
    it('returns test for .test.ts files', async () => {
        mockDiff.mockResolvedValue('+');
        const messages = await (0, generateMessage_1.generateMessages)(['example.test.ts']);
        expect(messages).toEqual([{ type: 'Test', filename: 'example.test.ts', action: '추가' }]);
    });
    it('returns style for formatting-only changes', async () => {
        mockDiff.mockResolvedValue('+ ;\n- ;');
        const messages = await (0, generateMessage_1.generateMessages)(['format.ts']);
        expect(messages).toEqual([{ type: 'Style', filename: 'format.ts', action: '수정' }]);
    });
});
