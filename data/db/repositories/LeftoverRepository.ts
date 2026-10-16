import { Q } from "@nozbe/watermelondb";
import LeftoverModel from "../models/Leftover";
import { BaseRepository } from "./BaseRepository";
import { database } from "../database";
import type { Leftover, LeftoverInput, LeftoverStatus } from "~/types/Leftover";
import { validateLeftover } from "~/utils/leftovers";

export function leftoverFromModel(row: LeftoverModel): Leftover {
  return {
    id: row.id,
    name: row.name,
    servings: row.servings,
    cookedAt: row.cookedAt,
    recipeId: row.recipeId ?? undefined,
    remindAt: row.remindAtMs == null ? undefined : new Date(row.remindAtMs),
    status: row.status,
  };
}

export class LeftoverRepository extends BaseRepository<LeftoverModel> {
  constructor() {
    super("leftover");
  }
  async listActive(): Promise<Leftover[]> {
    return (
      await this.collection.query(Q.where("status", "active"), Q.sortBy("cooked_at", Q.asc)).fetch()
    ).map(leftoverFromModel);
  }
  async save(input: LeftoverInput, id?: string): Promise<Leftover> {
    validateLeftover(input);
    const assign = (row: LeftoverModel) => {
      row.name = input.name.trim();
      row.servings = input.servings;
      row.cookedAt = input.cookedAt;
      row.recipeId = input.recipeId ?? null;
      row.remindAtMs = input.remindAt?.getTime() ?? null;
      row.status = "active";
      row.updatedAt = new Date();
    };
    return database.write(async () => {
      const row = id ? await this.collection.find(id) : null;
      const saved = row
        ? await row.update(assign)
        : await this.collection.create((record) => {
            assign(record);
            record.createdAt = new Date();
          });
      return leftoverFromModel(saved);
    });
  }
  async setStatus(id: string, status: LeftoverStatus): Promise<void> {
    await database.write(async () => {
      const row = await this.collection.find(id);
      await row.update((record) => {
        record.status = status;
        record.updatedAt = new Date();
      });
    });
  }
}
