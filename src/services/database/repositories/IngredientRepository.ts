import { GenericRepository } from './BaseRepository';
import { NativeModules } from 'react-native';

export interface Ingredient {
  id: number;
  recipeId: number;
  name: string;
  amount: string;
  unit?: string;
  notes?: string;
  isSubstitute: boolean;
  originalIngredientId?: number;
  substitutionScore?: number;
}

/**
 * Ingredient repository for managing recipe ingredients
 */
export class IngredientRepository extends GenericRepository<Ingredient, number> {
  private db: any;

  constructor() {
    super('ingredients');
    this.db = NativeModules.SQLite.open({
      name: 'recipen.db',
      location: 'default',
    });
  }

  async getAll(): Promise<Ingredient[]> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName} ORDER BY recipe_id, step_number`
      );

      return this.parseResults(results);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      return [];
    }
  }

  async getById(id: number): Promise<Ingredient | null> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );

      if (results.length === 0) return null;

      return this.parseResults(results)[0];
    } catch (error) {
      console.error('Error fetching ingredient:', error);
      return null;
    }
  }

  async create(data: Partial<Ingredient>): Promise<Ingredient> {
    try {
      const sql = `
        INSERT INTO ${this.tableName}
        (recipe_id, name, amount, unit, notes, is_substitute,
         original_ingredient_id, substitution_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.recipeId,
        data.name,
        data.amount,
        data.unit || '',
        data.notes || '',
        data.isSubstitute ? 1 : 0,
        data.originalIngredientId || null,
        data.substitutionScore || null,
      ];

      await this.db.executeSql(sql, values);

      const lastInsertIdResults = await this.db.executeSql(
        'SELECT last_insert_rowid() as id'
      );
      const id = lastInsertIdResults[0]?.id || 0;

      return this.getById(id);
    } catch (error) {
      console.error('Error creating ingredient:', error);
      throw error;
    }
  }

  async update(id: number, data: Partial<Ingredient>): Promise<Ingredient> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET name = ?, amount = ?, unit = ?, notes = ?,
            is_substitute = ?, original_ingredient_id = ?, substitution_score = ?
        WHERE id = ?
      `;

      const values = [
        data.name,
        data.amount,
        data.unit,
        data.notes,
        data.isSubstitute ? 1 : 0,
        data.originalIngredientId,
        data.substitutionScore,
        id,
      ];

      await this.db.executeSql(sql, values);

      return this.getById(id);
    } catch (error) {
      console.error('Error updating ingredient:', error);
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
      console.error('Error deleting ingredient:', error);
      return false;
    }
  }

  async findWhere(filter: any): Promise<Ingredient[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const values: any[] = [];

      if (filter.recipeId) {
        sql += ` AND recipe_id = ?`;
        values.push(filter.recipeId);
      }

      if (filter.isSubstitute !== undefined) {
        sql += ` AND is_substitute = ?`;
        values.push(filter.isSubstitute ? 1 : 0);
      }

      sql += ` ORDER BY recipe_id, step_number`;

      const results = await this.db.executeSql(sql, values);

      return this.parseResults(results);
    } catch (error) {
      console.error('Error filtering ingredients:', error);
      return [];
    }
  }

  async findOneWhere(filter: any): Promise<Ingredient | null> {
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
    data: Ingredient[];
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
   * Get all ingredients for a specific recipe
   */
  async getByRecipeId(recipeId: number): Promise<Ingredient[]> {
    return this.findWhere({ recipeId });
  }

  /**
   * Get ingredients by recipe and step number
   */
  async getByRecipeAndStep(recipeId: number, stepNumber: number): Promise<Ingredient | null> {
    const results = await this.db.executeSql(
      `SELECT * FROM ${this.tableName}
       WHERE recipe_id = ? AND step_number = ?
       ORDER BY step_number`,
      [recipeId, stepNumber]
    );

    if (results.length === 0) return null;

    return this.parseResults(results)[0];
  }

  /**
   * Get all ingredients for a recipe, ordered by step number
   */
  async getIngredientsByRecipeOrdered(recipeId: number): Promise<Ingredient[]> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName}
         WHERE recipe_id = ?
         ORDER BY step_number`,
        [recipeId]
      );

      return this.parseResults(results);
    } catch (error) {
      console.error('Error fetching recipe ingredients ordered:', error);
      return [];
    }
  }

  /**
   * Get substitute ingredients for a specific ingredient
   */
  async getSubstitutesForOriginalIngredient(originalIngredientId: number): Promise<Ingredient[]> {
    return this.findWhere({
      originalIngredientId,
      isSubstitute: true,
    });
  }

  /**
   * Add ingredients to a recipe
   */
  async addIngredientsToRecipe(
    recipeId: number,
    ingredients: Partial<Ingredient>[]
  ): Promise<Ingredient[]> {
    const results: Ingredient[] = [];

    for (const ingredient of ingredients) {
      const created = await this.create({
        ...ingredient,
        recipeId,
        isSubstitute: false,
      });
      results.push(created);
    }

    return results;
  }

  /**
   * Update ingredient step numbers
   */
  async updateStepNumbers(
    recipeId: number,
    stepNumbers: number[]
  ): Promise<boolean> {
    try {
      for (let i = 0; i < stepNumbers.length; i++) {
        await this.db.executeSql(
          `UPDATE ${this.tableName}
           SET step_number = ?
           WHERE recipe_id = ? AND id = ?`,
          [i + 1, recipeId, stepNumbers[i]]
        );
      }
      return true;
    } catch (error) {
      console.error('Error updating step numbers:', error);
      return false;
    }
  }

  private parseResults(results: any[]): Ingredient[] {
    return results.map((result) => {
      const item = result;
      return {
        id: item.id,
        recipeId: item.recipe_id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        notes: item.notes,
        isSubstitute: Boolean(item.is_substitute),
        originalIngredientId: item.original_ingredient_id,
        substitutionScore: item.substitution_score,
      };
    });
  }
}

/**
 * Ingredient repository singleton
 */
export const ingredientRepository = new IngredientRepository();
