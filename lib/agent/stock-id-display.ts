import type { AgentEvent } from "./types";

/** IDs remain in tool/context data for exact row selection, never display copy. */
export function stockIdsFromEvent(event: AgentEvent): string[] {
  const ids = new Set<string>();
  const record = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const add = (value: unknown) => {
    if (typeof value === "string" && value) ids.add(value);
  };
  const rows = (value: unknown) => {
    if (Array.isArray(value)) value.forEach((row) => add(record(row).id));
  };
  const input = (value: unknown) => {
    const data = record(value);
    add(data.stockId);
    add(data.targetStockId);
  };
  const output = (toolName: string, value: unknown) => {
    const data = record(value);
    switch (toolName) {
      case "get_pantry":
        rows(data.items);
        break;
      case "analyze_diet":
        rows(data.conflicts);
        break;
      case "manage_ingredients":
        add(record(data.item).id);
        rows(data.removed);
        rows(data.candidates);
        break;
    }
  };
  switch (event.type) {
    case "tool-call":
      if (event.toolName === "manage_ingredients") input(event.input);
      break;
    case "tool-result":
      output(event.toolName, event.output);
      break;
    case "request-context":
      if (event.context) {
        input(event.context.suppliedInput);
        rows(event.context.clarification?.candidates);
        for (const step of event.context.completedSteps) {
          switch (step.intent) {
            case "add_ingredient":
            case "remove_ingredient":
            case "rename_ingredient":
            case "merge_ingredients":
              output("manage_ingredients", step.output);
              break;
            case "describe_pantry":
              output("get_pantry", step.output);
              break;
            case "analyze_diet":
              output("analyze_diet", step.output);
              break;
            case "suggest_recipes":
            case "suggest_meal_plan":
              break;
          }
        }
      }
      break;
    case "request-step":
    case "request-plan":
    case "request-message":
    case "text-delta":
    case "tool-error":
    case "finish":
    case "error":
      break;
  }
  return [...ids];
}

/** Filter labeled metadata and known opaque IDs, including unfinished streams. */
export function hideStockIds(text: string, stockIds: readonly string[] = []): string {
  let visible = text
    .replace(/[([]\s*["'`*_]*(?:target[ _-]*)?stock[ _-]*ids?\b["'`*_]*[^)\]]*(?:[)\]]|$)/gi, "")
    .replace(
      /["'`*_]*\b(?:target[ _-]*)?stock[ _-]*ids?\b["'`*_]*\s*(?::|=|,|\bis\b)?\s*(?:["'`][^"'`\n]*["'`]?|[\w-]*)/gi,
      ""
    );
  for (const id of stockIds) {
    if (!id) continue;
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    visible = visible.replace(new RegExp(escaped, "gi"), "");
    // Do not flash an ID prefix while the model streams the rest of its token.
    for (let size = Math.min(id.length - 1, visible.length); size >= 3; size--) {
      const start = visible.length - size;
      if (
        visible.slice(start).toLowerCase() === id.slice(0, size).toLowerCase() &&
        (start === 0 || /[^\p{L}\p{N}_-]/u.test(visible[start - 1]!))
      ) {
        visible = visible.slice(0, start);
        break;
      }
    }
  }
  if (visible === text) return text;
  return visible
    .replace(/[ \t]*\(\s*\)|[ \t]*\[\s*\]/g, "")
    .replace(/[ \t]*[([][ \t]*$/gm, "")
    .replace(/[ \t]+([.,;!?])/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
