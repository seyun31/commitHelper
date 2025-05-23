import simpleGit from "simple-git";

export async function getStagedDiff(): Promise<string[]> {
  const git = simpleGit();
  const diff = await git.diff(["--cached", "--name-only"]);
  return diff.split("\n").filter(Boolean);
}
