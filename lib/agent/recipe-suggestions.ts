import { z } from "zod";
import type { AgentTextMessage } from "./types";

export const RECIPE_LOOKUP_ERROR = "Couldn't load recipe suggestions. Please try again.";

// Validate the tool boundary before displaying catalog-backed results.
export const recipeSuggestionsSchema = z.object({
  recipes: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      matched: z.array(z.string()),
      missing: z.array(z.string()),
      coverage: z.number().min(0).max(1),
      calories: z.number().nullable(),
      tags: z.array(z.string()),
    })
  ),
  pantryCount: z.number().int().nonnegative(),
  truncated: z.boolean(),
});

export type RecipeSuggestionsResult = z.infer<typeof recipeSuggestionsSchema>;

const NORMAL_TOOL_LOOP_REQUEST = /\b(add|remove|delete|plan|schedule)\b/;

function isDirectRecipeRequest(text: string): boolean {
  // Combined mutation and meal-plan requests need the normal tool loop.
  if (NORMAL_TOOL_LOOP_REQUEST.test(text)) return false;
  return (
    /^\W*recipes?\b/.test(text) ||
    /\b(suggest|recommend|find|show|give|want|need|looking|any)\b.*\b(recipes?|meals?|dishes|dinner|lunch|breakfast)\b/.test(
      text
    ) ||
    /\bwhat\b.*\b(can|should|could)\b.*\b(cook|make|eat)\b/.test(text)
  );
}

/** Route common suggestion requests to the catalog, including short follow-ups. */
export function requestsRecipeSuggestions(messages: readonly AgentTextMessage[]): boolean {
  const latest = messages.at(-1);
  if (latest?.role !== "user") return false;
  const text = latest.content.toLowerCase();
  if (NORMAL_TOOL_LOOP_REQUEST.test(text)) return false;
  if (isDirectRecipeRequest(text)) return true;
  if (
    /\b(other|another|different|alternatives?)\b|\bmore\b.*\b(recipes?|ideas|options|suggestions)\b|^\W*more\W*$/.test(
      text
    )
  ) {
    return messages
      .slice(0, -1)
      .some(
        (message) => message.role === "user" && isDirectRecipeRequest(message.content.toLowerCase())
      );
  }
  return false;
}
