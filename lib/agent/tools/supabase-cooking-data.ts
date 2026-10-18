import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/supabase/supabase-types";
import type {
  CatalogIngredient,
  CatalogRecipe,
  CookingDataClient,
  DietProfile,
  PantryItem,
} from "./planning";
import { EMPTY_DIET_PROFILE } from "./planning";

const STOCK_COLUMNS = "id, name, quantity, unit, expiry_date, household_id, added_by_user_id";
const RECIPE_COLUMNS =
  "id, title, tags, allergens, calories, protein, carbs, fat, fiber, servings, cook_minutes";
const PIVOT_LIMIT = 800;

interface QueryError {
  message: string;
}

interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
}

interface FilterBuilder<T> extends PromiseLike<QueryResult<T[]>> {
  select(columns: string): FilterBuilder<T>;
  eq(column: string, value: string): FilterBuilder<T>;
  ilike(column: string, value: string): FilterBuilder<T>;
  in(column: string, values: readonly string[]): FilterBuilder<T>;
  limit(count: number): FilterBuilder<T>;
  insert(row: Record<string, unknown>): FilterBuilder<T>;
  delete(): FilterBuilder<T>;
  single(): PromiseLike<QueryResult<T>>;
  maybeSingle(): PromiseLike<QueryResult<T>>;
}

export interface CookingSupabase {
  auth: {
    getSession(): Promise<{
      data: { session: { user: { id: string } } | null };
      error: QueryError | null;
    }>;
  };
  from(table: string): FilterBuilder<Record<string, unknown>>;
}

function asCookingSupabase(client: SupabaseClient<Database>): CookingSupabase {
  return client as unknown as CookingSupabase;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toPantryItem(row: Record<string, unknown>): PantryItem | null {
  const id = asString(row.id);
  const name = asString(row.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    quantity: asNumber(row.quantity),
    unit: asString(row.unit),
    expiryDate: asString(row.expiry_date),
    householdId: asString(row.household_id),
    addedByUserId: asString(row.added_by_user_id),
  };
}

async function rowsOf(
  query: PromiseLike<QueryResult<Record<string, unknown>[]>>
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  const { data, error } = await query;
  if (error) return { rows: [], error: error.message };
  return { rows: data ?? [], error: null };
}

function parseMacroTarget(value: unknown): DietProfile["macroTarget"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const target: NonNullable<DietProfile["macroTarget"]> = {};
  if (typeof record.calories === "number") target.calories = record.calories;
  if (typeof record.proteinG === "number") target.proteinG = record.proteinG;
  if (typeof record.carbsG === "number") target.carbsG = record.carbsG;
  if (typeof record.fatG === "number") target.fatG = record.fatG;
  return Object.keys(target).length > 0 ? target : null;
}

export function parseCloudPreferences(value: unknown): DietProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const diet = asString(record.diet);
  const allergens = [...asStringList(record.allergens), ...asStringList(record.otherAllergens)];
  const macroTarget = parseMacroTarget(record.macroTarget);
  if (!diet && allergens.length === 0 && !macroTarget) return null;
  return {
    diet: diet && diet !== "none" ? diet : null,
    allergens,
    macroTarget,
    source: "supabase",
  };
}

export function mergeDietProfiles(
  device: DietProfile | null,
  cloud: DietProfile | null
): DietProfile {
  if (!device && !cloud) return EMPTY_DIET_PROFILE;
  const allergens = [...new Set([...(device?.allergens ?? []), ...(cloud?.allergens ?? [])])];
  return {
    diet: device?.diet ?? cloud?.diet ?? null,
    allergens,
    macroTarget: device?.macroTarget ?? cloud?.macroTarget ?? null,
    source: device && cloud ? "merged" : device ? "device" : "supabase",
  };
}

async function requireUserId(client: CookingSupabase): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(error.message);
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Sign in to use pantry tools.");
  return userId;
}

async function householdIdFor(client: CookingSupabase, userId: string): Promise<string | null> {
  const { rows, error } = await rowsOf(
    client.from("household_members").select("household_id").eq("user_id", userId).limit(1)
  );
  if (error) return null;
  return asString(rows[0]?.household_id);
}

export function createSupabaseCookingDataClient(
  client: SupabaseClient<Database> | CookingSupabase,
  readDeviceProfile: () => DietProfile | null = () => null
): CookingDataClient {
  const supabase = client as CookingSupabase;

  return {
    async listPantry() {
      const userId = await requireUserId(supabase);
      const householdId = await householdIdFor(supabase, userId);
      const own = await rowsOf(
        supabase.from("stock").select(STOCK_COLUMNS).eq("added_by_user_id", userId).limit(200)
      );
      if (own.error) throw new Error(own.error);
      const shared = householdId
        ? await rowsOf(
            supabase.from("stock").select(STOCK_COLUMNS).eq("household_id", householdId).limit(200)
          )
        : { rows: [], error: null };
      if (shared.error) throw new Error(shared.error);
      const byId = new Map<string, PantryItem>();
      for (const row of [...own.rows, ...shared.rows]) {
        const item = toPantryItem(row);
        if (item) byId.set(item.id, item);
      }
      return [...byId.values()];
    },

    async addIngredient(input) {
      try {
        const userId = await requireUserId(supabase);
        const householdId = await householdIdFor(supabase, userId);
        const match = await rowsOf(
          supabase.from("base_ingredient").select("id, name").ilike("name", input.name).limit(1)
        );
        const baseIngredientId = asString(match.rows[0]?.id);
        const payload: Record<string, unknown> = {
          name: input.name,
          added_by_user_id: userId,
          household_id: householdId,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
        };
        if (baseIngredientId) payload.base_ingredient_id = baseIngredientId;
        const { data, error } = await supabase
          .from("stock")
          .insert(payload)
          .select(STOCK_COLUMNS)
          .single();
        if (error) return { ok: false, error: error.message };
        const item = data ? toPantryItem(data) : null;
        if (!item) return { ok: false, error: "The pantry insert did not return a row." };
        return { ok: true, item };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Couldn't add that ingredient.",
        };
      }
    },

    async removeIngredient(input) {
      try {
        const pantry = await this.listPantry();
        const name = input.name?.trim().toLowerCase();
        const matches = pantry.filter((item) => {
          if (input.stockId) return item.id === input.stockId;
          return Boolean(name) && item.name.trim().toLowerCase() === name;
        });
        if (!input.stockId && !name) {
          return { ok: false, error: "Say which ingredient to remove." };
        }
        if (matches.length === 0) return { ok: true, removed: [] };
        const ids = matches.map((item) => item.id);
        const { data, error } = await supabase
          .from("stock")
          .delete()
          .in("id", ids)
          .select(STOCK_COLUMNS);
        if (error) return { ok: false, error: error.message };
        const removed = (data ?? [])
          .map((row) => toPantryItem(row))
          .filter((item): item is PantryItem => item !== null);
        return { ok: true, removed };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Couldn't remove that ingredient.",
        };
      }
    },

    async getDietProfile() {
      const device = readDeviceProfile();
      let cloud: DietProfile | null = null;
      try {
        const userId = await requireUserId(supabase);
        const { data, error } = await supabase
          .from("users")
          .select("preferences")
          .eq("id", userId)
          .maybeSingle();
        if (!error && data) cloud = parseCloudPreferences(data.preferences);
      } catch {
        cloud = null;
      }
      return mergeDietProfiles(device, cloud);
    },

    async listRecipes() {
      const { rows, error } = await rowsOf(
        supabase
          .from("pivot_recipe_ingredient")
          .select("recipe_id, name, quantity, unit")
          .limit(PIVOT_LIMIT)
      );
      if (error) throw new Error(error);
      const ingredientsByRecipe = new Map<string, CatalogIngredient[]>();
      for (const row of rows) {
        const recipeId = asString(row.recipe_id);
        const name = asString(row.name);
        if (!recipeId || !name) continue;
        const list = ingredientsByRecipe.get(recipeId) ?? [];
        list.push({ name, quantity: asNumber(row.quantity), unit: asString(row.unit) });
        ingredientsByRecipe.set(recipeId, list);
      }
      const ids = [...ingredientsByRecipe.keys()];
      if (ids.length === 0) return { recipes: [], truncated: false };
      const recipesResult = await rowsOf(
        supabase.from("recipe").select(RECIPE_COLUMNS).in("id", ids).limit(ids.length)
      );
      if (recipesResult.error) throw new Error(recipesResult.error);
      const recipes: CatalogRecipe[] = [];
      for (const row of recipesResult.rows) {
        const id = asString(row.id);
        const title = asString(row.title);
        if (!id || !title) continue;
        recipes.push({
          id,
          title,
          tags: asStringList(row.tags),
          allergens: asStringList(row.allergens),
          calories: asNumber(row.calories),
          protein: asNumber(row.protein),
          carbs: asNumber(row.carbs),
          fat: asNumber(row.fat),
          fiber: asNumber(row.fiber),
          servings: asNumber(row.servings),
          cookMinutes: asNumber(row.cook_minutes),
          ingredients: ingredientsByRecipe.get(id) ?? [],
        });
      }
      return { recipes, truncated: rows.length >= PIVOT_LIMIT };
    },
  };
}

export function createSignedOutCookingDataClient(message: string): CookingDataClient {
  const failure = async () => {
    throw new Error(message);
  };
  return {
    listPantry: failure,
    addIngredient: async () => ({ ok: false, error: message }),
    removeIngredient: async () => ({ ok: false, error: message }),
    getDietProfile: async () => EMPTY_DIET_PROFILE,
    listRecipes: failure,
  };
}

export { asCookingSupabase };
