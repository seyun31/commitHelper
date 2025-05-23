import inquirer from "inquirer";
import { getStagedDiff } from "../git/getDiff";
import { generateMessages } from "../logic/generateMessage";
import { execSync } from "child_process";

export async function runCLI() {
  const diff = await getStagedDiff();
  const messages = await generateMessages(diff);

  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: "✨ 추천 commit message를 선택하세요 ",
      choices: [...messages, "✏️  직접 입력 "],
    },
  ]);

  let finalMessage = selected;
  if (selected === "✏️  직접 입력 ") {
    const { custom } = await inquirer.prompt([
      {
        type: "input",
        name: "custom",
        message: "✏️  직접 commit message를 입력하세요 :",
      },
    ]);
    finalMessage = custom;
  }
  
  // 최종 사용자 수정 단계
  const { confirmEdit } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmEdit",
      message: `✅ 최종 commit message를 \"${finalMessage}\"로 사용하시겠습니까?`,
      default: true,
    },
  ]);

  if (!confirmEdit) {
    const { editedMessage } = await inquirer.prompt([
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
    console.log("❌ commit message를 입력하지 않아 commit을 취소합니다.")
    return;
  }

  execSync(`git commit -m "${finalMessage}"`, { stdio: "inherit" });
}