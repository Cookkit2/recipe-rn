import { z } from "zod";

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
