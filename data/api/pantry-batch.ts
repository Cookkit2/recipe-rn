import { type Database, type Model } from "@nozbe/watermelondb";
import type {
  Stock,
  IngredientCategory,
  IngredientSynonym,
  StockCategory,
  StepsToStore,
} from "~/data/db/models";
import { normalizeIngredientIdentity, normalizeStockUnit } from "~/utils/ingredient-identity";
import { catalogIdentityForName } from "~/data/services/catalogIdentity";
import { resolvePantryItemReference, type PantryCreateInput } from "./api-helpers";

function batchKey(item: PantryCreateInput): string {
  return JSON.stringify([
    normalizeIngredientIdentity(item.name),
    normalizeStockUnit(item.unit),
    item.type,
    item.expiry_date?.getTime() ?? null,
    typeof item.image_url === "string" ? item.image_url : null,
    item.background_color ?? null,
    item.x ?? null,
    item.y ?? null,
    item.scale ?? null,
    [...new Set(item.categories?.map((category) => category.name) ?? [])].sort(),
    item.steps_to_store
      .map((step) => [step.sequence, step.title, step.description])
      .sort((a, b) => Number(a[0]) - Number(b[0])),
    [
      ...new Set(item.synonyms?.map((alias) => normalizeIngredientIdentity(alias.synonym)) ?? []),
    ].sort(),
  ]);
}

/** Resolve outside the writer, then choose rows and save all batch metadata atomically. */
export async function persistPantryBatch(
  database: Database,
  inputs: PantryCreateInput[],
  combineCompatible: boolean
): Promise<Stock[]> {
  const resolved = await Promise.all(
    inputs.map(async (item) => ({
      ...item,
      base_ingredient_id: await resolvePantryItemReference(item),
    }))
  );
  return database.write(async () => {
    const stocks = database.get<Stock>("stock");
    const [existing, existingCategories, existingLinks, existingSteps, existingAliases] =
      await Promise.all([
        stocks.query().fetch(),
        database.get<IngredientCategory>("ingredient_category").query().fetch(),
        database.get<StockCategory>("stock_category").query().fetch(),
        database.get<StepsToStore>("steps_to_store").query().fetch(),
        database.get<IngredientSynonym>("ingredient_synonym").query().fetch(),
      ]);
    const categories = database.get<IngredientCategory>("ingredient_category");
    const categoryMap = new Map(existingCategories.map((row) => [row.name, row]));
    const categoryNames = new Map(existingCategories.map((row) => [row.id, row.name]));
    const existingKeys = new Map(
      existing
        .filter((row) => !row.householdId && !row.addedByUserId)
        .map((row) => [
          row.id,
          batchKey({
            name: row.name,
            quantity: row.quantity,
            unit: row.unit,
            type: (row.storageType ?? "fridge") as PantryCreateInput["type"],
            expiry_date: row.expiryDate ?? undefined,
            category: "",
            image_url: row.imageUrl,
            background_color: row.backgroundColor,
            x: row.x,
            y: row.y,
            scale: row.scale,
            categories: existingLinks
              .filter((link) => link.stockId === row.id)
              .map((link) => ({
                id: link.categoryId,
                name: categoryNames.get(link.categoryId) ?? link.categoryId,
              })),
            steps_to_store: existingSteps.filter((step) => step.stockId === row.id),
            synonyms: existingAliases
              .filter((alias) => alias.stockId === row.id)
              .map((alias) => ({ id: alias.id, synonym: alias.synonym })),
          }),
        ])
    );
    // A shared display name cannot silently substitute a conflicting catalog ID.
    const identities = new Map<string, Set<string>>();
    for (const item of [
      ...existing.map((row) => ({ name: row.name, base_ingredient_id: row.baseIngredientId })),
      ...resolved,
    ]) {
      if (!item.base_ingredient_id) continue;
      const key = normalizeIngredientIdentity(item.name);
      const ids = identities.get(key) ?? new Set<string>();
      ids.add(item.base_ingredient_id);
      identities.set(key, ids);
    }
    for (const item of resolved)
      if ((identities.get(normalizeIngredientIdentity(item.name))?.size ?? 0) > 1)
        throw new Error("Conflicting catalog references. Choose the correct pantry entry first.");
    const aggregated = new Map<string, PantryCreateInput>();
    for (const item of resolved) {
      const key = combineCompatible ? batchKey(item) : String(aggregated.size);
      const prior = aggregated.get(key);
      if (prior) {
        prior.quantity += item.quantity;
        prior.base_ingredient_id = prior.base_ingredient_id ?? item.base_ingredient_id;
      } else aggregated.set(key, { ...item });
    }
    const operations: Model[] = [];
    const saved: Stock[] = [];
    for (const item of aggregated.values()) {
      const matches = combineCompatible
        ? existing.filter(
            (row) =>
              existingKeys.get(row.id) === batchKey(item) &&
              (!row.baseIngredientId ||
                !item.base_ingredient_id ||
                row.baseIngredientId === item.base_ingredient_id)
          )
        : [];
      const prior = matches.length === 1 ? matches[0] : undefined;
      const row = prior
        ? prior.prepareUpdate((record) => {
            record.quantity += item.quantity;
            if (item.base_ingredient_id) record.baseIngredientId = item.base_ingredient_id;
          })
        : stocks.prepareCreate((record) => {
            record.name = item.name;
            record.quantity = item.quantity;
            record.unit = item.unit;
            record.baseIngredientId = item.base_ingredient_id ?? null;
            record.expiryDate = item.expiry_date ?? null;
            record.storageType = item.type;
            record.imageUrl = typeof item.image_url === "string" ? item.image_url : undefined;
            record.backgroundColor = item.background_color;
            record.x = item.x;
            record.y = item.y;
            record.scale = item.scale;
          });
      operations.push(row);
      saved.push(row);
      if (prior) continue;
      const canonical = {
        id: item.base_ingredient_id ?? "",
        name: item.base_ingredient_name ?? item.name,
      };
      const aliases =
        catalogIdentityForName(canonical, item.synonyms?.map((syn) => syn.synonym) ?? [], item.name)
          ?.aliases ?? [];
      for (const alias of new Set(aliases))
        operations.push(
          database.get<IngredientSynonym>("ingredient_synonym").prepareCreate((record) => {
            record.stockId = row.id;
            record.synonym = alias.toLowerCase();
          })
        );
      for (const category of new Map(
        item.categories?.map((value) => [value.name, value])
      ).values()) {
        let cached = categoryMap.get(category.name);
        if (!cached) {
          cached = categories.prepareCreate((record) => {
            record.name = category.name;
            record.syncedAt = Date.now();
          });
          categoryMap.set(category.name, cached);
          operations.push(cached);
        }
        const categoryId = cached.id;
        operations.push(
          database.get<StockCategory>("stock_category").prepareCreate((record) => {
            record.stockId = row.id;
            record.categoryId = categoryId;
          })
        );
      }
      for (const step of item.steps_to_store)
        operations.push(
          database.get<StepsToStore>("steps_to_store").prepareCreate((record) => {
            record.stockId = row.id;
            record.title = step.title;
            record.description = step.description;
            record.sequence = step.sequence;
            record.syncedAt = Date.now();
          })
        );
    }
    if (operations.length) await database.batch(operations);
    return saved;
  });
}
