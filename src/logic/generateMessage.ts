export function generateMessages(files: string[]): string[] {
  const map: Record<string, string> = {
    ts: "refactor",
    js: "refactor",
    css: "style",
    test: "test",
    spec: "test",
    json: "chore",
  };

return files.slice(0, 5).map((file) => {
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    const type = Object.keys(map).find((key) => file.includes(key)) || "feat";
    const filename = file.split("/").pop() ?? file;
    return `${(map[type] || "feat")[0].toUpperCase() + (map[type] || "feat").slice(1)}: ${filename} 수정`;
  });
}
