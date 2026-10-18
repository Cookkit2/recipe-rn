import {
  createSupabaseCookingDataClient,
  mergeDietProfiles,
  parseCloudPreferences,
} from "../tools/supabase-cooking-data";
import type { CookingSupabase } from "../tools/supabase-cooking-data";

type Row = Record<string, unknown>;

function createMemorySupabase(): CookingSupabase & { tables: Record<string, Row[]> } {
  const tables: Record<string, Row[]> = {
    stock: [],
    household_members: [{ user_id: "user-1", household_id: "house-1" }],
    base_ingredient: [{ id: "base-egg", name: "eggs" }],
    users: [{ id: "user-1", preferences: { diet: "vegetarian", allergens: ["peanuts"] } }],
    pivot_recipe_ingredient: [],
    recipe: [],
  };

  function from(table: string) {
    let working = (tables[table] ?? []).map((row) => ({ ...row }));
    let mode: "select" | "insert" | "delete" = "select";
    let inserted: Row | null = null;

    const finishMany = () => {
      if (mode === "insert" && inserted) {
        tables[table] = [...(tables[table] ?? []), inserted];
        return { data: [inserted], error: null };
      }
      if (mode === "delete") {
        const ids = new Set(working.map((row) => row.id));
        const removed = (tables[table] ?? []).filter((row) => ids.has(row.id));
        tables[table] = (tables[table] ?? []).filter((row) => !ids.has(row.id));
        return { data: removed, error: null };
      }
      return { data: working, error: null };
    };

    const api = {
      select() {
        return api;
      },
      eq(column: string, value: string) {
        working = working.filter((row) => row[column] === value);
        return api;
      },
      ilike(column: string, value: string) {
        working = working.filter(
          (row) => String(row[column] ?? "").toLowerCase() === value.toLowerCase()
        );
        return api;
      },
      in(column: string, values: readonly string[]) {
        const allowed = new Set(values);
        working = working.filter((row) => allowed.has(String(row[column])));
        return api;
      },
      limit(count: number) {
        working = working.slice(0, count);
        return api;
      },
      order(column: string) {
        working.sort((a, b) => String(a[column]).localeCompare(String(b[column])));
        return api;
      },
      range(from: number, to: number) {
        working = working.slice(from, to + 1);
        return api;
      },
      insert(row: Row) {
        mode = "insert";
        inserted = { id: `id-${(tables[table] ?? []).length + 1}`, ...row };
        return api;
      },
      delete() {
        mode = "delete";
        return api;
      },
      maybeSingle() {
        const many = finishMany();
        return Promise.resolve({ data: many.data?.[0] ?? null, error: null });
      },
      single() {
        const many = finishMany();
        const row = many.data?.[0];
        if (!row) return Promise.resolve({ data: null, error: { message: "No row" } });
        return Promise.resolve({ data: row, error: null });
      },
      then(
        resolve: (value: { data: Row[] | null; error: { message: string } | null }) => void,
        reject?: (reason: unknown) => void
      ) {
        return Promise.resolve(finishMany()).then(resolve, reject);
      },
    };
    return api as ReturnType<CookingSupabase["from"]>;
  }

  return {
    tables,
    auth: {
      async getSession() {
        return { data: { session: { user: { id: "user-1" } } }, error: null };
      },
    },
    from,
  };
}

it("parses cloud diet preferences", () => {
  expect(
    parseCloudPreferences({ diet: "vegan", allergens: ["soy"], macroTarget: { calories: 1800 } })
  ).toMatchObject({
    diet: "vegan",
    allergens: ["soy"],
    macroTarget: { calories: 1800 },
    source: "supabase",
  });
});

it("lets device diet win and keeps both allergen lists", () => {
  expect(
    mergeDietProfiles(
      { diet: "vegan", allergens: ["soy"], macroTarget: null, source: "device" },
      {
        diet: "vegetarian",
        allergens: ["peanuts"],
        macroTarget: { calories: 1600 },
        source: "supabase",
      }
    )
  ).toEqual({
    diet: "vegan",
    allergens: ["soy", "peanuts"],
    macroTarget: { calories: 1600 },
    source: "merged",
  });
});

it("adds and removes a stock row for the signed-in user", async () => {
  const supabase = createMemorySupabase();
  const data = createSupabaseCookingDataClient(supabase);
  const added = await data.addIngredient({ name: "eggs", quantity: 6, unit: "count" });
  expect(added.ok).toBe(true);
  if (!added.ok) return;
  expect(added.item.addedByUserId).toBe("user-1");
  expect(added.item.householdId).toBe("house-1");
  expect(supabase.tables.stock?.[0]?.base_ingredient_id).toBe("base-egg");

  const pantry = await data.listPantry();
  expect(pantry.map((item) => item.name)).toEqual(["eggs"]);

  const removed = await data.removeIngredient({ name: "Eggs" });
  expect(removed).toMatchObject({ ok: true, removed: [{ name: "eggs" }] });
  expect(supabase.tables.stock).toEqual([]);
});

it("reads the merged diet profile from the users table", async () => {
  const supabase = createMemorySupabase();
  const data = createSupabaseCookingDataClient(supabase, () => ({
    diet: null,
    allergens: ["milk"],
    macroTarget: null,
    source: "device",
  }));
  await expect(data.getDietProfile()).resolves.toMatchObject({
    diet: "vegetarian",
    allergens: ["milk", "peanuts"],
    source: "merged",
  });
});

it("loads every ingredient across pages before returning a recipe", async () => {
  const supabase = createMemorySupabase();
  supabase.tables.recipe = [{ id: "r1", title: "Complete recipe" }];
  supabase.tables.pivot_recipe_ingredient = Array.from({ length: 1001 }, (_, i) => ({
    id: String(i).padStart(4, "0"),
    recipe_id: "r1",
    name: i === 1000 ? "peanuts" : `ingredient-${i}`,
  }));
  const catalog = await createSupabaseCookingDataClient(supabase).listRecipes();
  expect(catalog.recipes[0]?.ingredients).toHaveLength(1001);
  expect(catalog.recipes[0]?.ingredients.at(-1)?.name).toBe("peanuts");
  expect(catalog.truncated).toBe(false);
});

it("bounds parent recipes while keeping their ingredient lists complete", async () => {
  const supabase = createMemorySupabase();
  supabase.tables.recipe = Array.from({ length: 101 }, (_, i) => ({
    id: String(i).padStart(3, "0"),
    title: `Recipe ${i}`,
  }));
  supabase.tables.pivot_recipe_ingredient = supabase.tables.recipe.flatMap((recipe) =>
    Array.from({ length: 10 }, (_, i) => ({
      id: `${recipe.id}-${i}`,
      recipe_id: recipe.id,
      name: `ingredient-${i}`,
    }))
  );
  const catalog = await createSupabaseCookingDataClient(supabase).listRecipes();
  expect(catalog.recipes).toHaveLength(100);
  expect(catalog.truncated).toBe(true);
  expect(catalog.recipes.every((recipe) => recipe.ingredients.length === 10)).toBe(true);
  expect(catalog.recipes.some((recipe) => recipe.id === "100")).toBe(false);
});
