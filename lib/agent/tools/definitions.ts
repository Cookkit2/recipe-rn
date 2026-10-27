import { tool } from "ai";
import { z } from "zod";
import type { CookingDataClient } from "./planning";
import {
  runAnalyzeDiet,
  runManageIngredients,
  runSuggestMealPlan,
  runSuggestRecipes,
} from "./actions";

const slots = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export function createCookingTools(data: CookingDataClient) {
  // Tools are created per conversation turn. Once clarification is needed, only a
  // new user turn may supply the missing name/unit/selection, never a model retry.
  let mutationQueue: Promise<unknown> = Promise.resolve();
  let pendingClarification: Awaited<ReturnType<typeof runManageIngredients>> | undefined;
  return {
    manage_ingredients: tool({
      description:
        "Add, remove, rename or explicitly merge pantry entries. Ask which specific ingredient for broad categories such as vegetables, fruit or spices. Never guess foods. For needs_clarification, ask the returned question and wait for the user; use candidates to resolve their choice. Use stockId to select an existing row; rename corrects a row after the user identifies its contents. Merge requires explicit user instruction and both row IDs. To merge a vague entry, include the specific name the user identified; to rename into a separate batch after clarification, set keepSeparate true.",
      inputSchema: z.object({
        action: z.enum(["add", "remove", "rename", "merge"]),
        name: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Specific ingredient or named mixture, such as eggs or frozen mixed vegetables; never a broad category"
          ),
        quantity: z.number().positive().optional(),
        unit: z.string().min(1).optional(),
        stockId: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Existing pantry row ID for a user-selected addition, removal, rename or merge source"
          ),
        keepSeparate: z
          .boolean()
          .optional()
          .describe(
            "Only true after the user explicitly chooses to keep separate batches when renaming into an existing ingredient"
          ),
        targetStockId: z
          .string()
          .min(1)
          .optional()
          .describe("Destination row ID for an explicitly requested merge"),
      }),
      execute: (input) => {
        // Serialize parallel tool calls as well as retries in later model steps.
        const pending = mutationQueue.then(async () => {
          if (pendingClarification) return pendingClarification;
          const result = await runManageIngredients(data, input);
          if (!result.ok && "status" in result && result.status === "needs_clarification")
            pendingClarification = result;
          return result;
        });
        mutationQueue = pending;
        return pending;
      },
    }),
    analyze_diet: tool({
      description:
        "Compare the user's saved diet, allergens, and macro target with the ingredients currently in their pantry.",
      inputSchema: z.object({}),
      execute: async () => runAnalyzeDiet(data),
    }),
    suggest_meal_plan: tool({
      description:
        "Suggest breakfast, lunch, dinner, or snack recipes for the next few days from the user's pantry. Does not save the plan.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(7).optional(),
        slots: z.array(slots).max(4).optional(),
      }),
      execute: async (input) => runSuggestMealPlan(data, input),
    }),
    suggest_recipes: tool({
      description:
        "Suggest catalog recipes the user can cook from the ingredients in their pantry, respecting diet tags and allergens.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: async (input) => runSuggestRecipes(data, input),
    }),
  };
}
