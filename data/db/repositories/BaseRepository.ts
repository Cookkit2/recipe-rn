import { Model, Query, Collection, Q } from "@nozbe/watermelondb";
import { database } from "../database";
import { sanitizeSearchTerm } from "~/utils/input-sanitization";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SearchOptions extends PaginationOptions {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  searchTerm?: string;
}

export abstract class BaseRepository<T extends Model> {
  protected collection: Collection<T>;

  constructor(tableName: string) {
    this.collection = database.collections.get(tableName);
  }

  // Basic CRUD operations
  async findById(id: string): Promise<T | null> {
    try {
      return await this.collection.find(id);
    } catch {
      return null;
    }
  }

  async findAll(options: PaginationOptions = {}): Promise<T[]> {
    let query = this.collection.query();

    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }

    return await query.fetch();
  }

  async count(): Promise<number> {
    const results = await this.collection.query().fetchCount();
    return results;
  }

  async create(data: Partial<T> & Record<string, unknown>): Promise<T> {
    return await database.write(async () => {
      return await this.createRaw(data);
    });
  }

  // Prepare create method for batching
  prepareCreate(data: Partial<T> & Record<string, unknown>): T {
    return this.collection.prepareCreate((record: T) => {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
          (record as any)[key] = data[key];
        }
      }
    });
  }

  // Raw create method that works within existing transactions
  async createRaw(data: Partial<T> & Record<string, unknown>): Promise<T> {
    return await this.collection.create((record: T) => {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          if (data[key] !== undefined) {
            (record as any)[key] = data[key];
          }
        }
      }
    });
  }

  async update(id: string, data: Partial<T> & Record<string, unknown>): Promise<T> {
    return await database.write(async () => {
      return await this.updateRaw(id, data);
    });
  }

  // Raw update method that works within existing transactions
  async updateRaw(id: string, data: Partial<T> & Record<string, unknown>): Promise<T> {
    const record = await this.collection.find(id);
    return await record.update((r: T) => {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          if (data[key] !== undefined) {
            (r as any)[key] = data[key];
          }
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await database.write(async () => {
      const record = await this.collection.find(id);
      await record.destroyPermanently();
    });
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    // Performance optimization:
    // 1. Fetch only required records using Q.oneOf instead of fetching all records and filtering
    // 2. Use batch processing to delete records in a single transaction, avoiding N+1 sequential writes
    const recordsToDelete = await this.collection.query(Q.where("id", Q.oneOf(ids))).fetch();

    await database.write(async () => {
      const batchOps = recordsToDelete.map((record) => record.prepareDestroyPermanently());
      await database.batch(...batchOps);
    });
  }

  // Utility methods
  protected buildSearchQuery(
    query: Query<T>,
    searchTerm: string,
    searchFields: string[]
  ): Query<T> {
    if (!searchTerm?.trim() || searchFields.length === 0) {
      return query;
    }

    // Comprehensive sanitization for search terms
    const sanitizedTerm = this.sanitizeSearchTerm(searchTerm);

    const conditions = searchFields.map((field) => Q.where(field, Q.like(sanitizedTerm)));

    return query.extend(Q.or(...conditions));
  }

  /**
   * Sanitizes search terms to prevent SQL injection and handle special characters
   * @param searchTerm - The raw search term from user input
   * @returns Sanitized search term safe for database queries
   */
  private sanitizeSearchTerm(searchTerm: string): string {
    // Use the utility function for consistent sanitization
    return sanitizeSearchTerm(searchTerm, {
      maxLength: 100,
      allowHtml: false,
      allowSpecialChars: true,
    });
  }

  /**
   * Applies sorting to a query. The .sortBy method directly accepts 'asc' or 'desc'.
   */
  protected applySorting(
    query: Query<T>,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "asc" // Defaulting to 'asc' is common
  ): Query<T> {
    // The return type is correct!
    if (!sortBy) {
      return query;
    }

    // 4. This is much simpler. The sortBy method takes the sort order as a string.
    return query.extend(Q.sortBy(sortBy, sortOrder));
  }
}
