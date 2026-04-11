import { Q } from "@nozbe/watermelondb";
import IngredientSynonym from "../models/IngredientSynonym";
import { BaseRepository } from "./BaseRepository";
import { database } from "../database";
import { sanitizeSearchTerm } from "~/utils/input-sanitization";

export class IngredientSynonymRepository extends BaseRepository<IngredientSynonym> {
  constructor() {
    super("ingredient_synonym");
  }

  // Find synonyms for a stock item
  async findByStockId(stockId: string): Promise<IngredientSynonym[]> {
    return await this.collection.query(Q.where("stock_id", Q.eq(stockId))).fetch();
  }

  // Find stock IDs by synonym (for matching)
  async findStockIdsBySynonym(synonym: string): Promise<string[]> {
    const synonyms = await this.collection
      .query(Q.where("synonym", Q.like(sanitizeSearchTerm(synonym))))
      .fetch();
    return synonyms.map((syn) => syn.stockId);
  }

  // Find exact synonym match
  async findExactMatch(synonym: string): Promise<IngredientSynonym[]> {
    return await this.collection.query(Q.where("synonym", Q.eq(synonym.toLowerCase()))).fetch();
  }

  // Add synonym to stock
  async addSynonym(stockId: string, synonym: string): Promise<IngredientSynonym> {
    // Check if synonym already exists for this stock
    const existing = await this.collection
      .query(
        Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("synonym", Q.eq(synonym.toLowerCase())))
      )
      .fetch();

    if (existing.length > 0) {
      return existing[0]!;
    }

    return await this.create({
      stockId,
      synonym: synonym.toLowerCase(),
    });
  }

  // Remove synonym
  async removeSynonym(synonymId: string): Promise<void> {
    await this.delete(synonymId);
  }

  // Batch add synonyms to stock
  async addSynonymsToStock(stockId: string, synonyms: string[]): Promise<IngredientSynonym[]> {
    if (synonyms.length === 0) return [];

    const db = this.collection.database;
    const created: IngredientSynonym[] = [];

    await db.write(async () => {
      // ⚡ Bolt Performance Optimization:
      // Replaced N+1 individual .create() calls inside the loop with database.batch().
      // This is inside the write block to maintain transaction atomicity and prevent race conditions.
      const normalizedSynonyms = synonyms.map((s) => s.toLowerCase());

      const existing = await this.collection
        .query(
          Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("synonym", Q.oneOf(normalizedSynonyms)))
        )
        .fetch();

      const existingSet = new Set(existing.map((s) => s.synonym));
      existing.forEach((e) => created.push(e));

      const newSynonyms = normalizedSynonyms.filter((s) => !existingSet.has(s));
      // Deduplicate the new synonyms
      const uniqueNewSynonyms = Array.from(new Set(newSynonyms));

      if (uniqueNewSynonyms.length > 0) {
        const batchOps = uniqueNewSynonyms.map((synonym) =>
          this.collection.prepareCreate((record: any) => {
            record.stockId = stockId;
            record.synonym = synonym;
          })
        );

        await db.batch(...batchOps);

        // We can't directly get the created models from batch, but we can fetch them right after
        // because we are still within the same synchronous transaction block for other readers
        const newlyCreated = await this.collection
          .query(
            Q.and(
              Q.where("stock_id", Q.eq(stockId)),
              Q.where("synonym", Q.oneOf(uniqueNewSynonyms))
            )
          )
          .fetch();

        created.push(...newlyCreated);
      }
    });

    return created;
  }

  // Remove all synonyms for a stock
  async removeAllForStock(stockId: string): Promise<void> {
    const db = this.collection.database;

    await db.write(async () => {
      const synonyms = await this.collection.query(Q.where("stock_id", Q.eq(stockId))).fetch();
      await db.batch(...synonyms.map((syn) => syn.prepareMarkAsDeleted()));
    });
  }

  // Get all unique synonyms
  async getAllUniqueSynonyms(): Promise<string[]> {
    const synonyms = await this.findAll();
    const uniqueSet = new Set(synonyms.map((syn) => syn.synonym));
    return Array.from(uniqueSet).sort();
  }
}
