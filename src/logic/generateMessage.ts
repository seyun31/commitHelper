import simpleGit from "simple-git";

export async function generateMessages(files: string[]): Promise<string[]> {
  const git = simpleGit();
  const messages: string[] = [];

  for (const file of files.slice(0, 5)) {
    const lowerFile = file.toLowerCase();
    const filename = file.split("/").pop() ?? file;

    const diff = await git.diff(["--cached", file]);
    const addedLines = diff
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"));
    const removedLines = diff
      .split("\n")
      .filter((line) => line.startsWith("-") && !line.startsWith("---"));

    let type = "Etc";
    let action = "수정";

    // 파일명에 remove/delete 포함 시 우선 적용
    if (lowerFile.includes("remove") || lowerFile.includes("delete")) {
      type = "Remove";
      action = "삭제";
    } else if (addedLines.length > 0 && removedLines.length === 0) {
      type = "Feat";
      action = "추가";
    } else if (addedLines.length === 0 && removedLines.length > 0) {
      type = "Remove";
      action = "삭제";
    } else if (addedLines.length > 0 && removedLines.length > 0) {
      type = "Refactor";
      action = "수정";
    }

    messages.push(`${type}: ${filename} ${action}`);
  }

  return messages;
}
