import { Q, type Database } from "@nozbe/watermelondb";
import { database as appDatabase } from "~/data/db/database";
import type Stock from "~/data/db/models/Stock";
import { storageFacade } from "~/data/storage";
import { ingredientClarification } from "~/utils/ingredient-identity";
import { log } from "~/utils/logger";
import { ingredientCatalog } from "./ingredientCatalog";
import type { IngredientCatalogService } from "./IngredientCatalogService";

const BATCH_SIZE = 50;
const CURSOR_KEY = "ingredient_catalog_link_cursor_v1";
type Catalog = Pick<IngredientCatalogService, "hasSnapshot" | "resolveLocal" | "byId" | "refresh">;
interface LinkBatchResult {
  scanned: number;
  linked: number;
  invalidReferences: number;
  cursor: string | null;
  done: boolean;
}

/** Exact catalog matches only. Resolution happens before entering the stock writer. */
export async function linkStockCatalogBatch(
  database: Database,
  catalog: Catalog,
  options: { cursor?: string | null } = {}
): Promise<LinkBatchResult> {
  if (!(await catalog.hasSnapshot()))
    return {
      scanned: 0,
      linked: 0,
      invalidReferences: 0,
      cursor: options.cursor ?? null,
      done: true,
    };
  const stocks = database.get<Stock>("stock");
  const rows = await stocks
    .query(
      ...(options.cursor ? [Q.where("id", Q.gt(options.cursor))] : []),
      Q.sortBy("id", Q.asc),
      Q.take(BATCH_SIZE)
    )
    .fetch();
  let invalidReferences = 0;
  const candidates: Array<{ id: string; name: string; catalogId: string }> = [];
  for (const stock of rows) {
    const { id, name, baseIngredientId } = stock;
    if (baseIngredientId) {
      const canonical = await catalog.byId(baseIngredientId);
      const matchingName = await catalog.resolveLocal(name);
      if (!canonical || matchingName?.id !== baseIngredientId) invalidReferences++;
    } else if (!ingredientClarification(name)) {
      const match = await catalog.resolveLocal(name);
      if (match) candidates.push({ id, name, catalogId: match.id });
    }
  }
  let linked = 0;
  if (candidates.length) {
    await database.write(async () => {
      const operations: Stock[] = [];
      for (const candidate of candidates) {
        const row = await stocks.find(candidate.id).catch(() => null);
        if (
          !row ||
          row._raw._status === "deleted" ||
          row.name !== candidate.name ||
          row.baseIngredientId
        )
          continue;
        operations.push(
          row.prepareUpdate((stock) => {
            stock.baseIngredientId = candidate.catalogId;
          })
        );
      }
      await database.batch(operations);
      linked = operations.length;
    });
  }
  const done = rows.length < BATCH_SIZE;
  return {
    scanned: rows.length,
    linked,
    invalidReferences,
    cursor: done ? null : rows[rows.length - 1]!.id,
    done,
  };
}

interface MaintenanceOptions {
  database?: Database;
  catalog?: Catalog;
  storage?: { getString(key: string): string | null; setString(key: string, value: string): void };
  schedule?: (callback: () => void) => () => void;
}

/** Idle batches keep startup and pantry interactions responsive; cursor survives interruption. */
export function startIngredientCatalogMaintenance(options: MaintenanceOptions = {}): () => void {
  const database = options.database ?? appDatabase;
  const catalog = options.catalog ?? ingredientCatalog;
  const storage = options.storage ?? storageFacade;
  const schedule =
    options.schedule ??
    ((callback: () => void) => {
      const handle = requestIdleCallback(callback);
      return () => cancelIdleCallback(handle);
    });
  let stopped = false;
  let cancelPending: (() => void) | undefined;
  let cursor = storage.getString(CURSOR_KEY);
  const step = async () => {
    if (stopped) return;
    try {
      const result = await linkStockCatalogBatch(database, catalog, { cursor });
      cursor = result.cursor;
      storage.setString(CURSOR_KEY, cursor ?? "");
      if (result.invalidReferences)
        log.warn("Ingredient catalog found invalid stock references", {
          count: result.invalidReferences,
        });
      if (!stopped && !result.done)
        cancelPending = schedule(() => {
          void step();
        });
    } catch {
      log.warn("Ingredient catalog background linking failed");
    }
  };
  cancelPending = schedule(() => {
    if (stopped) return;
    void catalog
      .refresh()
      .then(() => {
        if (!stopped) return step();
      })
      .catch(() => {
        log.warn("Ingredient catalog maintenance failed");
      });
  });
  return () => {
    stopped = true;
    cancelPending?.();
  };
}
