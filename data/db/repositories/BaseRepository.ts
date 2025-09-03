import { Model, Query, Collection } from "@nozbe/watermelondb";
import { database } from "../database";

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
      query = query.take(options.limit);
    }

    if (options.offset) {
      query = query.skip(options.offset);
    }

    return await query.fetch();
  }

  async count(): Promise<number> {
    const results = await this.collection.query().fetchCount();
    return results;
  }

  async create(data: Partial<T> & Record<string, any>): Promise<T> {
    return await database.write(async () => {
      return await this.collection.create((record: any) => {
        Object.keys(data).forEach((key) => {
          if (data[key] !== undefined) {
            record[key] = data[key];
          }
        });
      });
    });
  }

  async update(id: string, data: Partial<T> & Record<string, any>): Promise<T> {
    return await database.write(async () => {
      const record = await this.collection.find(id);
      return await record.update((r: any) => {
        Object.keys(data).forEach((key) => {
          if (data[key] !== undefined) {
            r[key] = data[key];
          }
        });
      });
    });
  }

  async delete(id: string): Promise<void> {
    await database.write(async () => {
      const record = await this.collection.find(id);
      await record.destroyPermanently();
    });
  }

  async deleteMany(ids: string[]): Promise<void> {
    await database.write(async () => {
      const records = await this.collection.query().fetch();
      const recordsToDelete = records.filter((record) =>
        ids.includes(record.id)
      );
      await Promise.all(
        recordsToDelete.map((record) => record.destroyPermanently())
      );
    });
  }

  // Utility methods
  protected buildSearchQuery(
    query: Query<T>,
    searchTerm: string,
    searchFields: string[]
  ): Query<T> {
    if (!searchTerm.trim()) return query;

    // Build OR condition for multiple fields
    const conditions = searchFields.map((field) =>
      require("@nozbe/watermelondb/QueryDescription").like(
        field,
        `%${searchTerm}%`
      )
    );

    return query.where(
      require("@nozbe/watermelondb/QueryDescription").or(...conditions)
    );
  }

  protected applySorting(
    query: Query<T>,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "desc"
  ): Query<T> {
    if (!sortBy) return query;

    return sortOrder === "asc"
      ? query.sortBy(sortBy)
      : query.sortBy(
          sortBy,
          require("@nozbe/watermelondb/QueryDescription").desc
        );
  }
}
