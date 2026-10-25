/** Normalize assistant copy at display time, including unfinished streamed emphasis. */
export function toAssistantPlainText(text: string): string {
  const withoutBlocks = text
    .replace(/^[ \t]*(?:`{3,}|~{3,})[^\n]*(?:\n|$)/gm, "")
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();
      if (/^(?:[-*_][ \t]*){3,}$/.test(trimmed)) return [];
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((cell) => cell.trim());
        if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return [];
        return [cells.join(", ")];
      }
      return [line];
    })
    .join("\n");

  return withoutBlocks
    .replace(/^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?$/gm, "$1")
    .replace(/^ {0,3}#{1,6}[ \t]*$/gm, "")
    .replace(/^(?: {0,3}>[ \t]?)+/gm, "")
    .replace(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]*)?/gm, "")
    .replace(/!\[([^\]\n]*)\]\([^\n)]*\)/g, "$1")
    .replace(/\[([^\]\n]+)\]\(([^\n)]*)(?:\)|$)/g, (_, label: string, url: string) =>
      url ? `${label} (${url})` : label
    )
    .replace(/!?\[([^\]\n]*)\](?:\[[^\]\n]*\])?/g, "$1")
    .replace(/!?\[([^\]\n]*)$/gm, "$1")
    .replace(/`+/g, "")
    .replace(/~~/g, "")
    .replace(/(^|[^\p{L}\p{N}])[*_]{1,3}(?=\S)/gu, "$1")
    .replace(/(\S)[*_]{1,3}(?=$|[^\p{L}\p{N}])/gu, "$1")
    .replace(/(?:^|[ \t])[*_]{1,3}$/gm, "")
    .replace(/\\([\\*{}\[\]()#+.!_>~-])/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
