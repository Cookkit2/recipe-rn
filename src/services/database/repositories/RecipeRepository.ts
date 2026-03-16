import { GenericRepository } from './BaseRepository';
import { NativeModules } from 'react-native';

export interface Recipe {
  id: number;
  title: string;
  description: string;
  cuisine: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number | null;
  servings: number;
  isFavorite: boolean;
  calories: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Recipe repository for managing recipe data
 * Handles CRUD operations and queries for recipes
 */
export class RecipeRepository extends GenericRepository<Recipe, number> {
  private db: any;

  constructor() {
    super('recipes');
    this.db = NativeModules.SQLite.open({
      name: 'recipen.db',
      location: 'default',
    });
  }

  async getAll(): Promise<Recipe[]> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT 50`
      );

      return this.parseResults(results);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      return [];
    }
  }

  async getById(id: number): Promise<Recipe | null> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );

      if (results.length === 0) return null;

      return this.parseResults(results)[0];
    } catch (error) {
      console.error('Error fetching recipe:', error);
      return null;
    }
  }

  async create(data: Partial<Recipe>): Promise<Recipe> {
    try {
      const sql = `
        INSERT INTO ${this.tableName}
        (title, description, cuisine, difficulty, prep_time_minutes,
         cook_time_minutes, total_time_minutes, servings, is_favorite,
         calories, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.title,
        data.description || '',
        data.cuisine || '',
        data.difficulty || 'Easy',
        data.prepTimeMinutes || 0,
        data.cookTimeMinutes || 0,
        data.totalTimeMinutes || null,
        data.servings || 1,
        data.isFavorite || false,
        data.calories || null,
        data.source || '',
        new Date().toISOString(),
        new Date().toISOString(),
      ];

      await this.db.executeSql(sql, values);

      // Get the last inserted ID
      const lastInsertIdResults = await this.db.executeSql(
        'SELECT last_insert_rowid() as id'
      );
      const id = lastInsertIdResults[0]?.id || 0;

      return this.getById(id);
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw error;
    }
  }

  async update(id: number, data: Partial<Recipe>): Promise<Recipe> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET title = ?, description = ?, cuisine = ?, difficulty = ?,
            prep_time_minutes = ?, cook_time_minutes = ?,
            total_time_minutes = ?, servings = ?, is_favorite = ?,
            calories = ?, source = ?, updated_at = ?
        WHERE id = ?
      `;

      const values = [
        data.title,
        data.description,
        data.cuisine,
        data.difficulty,
        data.prepTimeMinutes,
        data.cookTimeMinutes,
        data.totalTimeMinutes,
        data.servings,
        data.isFavorite,
        data.calories,
        data.source,
        new Date().toISOString(),
        id,
      ];

      await this.db.executeSql(sql, values);

      return this.getById(id);
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.db.executeSql(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  }

  async findWhere(filter: any): Promise<Recipe[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const values: any[] = [];

      if (filter.title) {
        sql += ` AND title LIKE ?`;
        values.push(`%${filter.title}%`);
      }

      if (filter.cuisine) {
        sql += ` AND cuisine = ?`;
        values.push(filter.cuisine);
      }

      if (filter.difficulty) {
        sql += ` AND difficulty = ?`;
        values.push(filter.difficulty);
      }

      if (filter.isFavorite !== undefined) {
        sql += ` AND is_favorite = ?`;
        values.push(filter.isFavorite ? 1 : 0);
      }

      sql += ` ORDER BY created_at DESC`;

      const results = await this.db.executeSql(sql, values);

      return this.parseResults(results);
    } catch (error) {
      console.error('Error filtering recipes:', error);
      return [];
    }
  }

  async findOneWhere(filter: any): Promise<Recipe | null> {
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
    data: Recipe[];
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

  /**
   * Search recipes by keyword
   */
  async search(query: string): Promise<Recipe[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE title LIKE ? OR description LIKE ? OR cuisine LIKE ?
        ORDER BY created_at DESC
      `;
      const values = [`%${query}%`, `%${query}%`, `%${query}%`];

      const results = await this.db.executeSql(sql, values);

      return this.parseResults(results);
    } catch (error) {
      console.error('Error searching recipes:', error);
      return [];
    }
  }

  /**
   * Get recipes by cuisine
   */
  async getByCuisine(cuisine: string): Promise<Recipe[]> {
    return this.findWhere({ cuisine });
  }

  /**
   * Get recipes by difficulty
   */
  async getByDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard'): Promise<Recipe[]> {
    return this.findWhere({ difficulty });
  }

  /**
   * Get user's favorite recipes
   */
  async getFavorites(): Promise<Recipe[]> {
    return this.findWhere({ isFavorite: true });
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: number): Promise<Recipe> {
    const recipe = await this.getById(id);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    return this.update(id, {
      isFavorite: !recipe.isFavorite,
    });
  }

  /**
   * Get trending recipes (most recently created)
   */
  async getTrending(limit: number = 10): Promise<Recipe[]> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );

      return this.parseResults(results);
    } catch (error) {
      console.error('Error fetching trending recipes:', error);
      return [];
    }
  }

  /**
   * Get daily recipes (created today)
   */
  async getTodayRecipes(): Promise<Recipe[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName}
         WHERE DATE(created_at) = ?
         ORDER BY created_at DESC`,
        [today]
      );

      return this.parseResults(results);
    } catch (error) {
      console.error('Error fetching today\'s recipes:', error);
      return [];
    }
  }

  /**
   * Get recipes by time range
   */
  async getByTimeRange(
    fromMinutes: number,
    toMinutes: number
  ): Promise<Recipe[]> {
    return this.findWhere({
      prep_time_minutes: { $gte: fromMinutes },
      cook_time_minutes: { $lte: toMinutes },
    });
  }

  private parseResults(results: any[]): Recipe[] {
    return results.map((result) => {
      const item = result;
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        cuisine: item.cuisine,
        difficulty: item.difficulty,
        prepTimeMinutes: item.prep_time_minutes,
        cookTimeMinutes: item.cook_time_minutes,
        totalTimeMinutes: item.total_time_minutes,
        servings: item.servings,
        isFavorite: Boolean(item.is_favorite),
        calories: item.calories,
        source: item.source,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });
  }
}

/**
 * Recipe repository singleton
 */
export const recipeRepository = new RecipeRepository();
