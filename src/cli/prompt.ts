import inquirer from "inquirer";
import { getStagedDiff } from "../git/getDiff";
import { generateMessages } from "../logic/generateMessage";
import { execSync } from "child_process";

export async function runCLI() {
  const files = await getStagedDiff();
  const messages = await generateMessages(files);

  const choices = messages.map(m => ({
    name: `${m.type}: ${m.filename} ${m.action}`,
    value: `${m.type}: ${m.filename} ${m.action}`
  }));
  
  // 직접 입력 옵션 추가
  choices.push({ name: "✏️ 직접 입력", value: "✏️ 직접 입력" });

  // 선택 프롬프트
  const { selected } = await inquirer.prompt<{ selected: string }>([
    {
      type: "list",
      name: "selected",
      message: "✨ 추천 commit message를 선택하세요:",
      choices,
    },
  ]);

  let finalMessage = selected;
  if (selected === "✏️ 직접 입력") {
    const { custom } = await inquirer.prompt<{ custom: string }>([
      {
        type: "input",
        name: "custom",
        message: "✏️ 직접 commit message를 입력하세요:",
      },
    ]);
    finalMessage = custom;
  }

  // 최종 확인 및 수정
  const { confirmEdit } = await inquirer.prompt<{ confirmEdit: boolean }>([
    {
      type: "confirm",
      name: "confirmEdit",
      message: `✅ 최종 commmit message로 \"${finalMessage}\" 을(를) 사용하시겠습니까?`,
      default: true,
    },
  ]);
  if (!confirmEdit) {
    const { editedMessage } = await inquirer.prompt<{ editedMessage: string }>([
      {
        type: "input",
        name: "editedMessage",
        message: "🛠️ 최종 commit message를 입력하세요:",
        default: finalMessage,
      },
    ]);
    finalMessage = editedMessage;
  }

  if (!finalMessage.trim()) {
    console.log("❌ commit message를 입력하지 않아 commit을 취소합니다.");
    return;
  }

  execSync(`git commit -m "${finalMessage}"`, { stdio: "inherit" });
}