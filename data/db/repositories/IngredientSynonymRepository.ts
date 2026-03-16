import { Q } from "@nozbe/watermelondb";
import IngredientSynonym from "../models/IngredientSynonym";
import { BaseRepository } from "./BaseRepository";

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
      .query(Q.where("synonym", Q.like(`%${Q.sanitizeLikeString(synonym)}%`)))
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
    if (!synonyms || synonyms.length === 0) {
      return [];
    }

    const db = this.collection.database;

    // Deduplicate and lowercase input to avoid Invariant Violation in batch create
    const uniqueLowerSynonyms = Array.from(new Set(synonyms.map((s) => s.toLowerCase())));

    let result: IngredientSynonym[] = [];

    await db.write(async () => {
      // Chunk the queries to stay within SQLite parameter limits (using a conservative chunk size)
      const CHUNK_SIZE = 500;
      const existingRecords: IngredientSynonym[] = [];

      for (let i = 0; i < uniqueLowerSynonyms.length; i += CHUNK_SIZE) {
        const chunk = uniqueLowerSynonyms.slice(i, i + CHUNK_SIZE);
        const chunkRecords = await this.collection
          .query(Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("synonym", Q.oneOf(chunk))))
          .fetch();
        existingRecords.push(...chunkRecords);
      }

      const existingSynonymsSet = new Set(existingRecords.map((r) => r.synonym));

      // Find synonyms that don't exist yet
      const toCreate = uniqueLowerSynonyms.filter((s) => !existingSynonymsSet.has(s));

      // Prepare records for batch creation
      const newRecords = toCreate.map((syn) =>
        this.collection.prepareCreate((record: any) => {
          record.stockId = stockId;
          record.synonym = syn;
        })
      );

      // Execute batch create if there are any new records
      if (newRecords.length > 0) {
        // WatermelonDB batch accepts an array of prepared operations
        await db.batch(...newRecords);
      }

      // Combine existing and newly created records
      result = [...existingRecords, ...(newRecords as unknown as IngredientSynonym[])];
    });

    return result;
  }

  // Remove all synonyms for a stock
  async removeAllForStock(stockId: string): Promise<void> {
    const db = this.collection.database;

    await db.write(async () => {
      const synonyms = await this.collection.query(Q.where("stock_id", Q.eq(stockId))).fetch();
      await Promise.all(synonyms.map((syn) => syn.markAsDeleted()));
    });
  }

  // Get all unique synonyms
  async getAllUniqueSynonyms(): Promise<string[]> {
    const synonyms = await this.findAll();
    const uniqueSet = new Set(synonyms.map((syn) => syn.synonym));
    return Array.from(uniqueSet).sort();
  }
}
