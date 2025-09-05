import { StorageFactory } from "../data/storage";
import { storageConfigs } from "../data/storage-config";
import type { AuthSession } from "./types";

/**
 * Secure storage integration for authentication tokens
 * Uses the existing encrypted storage configuration
 */
export class AuthStorageManager {
  private static instance: AuthStorageManager | null = null;
  private storage = StorageFactory.initialize(
    // Use encrypted storage for auth; assert presence since config defines it
    storageConfigs.encrypted as (typeof storageConfigs)["encrypted"]
  );

  static getInstance(): AuthStorageManager {
    if (!AuthStorageManager.instance) {
      AuthStorageManager.instance = new AuthStorageManager();
    }
    return AuthStorageManager.instance;
  }

  // Storage keys for auth data
  private readonly KEYS = {
    ACCESS_TOKEN: "auth_access_token",
    REFRESH_TOKEN: "auth_refresh_token",
    SESSION_DATA: "auth_session_data",
    USER_DATA: "auth_user_data",
    SESSION_EXPIRES_AT: "auth_session_expires_at",
  };

  /**
   * Store authentication session securely
   */
  async storeSession(session: AuthSession): Promise<void> {
    try {
      await this.storage?.setAsync(this.KEYS.ACCESS_TOKEN, session.accessToken);

      if (session.refreshToken) {
        await this.storage?.setAsync(
          this.KEYS.REFRESH_TOKEN,
          session.refreshToken
        );
      }

      await this.storage?.setAsync(
        this.KEYS.SESSION_EXPIRES_AT,
        session.expiresAt.toISOString()
      );
      await this.storage?.setAsync(
        this.KEYS.SESSION_DATA,
        JSON.stringify(session)
      );

      console.log("Auth session stored securely");
    } catch (error) {
      console.error("Failed to store auth session:", error);
      throw new Error("Failed to store authentication session");
    }
  }

  /**
   * Retrieve stored authentication session
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const sessionData = await this.storage?.getAsync<string>(
        this.KEYS.SESSION_DATA
      );

      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as AuthSession;

      // Check if session is expired
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt <= new Date()) {
        console.log("Stored session is expired");
        await this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error("Failed to retrieve auth session:", error);
      return null;
    }
  }

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const token = await this.storage?.getAsync<string>(
        this.KEYS.ACCESS_TOKEN
      );
      return token || null;
    } catch (error) {
      console.error("Failed to retrieve access token:", error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const token = await this.storage?.getAsync<string>(
        this.KEYS.REFRESH_TOKEN
      );
      return token || null;
    } catch (error) {
      console.error("Failed to retrieve refresh token:", error);
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

      console.log("Auth session cleared");
    } catch (error) {
      console.error("Failed to clear auth session:", error);
      throw new Error("Failed to clear authentication session");
    }
  }

  /**
   * Update stored access token (for token refresh)
   */
  async updateAccessToken(accessToken: string, expiresAt: Date): Promise<void> {
    try {
      await this.storage?.setAsync(this.KEYS.ACCESS_TOKEN, accessToken);
      await this.storage?.setAsync(
        this.KEYS.SESSION_EXPIRES_AT,
        expiresAt.toISOString()
      );

      // Update session data if it exists
      const sessionData = await this.storage?.getAsync<string>(
        this.KEYS.SESSION_DATA
      );
      if (sessionData) {
        const session = JSON.parse(sessionData) as AuthSession;
        session.accessToken = accessToken;
        session.expiresAt = expiresAt;
        await this.storage?.setAsync(
          this.KEYS.SESSION_DATA,
          JSON.stringify(session)
        );
      }

      console.log("Access token updated");
    } catch (error) {
      console.error("Failed to update access token:", error);
      throw new Error("Failed to update access token");
    }
  }

  /**
   * Check if we have any stored authentication data
   */
  hasStoredSession(): boolean {
    try {
      return this.storage.contains(this.KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error("Failed to check for stored session:", error);
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
    return (await this.storage?.getAsync<string>(key)) || null;
  }

  public async setStringAsync(key: string, value: string): Promise<void> {
    await this.storage?.setAsync(key, value);
  }

  public async removeAsync(key: string): Promise<void> {
    await this.storage?.deleteAsync(key);
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
        console.error(`Failed to get item ${key}:`, error);
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await authStorage.setStringAsync(key, value);
      } catch (error) {
        console.error(`Failed to set item ${key}:`, error);
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        await authStorage.removeAsync(key);
      } catch (error) {
        console.error(`Failed to remove item ${key}:`, error);
      }
    },
  };
};
