import { Q, type Database } from "@nozbe/watermelondb";
import type BaseIngredientCache from "~/data/db/models/BaseIngredientCache";
import type BaseIngredientAliasCache from "~/data/db/models/BaseIngredientAliasCache";
import { normalizeIngredientIdentity } from "~/utils/ingredient-identity";
import { log } from "~/utils/logger";
import { catalogIdentityForName, type CatalogIdentity } from "./catalogIdentity";

export interface CatalogSnapshot {
  ingredients: Array<{ id: string; name: string }>;
  aliases: Array<{ baseIngredientId: string; alias: string }>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MISS_REFRESH_INTERVAL = 60_000;

function validateSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  if (!snapshot.ingredients.length) throw new Error("Empty catalog snapshot");
  const ingredients = new Map<string, { id: string; name: string }>();
  for (const row of snapshot.ingredients) {
    if (!UUID.test(row.id) || !row.name?.trim() || !normalizeIngredientIdentity(row.name))
      throw new Error("Invalid catalog ingredient");
    const prior = ingredients.get(row.id);
    if (prior && prior.name !== row.name) throw new Error("Conflicting catalog identity");
    ingredients.set(row.id, row);
  }
  const aliases = new Map<string, CatalogSnapshot["aliases"][number]>();
  for (const row of snapshot.aliases) {
    const key = normalizeIngredientIdentity(row.alias);
    if (!ingredients.has(row.baseIngredientId) || !key) throw new Error("Invalid catalog alias");
    aliases.set(
      `${row.baseIngredientId}:${key}`,
      aliases.get(`${row.baseIngredientId}:${key}`) ?? row
    );
  }
  return { ingredients: [...ingredients.values()], aliases: [...aliases.values()] };
}

export class IngredientCatalogService {
  private inFlight: Promise<boolean> | null = null;
  private lastRefreshAttempt = -Infinity;

  constructor(
    private readonly database: Database,
    private readonly fetchSnapshot: () => Promise<CatalogSnapshot>
  ) {}

  async hasSnapshot(): Promise<boolean> {
    return (
      (await this.database.get<BaseIngredientCache>("base_ingredient_cache").query().fetchCount()) >
      0
    );
  }

  /** Complete approved aliases, including coarse catalog forms. Use resolve for matching. */
  async byId(id: string): Promise<CatalogIdentity | null> {
    return this.database.read(() => this.readById(id));
  }

  private async readById(id: string): Promise<CatalogIdentity | null> {
    if (!UUID.test(id)) return null;
    const rows = await this.database
      .get<BaseIngredientCache>("base_ingredient_cache")
      .query(Q.where("catalog_id", id))
      .fetch();
    const row = rows[0];
    if (!row || rows.length !== 1) return null;
    const aliases = await this.database
      .get<BaseIngredientAliasCache>("base_ingredient_alias_cache")
      .query(Q.where("base_ingredient_id", id))
      .fetch();
    return {
      id: row.catalogId,
      name: row.name,
      aliases: aliases.map((alias) => alias.alias).sort(),
    };
  }

  async resolveLocal(name: string): Promise<CatalogIdentity | null> {
    const key = normalizeIngredientIdentity(name);
    if (!key) return null;
    return this.database.read(async () => {
      const canonical = await this.database
        .get<BaseIngredientCache>("base_ingredient_cache")
        .query(Q.where("lookup_key", key))
        .fetch();
      const aliases = await this.database
        .get<BaseIngredientAliasCache>("base_ingredient_alias_cache")
        .query(Q.where("lookup_key", key))
        .fetch();
      const ids = new Set([
        ...canonical.map((row) => row.catalogId),
        ...aliases.map((row) => row.baseIngredientId),
      ]);
      if (ids.size !== 1) return null;
      const id = [...ids][0]!;
      const match = await this.readById(id);
      if (!match) return null;
      // An approved alias may itself belong to multiple IDs. Never export it
      // as an equivalence through an otherwise unique canonical lookup.
      const keys = [...new Set(match.aliases.map(normalizeIngredientIdentity))];
      let approvedAliases = match.aliases;
      if (keys.length) {
        const canonicalAliases = await this.database
          .get<BaseIngredientCache>("base_ingredient_cache")
          .query(Q.where("lookup_key", Q.oneOf(keys)))
          .fetch();
        const allAliases = await this.database
          .get<BaseIngredientAliasCache>("base_ingredient_alias_cache")
          .query(Q.where("lookup_key", Q.oneOf(keys)))
          .fetch();
        const idsForKey = new Map<string, Set<string>>();
        for (const row of canonicalAliases) {
          const values = idsForKey.get(row.lookupKey) ?? new Set<string>();
          values.add(row.catalogId);
          idsForKey.set(row.lookupKey, values);
        }
        for (const row of allAliases) {
          const values = idsForKey.get(row.lookupKey) ?? new Set<string>();
          values.add(row.baseIngredientId);
          idsForKey.set(row.lookupKey, values);
        }
        approvedAliases = match.aliases.filter(
          (alias) => idsForKey.get(normalizeIngredientIdentity(alias))?.size === 1
        );
      }
      return catalogIdentityForName(match, approvedAliases, name);
    });
  }

  async resolve(name: string): Promise<CatalogIdentity | null> {
    const local = await this.resolveLocal(name);
    if (local) return local;
    if (this.inFlight) await this.inFlight;
    else if (Date.now() - this.lastRefreshAttempt >= MISS_REFRESH_INTERVAL) await this.refresh();
    return this.resolveLocal(name);
  }

  refresh(): Promise<boolean> {
    if (this.inFlight) return this.inFlight;
    this.lastRefreshAttempt = Date.now();
    this.inFlight = this.replaceSnapshot().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async replaceSnapshot(): Promise<boolean> {
    try {
      const snapshot = validateSnapshot(await this.fetchSnapshot());
      await this.database.write(async () => {
        const canonical = this.database.get<BaseIngredientCache>("base_ingredient_cache");
        const aliases = this.database.get<BaseIngredientAliasCache>("base_ingredient_alias_cache");
        const oldRows = [...(await canonical.query().fetch()), ...(await aliases.query().fetch())];
        await this.database.batch([
          ...oldRows.map((row) => row.prepareDestroyPermanently()),
          ...snapshot.ingredients.map((ingredient) =>
            canonical.prepareCreate((row) => {
              row.catalogId = ingredient.id;
              row.name = ingredient.name;
              row.lookupKey = normalizeIngredientIdentity(ingredient.name);
            })
          ),
          ...snapshot.aliases.map((alias) =>
            aliases.prepareCreate((row) => {
              row.baseIngredientId = alias.baseIngredientId;
              row.alias = alias.alias;
              row.lookupKey = normalizeIngredientIdentity(alias.alias);
            })
          ),
        ]);
      });
      return true;
    } catch {
      log.warn("Ingredient catalog refresh failed; retaining offline snapshot");
      return false;
    }
  }
}
