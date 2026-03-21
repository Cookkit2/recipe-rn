import { Q } from "@nozbe/watermelondb";
import IngredientSynonym from "../models/IngredientSynonym";
import { BaseRepository } from "./BaseRepository";
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
    const db = this.collection.database;
    const created: IngredientSynonym[] = [];

    await db.write(async () => {
      for (const synonym of synonyms) {
        // Check if synonym already exists for this stock (inline to avoid nested write)
        const existing = await this.collection
          .query(
            Q.and(
              Q.where("stock_id", Q.eq(stockId)),
              Q.where("synonym", Q.eq(synonym.toLowerCase()))
            )
          )
          .fetch();

        if (existing.length > 0) {
          created.push(existing[0]!);
        } else {
          const syn = await this.collection.create((record: any) => {
            record.stockId = stockId;
            record.synonym = synonym.toLowerCase();
          });
          created.push(syn);
        }
      }
    });

    return created;
  }

  // Remove all synonyms for a stock
  async removeAllForStock(stockId: string): Promise<void> {
    const db = this.collection.database;

    await db.write(async () => {
      const synonyms = await this.collection.query(Q.where("stock_id", Q.eq(stockId))).fetch();
      if (synonyms.length > 0) {
        // ⚡ Bolt Performance Optimization:
        // Use batch operation to mark multiple synonyms as deleted at once rather than
        // iterating with individual updates, reducing overhead and improving speed.
        await db.batch(...synonyms.map((syn) => syn.prepareMarkAsDeleted()));
      }
    });
  }

  // Get all unique synonyms
  async getAllUniqueSynonyms(): Promise<string[]> {
    const synonyms = await this.findAll();
    const uniqueSet = new Set(synonyms.map((syn) => syn.synonym));
    return Array.from(uniqueSet).sort();
  }
}
