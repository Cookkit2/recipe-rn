import { REQUEST_ROUTING_INSTRUCTIONS } from "./instructions";
export { REQUEST_ROUTING_INSTRUCTIONS } from "./instructions";
import { z } from "zod";
import type { AssistantPantryInput, PantryCandidate } from "~/types/AssistantPantryMutation";
import type { AgentTextMessage } from "./types";

export const assistantIntentSchema = z.enum([
  "add_ingredient",
  "remove_ingredient",
  "rename_ingredient",
  "merge_ingredients",
  "describe_pantry",
  "suggest_recipes",
  "suggest_meal_plan",
  "analyze_diet",
]);

export type AssistantIntent = z.infer<typeof assistantIntentSchema>;

const assistantRequestStepSchema = z.object({
  id: z.string().trim().min(1),
  intent: assistantIntentSchema,
  request: z.string().trim().min(1),
});

export const assistantRequestPlanSchema = z
  .discriminatedUnion("status", [
    z.object({
      status: z.literal("ready"),
      steps: z.array(assistantRequestStepSchema).min(1).max(12),
      resumePending: z.boolean().default(false),
    }),
    z.object({
      status: z.literal("needs_clarification"),
      question: z.string().trim().min(1),
      abandonPending: z.boolean().optional(),
    }),
    z.object({
      status: z.literal("unsupported"),
      message: z.string().trim().min(1),
    }),
  ])
  .superRefine((plan, context) => {
    if (
      plan.status === "ready" &&
      new Set(plan.steps.map((step) => step.id)).size !== plan.steps.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message: "Each request step must have a unique ID.",
      });
    }
  });

export type AssistantRequestPlan = z.infer<typeof assistantRequestPlanSchema>;
export type AssistantRequestStep = z.infer<typeof assistantRequestStepSchema>;

/** Kept by the caller per chat; completed writes are evidence, never new authorization. */
export interface AssistantPendingRequest {
  originalUserMessage: string;
  remainingSteps: AssistantRequestStep[];
  completedSteps: Array<AssistantRequestStep & { output: unknown }>;
  suppliedInput?: AssistantPantryInput;
  clarification?: { question: string; candidates?: PantryCandidate[] };
}

export function intentToolName(
  intent: AssistantIntent
): "manage_ingredients" | "get_pantry" | "suggest_recipes" | "suggest_meal_plan" | "analyze_diet" {
  switch (intent) {
    case "add_ingredient":
    case "remove_ingredient":
    case "rename_ingredient":
    case "merge_ingredients":
      return "manage_ingredients";
    case "describe_pantry":
      return "get_pantry";
    case "suggest_recipes":
    case "suggest_meal_plan":
    case "analyze_diet":
      return intent;
  }
}

export function intentMutationAction(
  intent: AssistantIntent
): AssistantPantryInput["action"] | undefined {
  switch (intent) {
    case "add_ingredient":
      return "add";
    case "remove_ingredient":
      return "remove";
    case "rename_ingredient":
      return "rename";
    case "merge_ingredients":
      return "merge";
    case "describe_pantry":
    case "suggest_recipes":
    case "suggest_meal_plan":
    case "analyze_diet":
      return undefined;
  }
}

const clarification = (): AssistantRequestPlan => ({
  status: "needs_clarification",
  question: "What would you like me to do with your pantry or meal suggestions?",
});

/**
 * Shape validation bounds the interpreter's capabilities, but cannot prove its
 * semantic interpretation is correct. Tool execution must enforce the plan too.
 */
export async function routeAssistantRequest(
  input: { messages: readonly AgentTextMessage[]; pendingRequest?: AssistantPendingRequest },
  interpret: (instructions: string, payload: string) => Promise<unknown>
): Promise<AssistantRequestPlan> {
  const latest = input.messages[input.messages.length - 1];
  if (latest?.role !== "user" || !latest.content.trim()) return clarification();

  try {
    const output = await interpret(REQUEST_ROUTING_INSTRUCTIONS, JSON.stringify(input));
    const parsed = assistantRequestPlanSchema.safeParse(
      typeof output === "string" ? JSON.parse(output) : output
    );
    if (!parsed.success) return clarification();
    const plan = parsed.data;
    if (plan.status !== "ready") return plan;

    const pending = input.pendingRequest;
    const completedIds = new Set(pending?.completedSteps.map((step) => step.id));
    if (plan.steps.some((step) => completedIds.has(step.id))) return clarification();
    if (!plan.resumePending) return plan;
    if (!pending?.remainingSteps.length || pending.remainingSteps.length !== plan.steps.length) {
      return clarification();
    }
    const validResume = plan.steps.every((step, index) => {
      const expected = pending.remainingSteps[index];
      return (
        expected !== undefined &&
        step.id === expected.id &&
        step.intent === expected.intent &&
        (index === 0 || step.request === expected.request)
      );
    });
    return validResume ? plan : clarification();
  } catch {
    // Transport errors, invalid JSON, and unparseable context never unlock tools.
    return clarification();
  }
}
