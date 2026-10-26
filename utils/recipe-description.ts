const IMPORT_ESTIMATE_NOTE =
  /^(?:Ingredient amounts include AI estimates for \d+(?:\.\d+)? servings?\.|Serving size estimated by AI: \d+(?:\.\d+)? servings?\.)$/;

/** Hide the old import status paragraphs while preserving the recipe's actual prose. */
export function cleanRecipeDescription(description: string | null | undefined): string {
  if (!description) return "";
  const lines = description.split("\n");
  const kept = lines.filter((line) => !IMPORT_ESTIMATE_NOTE.test(line.trim()));
  return kept.length === lines.length
    ? description
    : kept
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
