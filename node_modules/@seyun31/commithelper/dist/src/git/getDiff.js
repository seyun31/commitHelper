"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStagedDiff = getStagedDiff;
const simple_git_1 = __importDefault(require("simple-git"));
async function getStagedDiff() {
    const git = (0, simple_git_1.default)();
    const diff = await git.diff(['--cached', '--name-only']);
    return diff.split('\n').filter(Boolean);
}
