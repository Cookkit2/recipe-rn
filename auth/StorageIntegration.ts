import { StorageFactory } from '~/data/storage';
import { storageConfigs } from '~/data/storage/storage-config';
import type { AuthSession } from '~/types/AuthTypes';
import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_SESSION_DATA_KEY,
  AUTH_USER_DATA_KEY,
  AUTH_SESSION_EXPIRES_AT_KEY,
} from '~/constants/storage-keys';
import { log } from '~/utils/logger';

/**
 * Secure storage integration for authentication tokens
 * Uses the existing encrypted storage configuration
 */
export class AuthStorageManager {
  private static instance: AuthStorageManager | null = null;
  private storage = StorageFactory.initialize(
    // Use encrypted storage for auth; assert presence since config defines it
    storageConfigs.encrypted as (typeof storageConfigs)['encrypted']
  );

  static getInstance(): AuthStorageManager {
    if (!AuthStorageManager.instance) {
      AuthStorageManager.instance = new AuthStorageManager();
    }
    return AuthStorageManager.instance;
  }

  // Storage keys for auth data
  private readonly KEYS = {
    ACCESS_TOKEN: AUTH_ACCESS_TOKEN_KEY,
    REFRESH_TOKEN: AUTH_REFRESH_TOKEN_KEY,
    SESSION_DATA: AUTH_SESSION_DATA_KEY,
    USER_DATA: AUTH_USER_DATA_KEY,
    SESSION_EXPIRES_AT: AUTH_SESSION_EXPIRES_AT_KEY,
  };

  /**
   * Store authentication session securely
   */
  async storeSession(session: AuthSession): Promise<void> {
    try {
      if (!this.storage.set) {
        throw new Error('Storage implementation does not support async operations');
      }

      this.storage.set(this.KEYS.ACCESS_TOKEN, session.accessToken);

      if (session.refreshToken) {
        this.storage.set(this.KEYS.REFRESH_TOKEN, session.refreshToken);
      }

      this.storage.set(this.KEYS.SESSION_EXPIRES_AT, session.expiresAt.toISOString());
      this.storage.set(this.KEYS.SESSION_DATA, JSON.stringify(session));

      log.info('Auth session stored securely');
    } catch (error) {
      log.error('Failed to store auth session:', error);
      throw new Error('Failed to store authentication session');
    }
  }

  /**
   * Retrieve stored authentication session
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      if (!this.storage.get) {
        throw new Error('Storage implementation does not support async operations');
      }

      const sessionData = this.storage.get<string>(this.KEYS.SESSION_DATA);

      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as AuthSession;

      // Check if session is expired
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt <= new Date()) {
        log.info('Stored session is expired');
        await this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      log.error('Failed to retrieve auth session:', error);
      return null;
    }
  }

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      if (!this.storage.get) {
        throw new Error('Storage implementation does not support async operations');
      }

      const token = this.storage.get<string>(this.KEYS.ACCESS_TOKEN);
      return token || null;
    } catch (error) {
      log.error('Failed to retrieve access token:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (!this.storage.get) {
        throw new Error('Storage implementation does not support async operations');
      }

      const token = this.storage.get<string>(this.KEYS.REFRESH_TOKEN);
      return token || null;
    } catch (error) {
      log.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  /**
   * Clear all stored authentication data
   */
  async clearSession(): Promise<void> {
    try {
      Object.values(this.KEYS).forEach((key) => {
        this.storage.delete(key);
      });

      log.info('Auth session cleared');
    } catch (error) {
      log.error('Failed to clear auth session:', error);
      throw new Error('Failed to clear authentication session');
    }
  }

  /**
   * Update stored access token (for token refresh)
   */
  async updateAccessToken(accessToken: string, expiresAt: Date): Promise<void> {
    try {
      if (!this.storage.set || !this.storage.get) {
        throw new Error('Storage implementation does not support async operations');
      }

      this.storage.set(this.KEYS.ACCESS_TOKEN, accessToken);
      this.storage.set(this.KEYS.SESSION_EXPIRES_AT, expiresAt.toISOString());

      // Update session data if it exists
      const sessionData = this.storage.get<string>(this.KEYS.SESSION_DATA);
      if (sessionData) {
        const session = JSON.parse(sessionData) as AuthSession;
        session.accessToken = accessToken;
        session.expiresAt = expiresAt;
        this.storage.set(this.KEYS.SESSION_DATA, JSON.stringify(session));
      }

      log.info('Access token updated');
    } catch (error) {
      log.error('Failed to update access token:', error);
      throw new Error('Failed to update access token');
    }
  }

  /**
   * Check if we have any stored authentication data
   */
  hasStoredSession(): boolean {
    try {
      return this.storage.contains(this.KEYS.ACCESS_TOKEN);
    } catch (error) {
      log.error('Failed to check for stored session:', error);
      return false;
    }
  }

  // Expose limited string-based operations for adapter without leaking storage implementation
  public getString(key: string): string | null {
    return this.storage.getString(key);
  }

  public setString(key: string, value: string): void {
    this.storage.setString(key, value);
  }

  public remove(key: string): void {
    this.storage.delete(key);
  }

  // Async versions for better AsyncStorage compatibility
  public async getStringAsync(key: string): Promise<string | null> {
    if (!this.storage.get) {
      throw new Error('Storage implementation does not support async operations');
    }
    return this.storage.get<string>(key) || null;
  }

  public async setStringAsync(key: string, value: string): Promise<void> {
    if (!this.storage.set) {
      throw new Error('Storage implementation does not support async operations');
    }
    this.storage.set(key, value);
  }

  public async removeAsync(key: string): Promise<void> {
    if (!this.storage.delete) {
      throw new Error('Storage implementation does not support async operations');
    }
    this.storage.delete(key);
  }
}

/**
 * Custom storage adapter for Supabase
 * Integrates with our encrypted storage system
 */
export const createSupabaseStorageAdapter = () => {
  const authStorage = AuthStorageManager.getInstance();

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return await authStorage.getStringAsync(key);
      } catch (error) {
        log.error(`Failed to get item ${key}:`, error);
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await authStorage.setStringAsync(key, value);
      } catch (error) {
        log.error(`Failed to set item ${key}:`, error);
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        await authStorage.removeAsync(key);
      } catch (error) {
        log.error(`Failed to remove item ${key}:`, error);
      }
    },
  };
};
