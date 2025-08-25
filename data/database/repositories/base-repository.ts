/**
 * Base Repository Implementation for SQL Databases
 * 
 * Provides common CRUD operations and query functionality
 * for WatermelonDB and other SQL-based databases
 */

import type {
  IBaseRepository,
  QueryOptions,
  QueryCondition,
  SortOption,
  PaginationOptions,
  PaginatedResult,
  Observable,
  Model,
  Query,
} from '../types';

// Import DatabaseError as value
import { DatabaseError } from '../types';

export abstract class BaseRepository<TModel, TCreate, TUpdate = Partial<TCreate>>
  implements IBaseRepository<TModel, TCreate, TUpdate> {
  
  protected abstract tableName: string;
  protected abstract database: any; // Will be Database type when WatermelonDB is installed

  // ===============================================
  // Abstract methods that must be implemented
  // ===============================================
  
  protected abstract getCollection(): any; // Will return Collection<TModel>
  protected abstract createModel(data: TCreate): Promise<TModel>;
  protected abstract updateModel(model: TModel, data: TUpdate): Promise<TModel>;
  protected abstract deleteModel(model: TModel): Promise<void>;

  // ===============================================
  // CRUD Operations
  // ===============================================

  async create(data: TCreate): Promise<TModel> {
    try {
      return await this.database.write(async () => {
        return await this.createModel(data);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create ${this.tableName} record`,
        'watermelon',
        'create',
        error as Error
      );
    }
  }

  async createMany(data: TCreate[]): Promise<TModel[]> {
    try {
      return await this.database.write(async () => {
        const promises = data.map(item => this.createModel(item));
        return await Promise.all(promises);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create multiple ${this.tableName} records`,
        'watermelon',
        'createMany',
        error as Error
      );
    }
  }

  async findById(id: string): Promise<TModel | null> {
    try {
      const collection = this.getCollection();
      return await collection.find(id);
    } catch (error) {
      // Record not found is not an error
      return null;
    }
  }

  async findByIds(ids: string[]): Promise<TModel[]> {
    try {
      const collection = this.getCollection();
      const promises = ids.map(id => this.findById(id));
      const results = await Promise.all(promises);
      return results.filter(Boolean) as TModel[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to find ${this.tableName} records by IDs`,
        'watermelon',
        'findByIds',
        error as Error
      );
    }
  }

  async update(id: string, data: TUpdate): Promise<TModel> {
    try {
      const model = await this.findById(id);
      if (!model) {
        throw new DatabaseError(
          `${this.tableName} record with ID ${id} not found`,
          'watermelon',
          'update'
        );
      }

      return await this.database.write(async () => {
        return await this.updateModel(model, data);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to update ${this.tableName} record`,
        'watermelon',
        'update',
        error as Error
      );
    }
  }

  async updateMany(ids: string[], data: TUpdate): Promise<TModel[]> {
    try {
      return await this.database.write(async () => {
        const promises = ids.map(id => this.update(id, data));
        return await Promise.all(promises);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to update multiple ${this.tableName} records`,
        'watermelon',
        'updateMany',
        error as Error
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const model = await this.findById(id);
      if (!model) {
        throw new DatabaseError(
          `${this.tableName} record with ID ${id} not found`,
          'watermelon',
          'delete'
        );
      }

      await this.database.write(async () => {
        await this.deleteModel(model);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete ${this.tableName} record`,
        'watermelon',
        'delete',
        error as Error
      );
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      await this.database.write(async () => {
        const promises = ids.map(id => this.delete(id));
        await Promise.all(promises);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete multiple ${this.tableName} records`,
        'watermelon',
        'deleteMany',
        error as Error
      );
    }
  }

  // ===============================================
  // Query Operations
  // ===============================================

  async findAll(options?: QueryOptions): Promise<TModel[]> {
    try {
      let query = this.getCollection().query();
      
      if (options) {
        query = this.applyQueryOptions(query, options);
      }

      return await query.fetch();
    } catch (error) {
      throw new DatabaseError(
        `Failed to fetch ${this.tableName} records`,
        'watermelon',
        'findAll',
        error as Error
      );
    }
  }

  async findOne(options: QueryOptions): Promise<TModel | null> {
    try {
      const results = await this.findAll({ ...options, limit: 1 });
      return results[0] || null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find ${this.tableName} record`,
        'watermelon',
        'findOne',
        error as Error
      );
    }
  }

  async findMany(options: QueryOptions): Promise<TModel[]> {
    return this.findAll(options);
  }

  // ===============================================
  // Pagination
  // ===============================================

  async findPaginated(
    pagination: PaginationOptions,
    options?: QueryOptions
  ): Promise<PaginatedResult<TModel>> {
    try {
      const { page, pageSize } = pagination;
      const offset = (page - 1) * pageSize;

      // Get total count
      const total = await this.count(options);

      // Get paginated data
      const data = await this.findAll({
        ...options,
        limit: pageSize,
        offset,
      });

      const totalPages = Math.ceil(total / pageSize);

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to fetch paginated ${this.tableName} records`,
        'watermelon',
        'findPaginated',
        error as Error
      );
    }
  }

  // ===============================================
  // Count Operations
  // ===============================================

  async count(options?: QueryOptions): Promise<number> {
    try {
      let query = this.getCollection().query();
      
      if (options?.where) {
        query = this.applyWhereConditions(query, options.where);
      }

      return await query.fetchCount();
    } catch (error) {
      throw new DatabaseError(
        `Failed to count ${this.tableName} records`,
        'watermelon',
        'count',
        error as Error
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const model = await this.findById(id);
      return model !== null;
    } catch (error) {
      return false;
    }
  }

  // ===============================================
  // Utility Operations
  // ===============================================

  async clear(): Promise<void> {
    try {
      await this.database.write(async () => {
        const allRecords = await this.findAll();
        const promises = allRecords.map(record => this.deleteModel(record));
        await Promise.all(promises);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to clear ${this.tableName} table`,
        'watermelon',
        'clear',
        error as Error
      );
    }
  }

  // ===============================================
  // Real-time Subscriptions
  // ===============================================

  observe(options?: QueryOptions): Observable<TModel[]> {
    let query = this.getCollection().query();
    
    if (options) {
      query = this.applyQueryOptions(query, options);
    }

    return query.observe();
  }

  observeOne(id: string): Observable<TModel | null> {
    return this.getCollection().findAndObserve(id);
  }

  // ===============================================
  // Helper Methods
  // ===============================================

  protected applyQueryOptions(query: any, options: QueryOptions): any {
    if (options.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    if (options.orderBy) {
      query = this.applySortOptions(query, options.orderBy);
    }

    if (options.limit) {
      query = query.take(options.limit);
    }

    if (options.offset) {
      query = query.skip(options.offset);
    }

    return query;
  }

  protected applyWhereConditions(query: any, conditions: QueryCondition[]): any {
    // Note: This will use actual WatermelonDB Q when installed
    // For now, it's a placeholder implementation
    conditions.forEach(condition => {
      const { field, operator, value } = condition;
      
      switch (operator) {
        case 'eq':
          query = query.where(field, value);
          break;
        case 'neq':
          query = query.where(field, /* Q.neq */ (val: any) => val !== value);
          break;
        case 'gt':
          query = query.where(field, /* Q.gt */ (val: any) => val > value);
          break;
        case 'gte':
          query = query.where(field, /* Q.gte */ (val: any) => val >= value);
          break;
        case 'lt':
          query = query.where(field, /* Q.lt */ (val: any) => val < value);
          break;
        case 'lte':
          query = query.where(field, /* Q.lte */ (val: any) => val <= value);
          break;
        case 'like':
          query = query.where(field, /* Q.like */ (val: any) => val.includes(value));
          break;
        case 'in':
          query = query.where(field, /* Q.oneOf */ (val: any) => value.includes(val));
          break;
        case 'notIn':
          query = query.where(field, /* Q.notIn */ (val: any) => !value.includes(val));
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            query = query.where(field, /* Q.between */ (val: any) => val >= value[0] && val <= value[1]);
          }
          break;
      }
    });

    return query;
  }

  protected applySortOptions(query: any, sorts: SortOption[]): any {
    sorts.forEach(sort => {
      const { field, direction } = sort;
      if (direction === 'asc') {
        query = query.sortBy(field);
      } else {
        query = query.sortBy(field, /* Q.desc */ 'desc');
      }
    });

    return query;
  }
}

export default BaseRepository;
