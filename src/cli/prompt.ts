import inquirer from "inquirer";
import { getStagedDiff } from "../git/getDiff";
import { generateMessages } from "../logic/generateMessage";
import { execSync } from "child_process";

export async function runCLI() {
  const diff = await getStagedDiff();
  const messages = generateMessages(diff);

  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: "✅ 추천 commit message를 선택하세요 :",
      choices: [...messages, "✏️  직접 입력 : "],
    },
  ]);

  let finalMessage = selected;
  if (selected === "✏️  직접 입력 : ") {
    const { custom } = await inquirer.prompt([
      {
        type: "input",
        name: "custom",
        message: "✏️  직접 commit message를 입력하세요 :",
      },
    ]);
    finalMessage = custom;
  }
  if (!finalMessage.trim()) {
    console.log("❌ commit message를 입력하지 않아 commit을 취소합니다.")
    return;
  }

  execSync(`git commit -m "${finalMessage}"`, { stdio: "inherit" });
}