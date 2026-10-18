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
  return {
    manage_ingredients: tool({
      description:
        "Add or remove one ingredient in the signed-in user's pantry. Use action add or remove. Match removals by name or stockId.",
      inputSchema: z.object({
        action: z.enum(["add", "remove"]),
        name: z.string().min(1).optional().describe("Ingredient name, such as eggs"),
        quantity: z.number().positive().optional(),
        unit: z.string().min(1).optional(),
        stockId: z
          .string()
          .min(1)
          .optional()
          .describe("Pantry row id when removing one specific item"),
      }),
      execute: async (input) => runManageIngredients(data, input),
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
