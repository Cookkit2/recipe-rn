import type { PantryAdditionReceipt } from "~/lib/agent/pantry-action";
import type { Database, Model } from "@nozbe/watermelondb";
import type Stock from "~/data/db/models/Stock";
import type IngredientSynonym from "~/data/db/models/IngredientSynonym";
import { catalogIdentityForName } from "~/data/services/catalogIdentity";
import type {
  AssistantPantryInput,
  AssistantPantryResult,
  PantryMutationProblem,
} from "~/types/AssistantPantryMutation";
import {
  ingredientClarification,
  isSameIngredient,
  normalizeIngredientIdentity,
  normalizeStockUnit,
} from "~/utils/ingredient-identity";

export interface ResolvedPantryIngredient {
  id: string;
  name: string;
  aliases: string[];
}

function clarify(question: string, rows: Stock[] = []): PantryMutationProblem {
  return {
    ok: false,
    status: "needs_clarification",
    question,
    candidates: rows.map((row) => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      storageType: row.storageType,
      expiryDate: row.expiryDate?.toISOString() ?? null,
    })),
  };
}

/** All decisions and writes share a Watermelon writer; catalog I/O stays outside it. */
export function createAssistantPantryMutator(
  database: Database,
  resolveIngredient: (name: string) => Promise<ResolvedPantryIngredient | null> = async () => null
) {
  return async (input: AssistantPantryInput): Promise<AssistantPantryResult<Stock>> => {
    const name = input.name?.trim().replace(/\s+/g, " ") ?? "";
    if (
      input.action === "add" ||
      input.action === "rename" ||
      (input.action === "merge" && Boolean(name))
    ) {
      const question = ingredientClarification(name);
      if (question) return clarify(question);
    }
    if (
      input.action === "add" &&
      input.quantity !== undefined &&
      (!Number.isFinite(input.quantity) || input.quantity <= 0)
    ) {
      return clarify("What positive quantity would you like to add?");
    }
    if (input.unit !== undefined && !input.unit.trim()) return clarify("Which unit should I use?");

    let resolved: ResolvedPantryIngredient | null = null;
    if (
      name &&
      (input.action === "add" ||
        input.action === "rename" ||
        (input.action === "merge" && Boolean(name)))
    ) {
      try {
        resolved = await resolveIngredient(name);
      } catch {
        /* Specific custom foods also work offline. */
      }
      // A catalog result must explicitly identify this name, never a broader food category.
      if (
        resolved &&
        (ingredientClarification(resolved.name) ||
          !isSameIngredient(resolved.name, name, resolved.aliases))
      )
        resolved = null;
      if (resolved) resolved = catalogIdentityForName(resolved, resolved.aliases, name);
    }
    const canonicalName = resolved?.name ?? name;
    const aliases = resolved?.aliases.filter((alias) => !ingredientClarification(alias)) ?? [];

    return database.write(async () => {
      const collection = database.get<Stock>("stock");
      const rows = await collection.query().fetch();
      const synonyms = await database.get<IngredientSynonym>("ingredient_synonym").query().fetch();
      const aliasesFor = (row: Stock) => {
        const stored = synonyms.filter((syn) => syn.stockId === row.id).map((syn) => syn.synonym);
        return (
          catalogIdentityForName(
            { id: row.baseIngredientId ?? row.id, name: row.name },
            stored,
            row.name
          )?.aliases ?? []
        );
      };
      // A legacy alias or a coarse catalog ID must not erase an explicit food form.
      const sameForm = (left: string, right: string) => {
        const a = normalizeIngredientIdentity(left);
        const b = normalizeIngredientIdentity(right);
        return a === b || (!` ${a} `.includes(` ${b} `) && !` ${b} `.includes(` ${a} `));
      };
      const conflictsWithResolved = (row: Stock) =>
        Boolean(row.baseIngredientId && resolved && row.baseIngredientId !== resolved.id);
      const matchesName = (row: Stock) =>
        (input.action === "remove" || !ingredientClarification(row.name)) &&
        [canonicalName, name, ...aliases].some(
          (query) =>
            sameForm(row.name, query) &&
            isSameIngredient(row.name, query, resolved ? [] : aliasesFor(row))
        );
      const selected = input.stockId ? rows.find((row) => row.id === input.stockId) : undefined;
      if (input.stockId && !selected)
        return clarify("That pantry entry no longer exists. Which entry should I use?");

      switch (input.action) {
        case "add": {
          const matches = rows.filter(matchesName);
          if (matches.some(conflictsWithResolved) || (selected && conflictsWithResolved(selected)))
            return clarify(
              "These entries have conflicting ingredient references. Which ingredient should this be?",
              matches
            );
          if (selected && !matchesName(selected))
            return clarify(
              "That entry is a different ingredient. Which entry should I update?",
              matches
            );
          if (!selected && matches.length > 1)
            return clarify("Which pantry entry should I add this to?", matches);
          const existing = selected ?? matches[0];
          const unit =
            input.unit?.trim() ??
            (existing && normalizeStockUnit(existing.unit) === "count" ? existing.unit : undefined);
          if (existing && !unit) return clarify("Which unit would you like to add?", [existing]);
          const quantity = input.quantity ?? 1;
          if (
            existing &&
            normalizeStockUnit(existing.unit) === normalizeStockUnit(unit ?? "count")
          ) {
            if (!Number.isFinite(existing.quantity + quantity))
              return clarify("That quantity is too large. What quantity should I add?");
            const knownAliases = new Set(
              [existing.name, ...aliasesFor(existing)].map(normalizeIngredientIdentity)
            );
            const newAliases = [...new Set([canonicalName, name, ...aliases])].filter(
              (alias) => !knownAliases.has(normalizeIngredientIdentity(alias))
            );
            await database.batch([
              existing.prepareUpdate((row) => {
                row.quantity += quantity;
                if (resolved) row.baseIngredientId = resolved.id;
              }),
              ...newAliases.map((alias) =>
                database.get<IngredientSynonym>("ingredient_synonym").prepareCreate((row) => {
                  row.stockId = existing.id;
                  row.synonym = alias.toLowerCase();
                })
              ),
            ]);
            return { ok: true, status: "updated", item: existing };
          }
          if (selected)
            return clarify("Those units cannot be combined. Which unit should I use?", [selected]);
          const created = collection.prepareCreate((row) => {
            row.name = canonicalName;
            row.baseIngredientId = resolved?.id ?? null;
            row.quantity = quantity;
            row.unit = unit ?? "count";
            row.storageType = "fridge";
          });
          const storedAliases = [...new Set([canonicalName, name, ...aliases])].filter(
            (alias) =>
              normalizeIngredientIdentity(alias) !== normalizeIngredientIdentity(canonicalName)
          );
          await database.batch([
            created,
            ...storedAliases.map((alias) =>
              database.get<IngredientSynonym>("ingredient_synonym").prepareCreate((row) => {
                row.stockId = created.id;
                row.synonym = alias.toLowerCase();
              })
            ),
          ]);
          return { ok: true, status: "added", item: created };
        }
        case "remove": {
          if (!selected && !name) return clarify("Which pantry entry would you like to remove?");
          const matches = selected ? [selected] : rows.filter(matchesName);
          if (matches.length > 1)
            return clarify("Which pantry entry would you like to remove?", matches);
          if (!matches.length)
            return clarify(
              "I couldn't find that ingredient. Which pantry entry would you like to remove?"
            );
          await database.batch(matches.map((row) => row.prepareMarkAsDeleted()));
          return { ok: true, status: "removed", removed: matches };
        }
        case "rename": {
          if (!selected) return clarify("Which pantry entry would you like to rename?", rows);
          const duplicates = rows.filter((row) => row.id !== selected.id && matchesName(row));
          if (duplicates.length && !input.keepSeparate)
            return clarify(
              "That ingredient already has a pantry entry. Keep these batches separate, or merge compatible entries?",
              [selected, ...duplicates]
            );
          const renamedReference =
            resolved?.id ??
            (isSameIngredient(selected.name, canonicalName, aliasesFor(selected))
              ? selected.baseIngredientId
              : null);
          // Old synonyms refer to the previous identity and must not follow a correction.
          await database.batch([
            selected.prepareUpdate((row) => {
              row.name = canonicalName;
              if (renamedReference === null) row.clearBaseIngredientReference();
              else row.baseIngredientId = renamedReference;
            }),
            ...synonyms
              .filter((syn) => syn.stockId === selected.id)
              .map((syn) => syn.prepareMarkAsDeleted()),
            ...aliases.map((alias) =>
              database.get<IngredientSynonym>("ingredient_synonym").prepareCreate((row) => {
                row.stockId = selected.id;
                row.synonym = alias;
              })
            ),
          ]);
          return { ok: true, status: "renamed", item: selected };
        }
        case "merge": {
          const target = rows.find((row) => row.id === input.targetStockId);
          if (!selected || !target || target.id === selected.id)
            return clarify("Which two different pantry entries would you like to merge?", rows);
          const identifiedVagueSource =
            Boolean(ingredientClarification(selected.name)) && Boolean(name) && matchesName(target);
          const compatible =
            !(
              selected.baseIngredientId &&
              target.baseIngredientId &&
              selected.baseIngredientId !== target.baseIngredientId
            ) &&
            !conflictsWithResolved(selected) &&
            !conflictsWithResolved(target) &&
            !ingredientClarification(target.name) &&
            (identifiedVagueSource ||
              (!ingredientClarification(selected.name) &&
                sameForm(selected.name, target.name) &&
                (isSameIngredient(selected.name, target.name, aliasesFor(selected)) ||
                  isSameIngredient(target.name, selected.name, aliasesFor(target))))) &&
            normalizeStockUnit(selected.unit) === normalizeStockUnit(target.unit) &&
            [
              "storageType",
              "imageUrl",
              "backgroundColor",
              "householdId",
              "addedByUserId",
              "x",
              "y",
              "scale",
            ].every((key) => selected[key as keyof Stock] === target[key as keyof Stock]) &&
            selected.expiryDate?.getTime() === target.expiryDate?.getTime() &&
            Number.isFinite(selected.quantity + target.quantity);
          if (!compatible)
            return clarify(
              "These entries have different ingredients, units or batch details. Keep them separate or correct those details first.",
              [selected, target]
            );
          const related: Model[] = [];
          for (const table of [
            "ingredient_synonym",
            "stock_category",
            "steps_to_store",
            "waste_log",
            "consumption_log",
          ]) {
            const records = await database.get<Model & { stockId: string }>(table).query().fetch();
            related.push(
              ...records
                .filter((row) => row.stockId === selected.id)
                .map((row) =>
                  table === "ingredient_synonym" && identifiedVagueSource
                    ? row.prepareMarkAsDeleted()
                    : row.prepareUpdate((record) => {
                        record.stockId = target.id;
                      })
                )
            );
          }
          const knownTargetAliases = [target.name, ...aliasesFor(target)].map(
            normalizeIngredientIdentity
          );
          const sourceName = identifiedVagueSource ? canonicalName : selected.name;
          if (!knownTargetAliases.includes(normalizeIngredientIdentity(sourceName))) {
            related.push(
              database.get<IngredientSynonym>("ingredient_synonym").prepareCreate((row) => {
                row.stockId = target.id;
                row.synonym = sourceName.toLowerCase();
              })
            );
          }
          await database.batch([
            target.prepareUpdate((row) => {
              row.quantity += selected.quantity;
              row.baseIngredientId =
                resolved?.id ?? target.baseIngredientId ?? selected.baseIngredientId ?? null;
            }),
            ...related,
            selected.prepareMarkAsDeleted(),
          ]);
          return { ok: true, status: "merged", item: target };
        }
      }
    });
  };
}

/** Undo only a newly created, unchanged row. A later edit/consumption must win. */
export async function undoAssistantPantryAddition(
  database: Database,
  receipt: PantryAdditionReceipt
) {
  return database.write(async () => {
    const row = await database
      .get<Stock>("stock")
      .find(receipt.id)
      .catch(() => null);
    if (!row) return;
    if (
      row.updatedAt.getTime() !== Date.parse(receipt.updatedAt) ||
      row.name !== receipt.name ||
      row.quantity !== receipt.quantity ||
      row.unit !== receipt.unit ||
      row.storageType !== receipt.storageType
    ) {
      throw new Error("This item has changed. Review it in Pantry before making another change.");
    }
    const related: Model[] = [];
    for (const table of [
      "ingredient_synonym",
      "stock_category",
      "steps_to_store",
      "consumption_log",
      "waste_log",
    ]) {
      const rows = (await database.get<Model & { stockId: string }>(table).query().fetch()).filter(
        (item) => item.stockId === row.id
      );
      if ((table === "consumption_log" || table === "waste_log") && rows.length)
        throw new Error("This item has been used. Review it in Pantry.");
      related.push(...rows);
    }
    await database.batch([
      ...related.map((item) => item.prepareMarkAsDeleted()),
      row.prepareMarkAsDeleted(),
    ]);
  });
}
