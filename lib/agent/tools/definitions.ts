import { tool } from "ai";
import { z } from "zod";
import type { AssistantPantryInput } from "~/types/AssistantPantryMutation";
import { intentMutationAction, intentToolName, type AssistantIntent } from "../request-routing";
import { pantryReadInputSchema, runGetPantry } from "../pantry-read";
import type { CookingDataClient } from "./planning";
import {
  runAnalyzeDiet,
  runManageIngredients,
  runSuggestMealPlan,
  runSuggestRecipes,
} from "./actions";

const slots = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export interface CookingToolPolicy {
  intent: AssistantIntent;
  suppliedInput?: AssistantPantryInput;
  completePantryRead?: boolean;
  onResult?: (toolName: string, input: unknown, output: unknown) => void;
  onError?: (toolName: string, input: unknown, error: unknown) => void;
}

export function createCookingTools(data: CookingDataClient, policy?: CookingToolPolicy) {
  let pantryReadQueue: Promise<unknown> = Promise.resolve();
  let mutationQueue: Promise<unknown> = Promise.resolve();
  let settledMutation:
    | Awaited<ReturnType<typeof runManageIngredients>>
    | { ok: false; status: "not_authorized"; error: string }
    | undefined;
  let authorizationDenied = false;
  let nextPantryOffset: number | undefined = policy?.completePantryRead ? 0 : undefined;
  const authorized = (toolName: string) =>
    !authorizationDenied && policy !== undefined && intentToolName(policy.intent) === toolName;
  const denied = (toolName: string, input: unknown) => {
    authorizationDenied = true;
    const output = {
      ok: false as const,
      status: "not_authorized" as const,
      error: "That action is not allowed for this request.",
    };
    policy?.onResult?.(toolName, input, output);
    return output;
  };
  async function execute<T>(toolName: string, input: unknown, run: () => Promise<T>) {
    if (!authorized(toolName)) return denied(toolName, input);
    try {
      const output = await run();
      policy?.onResult?.(toolName, input, output);
      return output;
    } catch (error) {
      policy?.onError?.(toolName, input, error);
      throw error;
    }
  }
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
        const pending = mutationQueue.then(async () => {
          if (
            !authorized("manage_ingredients") ||
            !policy ||
            intentMutationAction(policy.intent) !== input.action
          )
            return denied("manage_ingredients", input);
          // A planned mutation can run once; a new user turn supplies clarification.
          if (settledMutation) return settledMutation;
          const supplied = policy.suppliedInput;
          const actualInput =
            supplied?.action === input.action
              ? {
                  ...supplied,
                  ...input,
                  ...(supplied.quantity !== undefined ? { quantity: supplied.quantity } : {}),
                  ...(supplied.unit !== undefined ? { unit: supplied.unit } : {}),
                }
              : input;
          const output = await execute("manage_ingredients", actualInput, () =>
            runManageIngredients(data, actualInput)
          );
          settledMutation = output;
          return output;
        });
        mutationQueue = pending;
        return pending;
      },
    }),
    get_pantry: tool({
      description:
        "Read a page of actual on-device pantry stock without changing anything. Keep separate batches and actual quantities/units. If truncated is true, fetch subsequent pages before claiming an ingredient is absent. Never invent storage location or missing values.",
      inputSchema: pantryReadInputSchema,
      execute: (input) => {
        const pending = pantryReadQueue.then(() => {
          const actual =
            policy?.completePantryRead && nextPantryOffset !== undefined
              ? { ...input, offset: nextPantryOffset }
              : input;
          return execute("get_pantry", actual, async () => {
            const result = await runGetPantry(data, actual);
            nextPantryOffset = result.offset + result.items.length;
            return result;
          });
        });
        pantryReadQueue = pending;
        return pending;
      },
    }),
    analyze_diet: tool({
      description:
        "Compare the user's saved diet, allergens, and macro target with the ingredients currently in their pantry.",
      inputSchema: z.object({}),
      execute: () => execute("analyze_diet", {}, () => runAnalyzeDiet(data)),
    }),
    suggest_meal_plan: tool({
      description:
        "Suggest breakfast, lunch, dinner, or snack recipes for the next few days from the user's pantry. Does not save the plan.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(7).optional(),
        slots: z.array(slots).max(4).optional(),
      }),
      execute: (input) =>
        execute("suggest_meal_plan", input, () => runSuggestMealPlan(data, input)),
    }),
    suggest_recipes: tool({
      description:
        "Suggest catalog recipes the user can cook from the ingredients in their pantry, respecting diet tags and allergens.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: (input) => execute("suggest_recipes", input, () => runSuggestRecipes(data, input)),
    }),
  };
}
