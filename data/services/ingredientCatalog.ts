import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as SupabaseDatabase } from "~/lib/supabase/supabase-types";
import { database } from "~/data/db/database";
import { supabase } from "~/lib/supabase/supabase-client";
import { IngredientCatalogService, type CatalogSnapshot } from "./IngredientCatalogService";

const PAGE_SIZE = 500;

/** Read-only, stable pagination. No partial snapshot reaches local storage. */
export async function fetchIngredientCatalogSnapshot(
  client: SupabaseClient<SupabaseDatabase>
): Promise<CatalogSnapshot> {
  const ingredients: CatalogSnapshot["ingredients"] = [];
  const aliases: CatalogSnapshot["aliases"] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("base_ingredient")
      .select("id,name")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Missing canonical catalog page");
    ingredients.push(...data.map((row) => ({ id: row.id, name: row.name })));
    if (data.length < PAGE_SIZE) break;
  }
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("ingredient_synonym")
      .select("id,base_ingredient_id,synonym")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Missing catalog alias page");
    aliases.push(
      ...data.flatMap((row) =>
        row.base_ingredient_id === null
          ? []
          : [{ baseIngredientId: row.base_ingredient_id, alias: row.synonym }]
      )
    );
    if (data.length < PAGE_SIZE) break;
  }
  return { ingredients, aliases };
}

// Constructing the service does not dereference the lazy WatermelonDB singleton.
export const ingredientCatalog = new IngredientCatalogService(database, async () => {
  if (!supabase) throw new Error("Catalog unavailable offline");
  return fetchIngredientCatalogSnapshot(supabase);
});
