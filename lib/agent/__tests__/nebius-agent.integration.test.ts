import type { AssistantPantryInput, AssistantPantryResult } from "~/types/AssistantPantryMutation";
/**
 * Tier A: Jest integration through the production cooking agent.
 *
 * Calls `createCookingAgent({ kind: "nebius" })`, which runs real `streamText`,
 * `@ai-sdk/openai-compatible`, and `createCookingTools`. The data client is
 * the app's `withLocalPantry` adapter over an in-memory pantry API boundary,
 * with a real supabase-js client for cloud diet preferences and recipe reads.
 *
 * Nebius and Supabase are local HTTP fixtures. `fetch` is Node's global fetch,
 * passed as the agent override so this file does not load `expo/fetch`.
 * Passing the override is a test seam the screen does not use. This tier does
 * not prove Hermes or `expo/fetch` streaming.
 *
 * Jest picks this file up with the rest of the unit tests, so the Ubuntu job
 * in .github/workflows/ci.yml runs it inside the existing `bun run test` step.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCookingAgent } from "../factory";
import {
  createFixtureSupabaseClient,
  startPostgrestFixture,
  TEST_HOUSEHOLD_ID,
  type PostgrestFixture,
  type PostgrestFixtureSeed,
  type StockRow,
} from "../testing/postgrest-fixture";
import {
  startOpenAICompatibleServer,
  type OpenAICompatibleServer,
  type OpenAITurnScript,
} from "../testing/openai-compatible-server";
import { createSupabaseCookingDataClient } from "../tools/supabase-cooking-data";
import { withLocalPantry } from "../tools/local-pantry";
import type { PantryItem } from "~/types/PantryItem";
import type { AgentEvent } from "../types";
import type { Database } from "~/lib/supabase/supabase-types";

jest.setTimeout(60_000);

const DUMMY_NEBIUS_KEY = "test-nebius-key";
const DUMMY_MODEL = "mock-tool-model";

interface ScenarioResult {
  events: AgentEvent[];
  database: PostgrestFixture;
  model: OpenAICompatibleServer;
  pantry: ReturnType<typeof createLocalPantryFixture>;
}

/** Native persistence is the boundary in this Node tier; device coverage checks SQLite/UI. */
function createLocalPantryFixture(stock: StockRow[]) {
  const items: PantryItem[] = stock.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity ?? 1,
    unit: row.unit ?? "count",
    expiry_date: row.expiry_date ? new Date(row.expiry_date) : undefined,
    type: "fridge",
    category: "other",
    image_url: undefined,
    background_color: undefined,
    created_at: new Date(),
    updated_at: new Date(),
    steps_to_store: [],
  }));
  let nextId = 0;
  const fixture = {
    items,
    changes: 0,
    api: {
      async manageAssistantPantry(
        input: AssistantPantryInput
      ): Promise<AssistantPantryResult<PantryItem>> {
        if (input.action === "add") {
          const item = await this.addPantryItem({
            name: input.name!,
            quantity: input.quantity ?? 1,
            unit: input.unit ?? "count",
            type: "fridge",
            category: "other",
            image_url: undefined,
            background_color: undefined,
            steps_to_store: [],
          });
          return { ok: true, status: "added", item };
        }
        if (input.action === "remove") {
          const matches = items.filter((item) =>
            input.stockId
              ? item.id === input.stockId
              : item.name.toLowerCase() === input.name?.toLowerCase()
          );
          for (const item of matches) await this.deletePantryItem(item.id);
          return { ok: true, status: "removed", removed: matches };
        }
        return { ok: false, error: "Unused fixture action" };
      },
      async fetchAllPantryItems() {
        return [...items];
      },
      async addPantryItem(input: Omit<PantryItem, "id" | "created_at" | "updated_at">) {
        const item = {
          ...input,
          id: `local-added-${++nextId}`,
          created_at: new Date(),
          updated_at: new Date(),
        };
        items.push(item);
        return item;
      },
      async deletePantryItem(id: string) {
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) throw new Error(`No local pantry row ${id}`);
        items.splice(index, 1);
      },
    },
  };
  return fixture;
}

async function runScenario(
  prompt: string,
  script: OpenAITurnScript,
  seed: PostgrestFixtureSeed = {}
): Promise<ScenarioResult> {
  const pantry = createLocalPantryFixture(seed.stock ?? []);
  const database = await startPostgrestFixture({ ...seed, stock: [] });
  const model = await startOpenAICompatibleServer({ script });
  let client: SupabaseClient<Database> | undefined;
  try {
    client = createFixtureSupabaseClient(database);
    const agent = createCookingAgent({
      kind: "nebius",
      data: withLocalPantry(
        createSupabaseCookingDataClient(client, () => null),
        pantry.api,
        () => {
          pantry.changes += 1;
        }
      ),
      config: {
        apiKey: DUMMY_NEBIUS_KEY,
        model: DUMMY_MODEL,
        baseURL: model.baseURL,
      },
      // Node fetch. The device tier is what exercises expo/fetch on Hermes.
      fetch: globalThis.fetch,
    });
    const events: AgentEvent[] = [];
    for await (const event of agent.stream({
      messages: [{ id: "user-1", role: "user", content: prompt }],
    })) {
      events.push(event);
    }
    return { events, database, model, pantry };
  } catch (error) {
    await database.close();
    await model.close();
    throw error;
  }
}

async function finish(result: ScenarioResult): Promise<void> {
  await result.model.close();
  await result.database.close();
}

function assertClean(events: AgentEvent[]): void {
  const failure = events.find((event) => event.type === "error" || event.type === "tool-error");
  expect(failure).toBeUndefined();
}

function textDeltas(events: AgentEvent[]): string[] {
  return events.flatMap((event) => (event.type === "text-delta" ? [event.text] : []));
}

function toolOutput(events: AgentEvent[], toolName: string): unknown {
  const match = events.find((event) => event.type === "tool-result" && event.toolName === toolName);
  if (!match || match.type !== "tool-result") {
    throw new Error(`Missing ${toolName} result. Events: ${JSON.stringify(events)}`);
  }
  return match.output;
}

function paths(result: ScenarioResult, suffix: string): string[] {
  return result.database.requests
    .filter((request) => request.path.endsWith(suffix))
    .map((request) => request.method);
}

const omelette = {
  id: "recipe-omelette",
  title: "Spinach omelette",
  tags: ["vegetarian"],
  allergens: [] as string[],
  calories: 420,
  protein: 24,
  carbs: 8,
  fat: 28,
  fiber: 3,
  servings: 1,
  cook_minutes: 15,
};

const cake = {
  id: "recipe-cake",
  title: "Flour cake",
  tags: ["vegetarian"],
  allergens: [] as string[],
  calories: 500,
  protein: 6,
  carbs: 70,
  fat: 20,
  fiber: 1,
  servings: 8,
  cook_minutes: 40,
};

it("adds an ingredient to the app local pantry", async () => {
  const result = await runScenario(
    "Add 6 eggs to my pantry.",
    ({ body }) => {
      const hasToolResult = body.messages?.some((message) => message.role === "tool");
      if (!hasToolResult) {
        return {
          toolCalls: [
            {
              id: "call_add_eggs",
              name: "manage_ingredients",
              arguments: { action: "add", name: "eggs", quantity: 6, unit: "count" },
            },
          ],
        };
      }
      return { textDeltas: ["Added eggs to your pantry."] };
    },
    { baseIngredients: [{ id: "base-eggs", name: "eggs" }] }
  );
  try {
    assertClean(result.events);
    expect(toolOutput(result.events, "manage_ingredients")).toMatchObject({
      ok: true,
      item: { name: "eggs", quantity: 6, unit: "count", addedByUserId: null },
    });
    expect(textDeltas(result.events).join("")).toBe("Added eggs to your pantry.");
    expect(result.model.requests).toHaveLength(2);
    expect(
      result.model.requests[1]?.body.messages?.some((message) => message.role === "tool")
    ).toBe(true);
    expect(paths(result, "/stock")).toEqual([]);
    expect(result.pantry.changes).toBe(1);
    expect(result.pantry.items).toEqual([
      expect.objectContaining({
        name: "eggs",
        quantity: 6,
        unit: "count",
        id: "local-added-1",
      }),
    ]);
  } finally {
    await finish(result);
  }
});

it("removes an ingredient from the app local pantry", async () => {
  const result = await runScenario(
    "Remove eggs from my pantry.",
    ({ body }) => {
      const hasToolResult = body.messages?.some((message) => message.role === "tool");
      if (!hasToolResult) {
        return {
          toolCalls: [
            {
              id: "call_remove_eggs",
              name: "manage_ingredients",
              arguments: { action: "remove", name: "eggs" },
            },
          ],
        };
      }
      return { textDeltas: ["Removed eggs from your pantry."] };
    },
    {
      stock: [
        {
          id: "stock-eggs",
          name: "eggs",
          quantity: 6,
          unit: "count",
          expiry_date: null,
          household_id: TEST_HOUSEHOLD_ID,
          added_by_user_id: null,
        },
      ],
    }
  );
  try {
    assertClean(result.events);
    expect(toolOutput(result.events, "manage_ingredients")).toMatchObject({
      ok: true,
      removed: [{ id: "stock-eggs", name: "eggs" }],
    });
    expect(textDeltas(result.events).join("")).toBe("Removed eggs from your pantry.");
    expect(paths(result, "/stock")).toEqual([]);
    expect(result.pantry.items).toEqual([]);
    expect(result.pantry.changes).toBe(1);
  } finally {
    await finish(result);
  }
});

it("analyzes the pantry against the saved diet", async () => {
  const result = await runScenario(
    "Does my pantry fit my diet?",
    ({ body }) => {
      const hasToolResult = body.messages?.some((message) => message.role === "tool");
      if (!hasToolResult) {
        return {
          toolCalls: [{ id: "call_diet", name: "analyze_diet", arguments: {} }],
        };
      }
      return {
        textDeltas: ["Chicken conflicts with vegetarian. Milk matches your milk allergen."],
      };
    },
    {
      preferences: { diet: "vegetarian", allergens: ["milk"] },
      stock: [
        {
          id: "stock-chicken",
          name: "chicken",
          quantity: 1,
          unit: "lb",
          expiry_date: null,
          household_id: TEST_HOUSEHOLD_ID,
          added_by_user_id: null,
        },
        {
          id: "stock-milk",
          name: "milk",
          quantity: 1,
          unit: "liter",
          expiry_date: null,
          household_id: TEST_HOUSEHOLD_ID,
          added_by_user_id: null,
        },
      ],
    }
  );
  try {
    assertClean(result.events);
    const output = toolOutput(result.events, "analyze_diet") as {
      conflicts: { name: string; reasons: string[] }[];
      profile: { diet: string | null; source: string };
    };
    expect(output.profile).toMatchObject({ diet: "vegetarian", source: "supabase" });
    expect(output.conflicts.map((conflict) => conflict.name).sort()).toEqual(["chicken", "milk"]);
    expect(textDeltas(result.events).join("")).toContain("Chicken");
    expect(paths(result, "/users")).toContain("GET");
  } finally {
    await finish(result);
  }
});

it("suggests a meal plan without saving it", async () => {
  const result = await runScenario(
    "Plan one lunch from what I have.",
    ({ body }) => {
      const hasToolResult = body.messages?.some((message) => message.role === "tool");
      if (!hasToolResult) {
        return {
          toolCalls: [
            {
              id: "call_plan",
              name: "suggest_meal_plan",
              arguments: { days: 1, slots: ["lunch"] },
            },
          ],
        };
      }
      return { textDeltas: ["Lunch: Spinach omelette. The plan was not saved."] };
    },
    {
      preferences: { diet: "vegetarian", allergens: [] },
      stock: [
        {
          id: "stock-eggs",
          name: "eggs",
          quantity: 6,
          unit: "count",
          expiry_date: null,
          household_id: TEST_HOUSEHOLD_ID,
          added_by_user_id: null,
        },
      ],
      recipes: [
        omelette,
        {
          ...cake,
          id: "recipe-steak",
          title: "Steak and eggs",
          tags: [],
        },
      ],
      pivots: [
        { recipe_id: "recipe-omelette", name: "eggs", quantity: 2, unit: "count" },
        { recipe_id: "recipe-omelette", name: "spinach", quantity: 1, unit: "cup" },
        { recipe_id: "recipe-steak", name: "eggs", quantity: 2, unit: "count" },
      ],
    }
  );
  try {
    assertClean(result.events);
    expect(toolOutput(result.events, "suggest_meal_plan")).toMatchObject({
      persisted: false,
      meals: [{ day: 1, slot: "lunch", title: "Spinach omelette", recipeId: "recipe-omelette" }],
    });
    expect(textDeltas(result.events).join("")).toContain("not saved");
    expect(paths(result, "/pivot_recipe_ingredient")).toContain("GET");
    expect(paths(result, "/recipe")).toContain("GET");
  } finally {
    await finish(result);
  }
});

it("suggests recipes that overlap the fridge", async () => {
  const result = await runScenario(
    "What can I cook from the fridge?",
    ({ body }) => {
      const hasToolResult = body.messages?.some((message) => message.role === "tool");
      if (!hasToolResult) {
        return {
          toolCalls: [{ id: "call_recipes", name: "suggest_recipes", arguments: { limit: 5 } }],
        };
      }
      return { textDeltas: ["You can cook Spinach omelette."] };
    },
    {
      stock: [
        {
          id: "stock-eggs",
          name: "eggs",
          quantity: 6,
          unit: "count",
          expiry_date: null,
          household_id: TEST_HOUSEHOLD_ID,
          added_by_user_id: null,
        },
        {
          id: "stock-spinach",
          name: "spinach",
          quantity: 1,
          unit: "bag",
          expiry_date: null,
          household_id: TEST_HOUSEHOLD_ID,
          added_by_user_id: null,
        },
      ],
      recipes: [omelette, cake],
      pivots: [
        { recipe_id: "recipe-omelette", name: "eggs", quantity: 2, unit: "count" },
        { recipe_id: "recipe-omelette", name: "spinach", quantity: 1, unit: "cup" },
        { recipe_id: "recipe-cake", name: "flour", quantity: 2, unit: "cup" },
        { recipe_id: "recipe-cake", name: "sugar", quantity: 1, unit: "cup" },
      ],
    }
  );
  try {
    assertClean(result.events);
    const output = toolOutput(result.events, "suggest_recipes") as {
      recipes: { title: string; coverage: number }[];
    };
    expect(output.recipes.map((recipe) => recipe.title)).toEqual(["Spinach omelette"]);
    expect(output.recipes[0]?.coverage).toBe(1);
    expect(textDeltas(result.events).join("")).toBe("You can cook Spinach omelette.");
    expect(result.model.requests[0]?.body).toMatchObject({
      tool_choice: { type: "function", function: { name: "suggest_recipes" } },
    });
  } finally {
    await finish(result);
  }
});

it("forwards incremental text deltas and the full answer", async () => {
  const result = await runScenario("How should I boil eggs?", () => ({
    textDeltas: ["Boil ", "the ", "eggs."],
  }));
  try {
    assertClean(result.events);
    expect(textDeltas(result.events)).toEqual(["Boil ", "the ", "eggs."]);
    expect(textDeltas(result.events).join("")).toBe("Boil the eggs.");
    expect(result.events.some((event) => event.type === "tool-call")).toBe(false);
    expect(result.events.some((event) => event.type === "finish")).toBe(true);
    expect(
      result.model.requests.filter((request) => request.path.endsWith("/chat/completions"))
    ).toHaveLength(1);
  } finally {
    await finish(result);
  }
});

it("excludes plural allergens found past the first ingredient page", async () => {
  const result = await runScenario(
    "Suggest recipes without my allergens.",
    ({ body }) =>
      body.messages?.some((message) => message.role === "tool")
        ? { textDeltas: ["The peanut recipe is excluded."] }
        : { toolCalls: [{ id: "call_paged_recipes", name: "suggest_recipes", arguments: {} }] },
    {
      preferences: { allergens: ["peanuts"] },
      stock: [
        {
          id: "local-eggs",
          name: "eggs",
          quantity: 6,
          unit: "count",
          expiry_date: null,
          household_id: null,
          added_by_user_id: null,
        },
      ],
      recipes: [{ ...omelette, id: "large", title: "Peanut eggs" }, omelette],
      pivots: [
        ...Array.from({ length: 1001 }, (_, i) => ({
          recipe_id: "large",
          name: i === 1000 ? "peanuts" : "eggs",
          quantity: 1,
          unit: "count",
        })),
        { recipe_id: omelette.id, name: "eggs", quantity: 2, unit: "count" },
      ],
    }
  );
  try {
    assertClean(result.events);
    expect(toolOutput(result.events, "suggest_recipes")).toMatchObject({
      recipes: [{ title: omelette.title, coverage: 1 }],
      truncated: false,
    });
    const output = toolOutput(result.events, "suggest_recipes") as { recipes: { title: string }[] };
    expect(output.recipes.map((recipe) => recipe.title)).toEqual([omelette.title]);
    const pages = result.database.requests.filter((request) =>
      request.path.endsWith("/pivot_recipe_ingredient")
    );
    expect(pages.map((request) => new URLSearchParams(request.search).get("offset"))).toEqual([
      "0",
      "500",
      "1000",
    ]);
    expect(paths(result, "/stock")).toEqual([]);
  } finally {
    await finish(result);
  }
});

it("stops the tool loop after 5 model calls", async () => {
  const result = await runScenario("Keep adding eggs.", ({ requestIndex }) => ({
    toolCalls: [
      {
        id: `call_step_${requestIndex}`,
        name: "manage_ingredients",
        arguments: {
          action: "add",
          name: "eggs",
          quantity: requestIndex + 1,
          unit: "count",
        },
      },
    ],
  }));
  try {
    assertClean(result.events);
    const completions = result.model.requests.filter((request) =>
      request.path.endsWith("/chat/completions")
    );
    expect(completions).toHaveLength(5);
    expect(result.events.filter((event) => event.type === "tool-result")).toHaveLength(5);
    expect(result.events.some((event) => event.type === "finish")).toBe(true);
    expect(result.pantry.items).toHaveLength(5);
    expect(result.pantry.changes).toBe(5);
    expect(paths(result, "/stock")).toEqual([]);
  } finally {
    await finish(result);
  }
});
