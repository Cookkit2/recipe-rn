import { StorageFactory } from "../data/storage";
import { storageConfigs } from "../data/storage-config";
import type { AuthSession } from "./types";

/**
 * Secure storage integration for authentication tokens
 * Uses the existing encrypted storage configuration
 */
export class AuthStorageManager {
  private static instance: AuthStorageManager | null = null;
  private storage = StorageFactory.initialize(storageConfigs.encrypted);

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
      this.storage.setString(this.KEYS.ACCESS_TOKEN, session.accessToken);

      if (session.refreshToken) {
        this.storage.setString(this.KEYS.REFRESH_TOKEN, session.refreshToken);
      }

      this.storage.setString(
        this.KEYS.SESSION_EXPIRES_AT,
        session.expiresAt.toISOString()
      );
      this.storage.setString(this.KEYS.SESSION_DATA, JSON.stringify(session));

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
      const sessionData = this.storage.getString(this.KEYS.SESSION_DATA);

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
      return this.storage.getString(this.KEYS.ACCESS_TOKEN);
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
      return this.storage.getString(this.KEYS.REFRESH_TOKEN);
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
      this.storage.setString(this.KEYS.ACCESS_TOKEN, accessToken);
      this.storage.setString(
        this.KEYS.SESSION_EXPIRES_AT,
        expiresAt.toISOString()
      );

      // Update session data if it exists
      const sessionData = this.storage.getString(this.KEYS.SESSION_DATA);
      if (sessionData) {
        const session = JSON.parse(sessionData) as AuthSession;
        session.accessToken = accessToken;
        session.expiresAt = expiresAt;
        this.storage.setString(this.KEYS.SESSION_DATA, JSON.stringify(session));
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
}

/**
 * Custom storage adapter for Supabase
 * Integrates with our encrypted storage system
 */
export const createSupabaseStorageAdapter = () => {
  const authStorage = AuthStorageManager.getInstance();

  return {
    getItem: (key: string) => {
      try {
        return authStorage.storage.getString(key);
      } catch (error) {
        console.error(`Failed to get item ${key}:`, error);
        return null;
      }
    },

    setItem: (key: string, value: string) => {
      try {
        authStorage.storage.setString(key, value);
      } catch (error) {
        console.error(`Failed to set item ${key}:`, error);
      }
    },

    removeItem: (key: string) => {
      try {
        authStorage.storage.delete(key);
      } catch (error) {
        console.error(`Failed to remove item ${key}:`, error);
      }
    },
  };
};
