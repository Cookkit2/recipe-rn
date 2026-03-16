/**
 * Base repository interface for Recipe-n
 * Defines common patterns for all repositories
 */

export interface Repository<T, ID> {
  // CRUD operations
  getAll(): Promise<T[]>;
  getById(id: ID): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  exists(id: ID): Promise<boolean>;

  // Query operations
  findWhere(filter: any): Promise<T[]>;
  findOneWhere(filter: any): Promise<T | null>;
  count(filter?: any): Promise<number>;

  // Pagination
  getAllPaginated(page: number, limit: number, filter?: any): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

/**
 * Generic repository implementation
 * Provides common CRUD operations for all entities
 */
export abstract class GenericRepository<T, ID>
  implements Repository<T, ID>
{
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async getAll(): Promise<T[]> {
    // To be implemented by subclass
    return [];
  }

  async getById(id: ID): Promise<T | null> {
    // To be implemented by subclass
    return null;
  }

  async create(data: Partial<T>): Promise<T> {
    // To be implemented by subclass
    return data as T;
  }

  async update(id: ID, data: Partial<T>): Promise<T> {
    // To be implemented by subclass
    return data as T;
  }

  async delete(id: ID): Promise<boolean> {
    // To be implemented by subclass
    return true;
  }

  async exists(id: ID): Promise<boolean> {
    const item = await this.getById(id);
    return item !== null;
  }

  async findWhere(filter: any): Promise<T[]> {
    // To be implemented by subclass
    return [];
  }

  async findOneWhere(filter: any): Promise<T | null> {
    const results = await this.findWhere(filter);
    return results.length > 0 ? results[0] : null;
  }

  async count(filter?: any): Promise<number> {
    const results = await this.findWhere(filter);
    return results.length;
  }

  async getAllPaginated(
    page: number = 1,
    limit: number = 20,
    filter?: any
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const allItems = await this.findWhere(filter);
    const total = allItems.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedData = allItems.slice(start, start + limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
