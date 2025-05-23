"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const simple_git_1 = __importDefault(require("simple-git"));
const generateMessage_1 = require("../src/logic/generateMessage");
describe('generateMessages', () => {
    const mockDiff = jest.fn();
    beforeEach(() => {
        simple_git_1.default.mockReturnValue({ diff: mockDiff });
    });
    it('returns feat when only additions', async () => {
        mockDiff.mockResolvedValue('+ line1\n+ line2');
        const messages = await (0, generateMessage_1.generateMessages)(['file.ts']);
        expect(messages).toEqual(['Feat: file.ts 추가']);
    });
    it('returns remove when only deletions', async () => {
        mockDiff.mockResolvedValue('- line1\n- line2');
        const messages = await (0, generateMessage_1.generateMessages)(['old.ts']);
        expect(messages).toEqual(['Remove: old.ts 삭제']);
    });
    it('returns refactor when mixed changes', async () => {
        mockDiff.mockResolvedValue('+ line1\n- line2');
        const messages = await (0, generateMessage_1.generateMessages)(['mixed.ts']);
        expect(messages).toEqual(['Refactor: mixed.ts 수정']);
    });
});
