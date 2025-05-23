"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCLI = runCLI;
const inquirer_1 = __importDefault(require("inquirer"));
const getDiff_1 = require("../git/getDiff");
const generateMessage_1 = require("../logic/generateMessage");
const child_process_1 = require("child_process");
async function runCLI() {
    const diff = await (0, getDiff_1.getStagedDiff)();
    const messages = await (0, generateMessage_1.generateMessages)(diff);
    const { selected } = await inquirer_1.default.prompt([
        {
            type: "list",
            name: "selected",
            message: "✨ 추천 commit message를 선택하세요 ",
            choices: [...messages, "✏️  직접 입력 "],
        },
    ]);
    let finalMessage = selected;
    if (selected === "✏️  직접 입력 ") {
        const { custom } = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "custom",
                message: "✏️  직접 commit message를 입력하세요 :",
            },
        ]);
        finalMessage = custom;
    }
    // 최종 사용자 수정 단계
    const { confirmEdit } = await inquirer_1.default.prompt([
        {
            type: "confirm",
            name: "confirmEdit",
            message: `✅ 최종 commit message를 \"${finalMessage}\"로 사용하시겠습니까?`,
            default: true,
        },
    ]);
    if (!confirmEdit) {
        const { editedMessage } = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "editedMessage",
                message: `🛠️  최종 commit message를 입력하세요 : `,
                default: finalMessage,
            },
        ]);
        finalMessage = editedMessage;
    }
    if (!finalMessage.trim()) {
        console.log("❌ commit message를 입력하지 않아 commit을 취소합니다.");
        return;
    }
    (0, child_process_1.execSync)(`git commit -m "${finalMessage}"`, { stdio: "inherit" });
}
