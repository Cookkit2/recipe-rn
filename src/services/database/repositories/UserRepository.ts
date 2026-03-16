import { GenericRepository } from './BaseRepository';
import { NativeModules } from 'react-native';

export interface User {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  displayName?: string;
  dietaryRestrictions?: string;
  preferences?: string;
  isOfflineMode: boolean;
  createdAt: string;
}

/**
 * User repository for managing user data
 */
export class UserRepository extends GenericRepository<User, number> {
  private db: any;

  constructor() {
    super('users');
    this.db = NativeModules.SQLite.open({
      name: 'recipen.db',
      location: 'default',
    });
  }

  async getAll(): Promise<User[]> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
      );

      return this.parseResults(results);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async getById(id: number): Promise<User | null> {
    try {
      const results = await this.db.executeSql(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );

      if (results.length === 0) return null;

      return this.parseResults(results)[0];
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async create(data: Partial<User>): Promise<User> {
    try {
      const sql = `
        INSERT INTO ${this.tableName}
        (email, username, password_hash, created_at,
         dietary_restrictions, preferences, is_offline_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.email,
        data.username,
        data.passwordHash,
        new Date().toISOString(),
        data.dietaryRestrictions || '',
        data.preferences || '',
        data.isOfflineMode ? 1 : 0,
      ];

      await this.db.executeSql(sql, values);

      const lastInsertIdResults = await this.db.executeSql(
        'SELECT last_insert_rowid() as id'
      );
      const id = lastInsertIdResults[0]?.id || 0;

      return this.getById(id);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET username = ?, display_name = ?,
            dietary_restrictions = ?, preferences = ?,
            is_offline_mode = ?, updated_at = ?
        WHERE id = ?
      `;

      const values = [
        data.username,
        data.displayName,
        data.dietaryRestrictions,
        data.preferences,
        data.isOfflineMode ? 1 : 0,
        new Date().toISOString(),
        id,
      ];

      await this.db.executeSql(sql, values);

      return this.getById(id);
    } catch (error) {
      console.error('Error updating user:', error);
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
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async findWhere(filter: any): Promise<User[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const values: any[] = [];

      if (filter.email) {
        sql += ` AND email = ?`;
        values.push(filter.email);
      }

      if (filter.username) {
        sql += ` AND username = ?`;
        values.push(filter.username);
      }

      sql += ` ORDER BY created_at DESC`;

      const results = await this.db.executeSql(sql, values);

      return this.parseResults(results);
    } catch (error) {
      console.error('Error filtering users:', error);
      return [];
    }
  }

  async findOneWhere(filter: any): Promise<User | null> {
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
    data: User[];
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
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOneWhere({ email });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findOneWhere({ username });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  /**
   * Update user offline mode preference
   */
  async setOfflineMode(userId: number, isOffline: boolean): Promise<User> {
    return this.update(userId, { isOfflineMode: isOffline });
  }

  /**
   * Get current user (simplified - should use proper auth)
   */
  async getCurrentUser(): Promise<User | null> {
    // In a real app, this would come from auth context
    return null;
  }

  private parseResults(results: any[]): User[] {
    return results.map((result) => {
      const item = result;
      return {
        id: item.id,
        email: item.email,
        username: item.username,
        passwordHash: item.password_hash,
        displayName: item.display_name,
        dietaryRestrictions: item.dietary_restrictions,
        preferences: item.preferences,
        isOfflineMode: Boolean(item.is_offline_mode),
        createdAt: item.created_at,
      };
    });
  }
}

/**
 * User repository singleton
 */
export const userRepository = new UserRepository();
