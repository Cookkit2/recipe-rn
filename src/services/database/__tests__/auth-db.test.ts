/**
 * Authentication Database Tests
 * Comprehensive tests for auth-db module
 */

import * as authDb from "../auth-db";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

// Mock dependencies
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-crypto", () => ({
  getRandomBytes: jest.fn(),
  digestStringAsync: jest.fn(),
}));

jest.mock("jwt-encode", () => jest.fn());

// We need to import the mocked modules
import * as SQLite from "expo-sqlite";

const mockSQLite = SQLite as jest.Mocked<typeof SQLite>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockCrypto = Crypto as jest.Mocked<typeof Crypto>;

describe("Auth Database", () => {
  let mockDb: jest.Mocked<SQLite.SQLiteDatabase>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock database
    mockDb = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest.fn().mockResolvedValue(undefined),
      execAsync: jest.fn().mockResolvedValue(undefined),
      closeAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
      isClosed: jest.fn().mockReturnValue(false),
    } as any;

    mockSQLite.openDatabaseAsync.mockResolvedValue(mockDb);

    // Mock SecureStore
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    // Mock Crypto
    mockCrypto.randomUUID.mockReturnValue("test-uuid-" + Math.random());
    mockCrypto.getRandomBytes.mockReturnValue(new Uint8Array(32));
    mockCrypto.digestStringAsync.mockResolvedValue(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );

    // Initialize database
    await authDb.initializeDatabase();
  });

  afterEach(async () => {
    await authDb.closeDatabase();
  });

  describe("Database Initialization", () => {
    it("should create database connection", async () => {
      await authDb.getDatabase();

      expect(mockSQLite.openDatabaseAsync).toHaveBeenCalledWith("recipe-rn.db");
    });

    it("should enable WAL mode", async () => {
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining("PRAGMA journal_mode = WAL")
      );
    });

    it("should enable foreign keys", async () => {
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining("PRAGMA foreign_keys = ON")
      );
    });

    it("should create users table", async () => {
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS users")
      );
    });

    it("should create sessions table", async () => {
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS sessions")
      );
    });

    it("should create refresh_tokens table", async () => {
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS refresh_tokens")
      );
    });

    it("should include is_revoked column in sessions", async () => {
      expect(mockDb.execAsync).toHaveBeenCalledWith(expect.stringContaining("is_revoked"));
    });
  });

  describe("User Operations", () => {
    describe("createUser", () => {
      it("should create user with valid data", async () => {
        const userId = "user-123";
        const email = "test@example.com";
        const passwordHash = "hash";
        const displayName = "Test User";

        await authDb.createUser(userId, email, passwordHash, displayName);

        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO users"),
          expect.objectContaining({
            $id: userId,
            $email: email,
            $passwordHash: passwordHash,
            $displayName: displayName,
          })
        );
      });

      it("should create user without display name", async () => {
        await authDb.createUser("user-123", "test@example.com", "hash");

        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            $displayName: null,
          })
        );
      });

      it("should set timestamps", async () => {
        await authDb.createUser("user-123", "test@example.com", "hash");

        const call = mockDb.runAsync as jest.Mock;
        const args = call.mock.calls[0];
        expect(args[1]).toMatchObject({
          $createdAt: expect.any(String),
          $updatedAt: expect.any(String),
        });
      });

      it("should cache created user", async () => {
        const userId = "user-123";
        await authDb.createUser(userId, "test@example.com", "hash", "Test User");

        // Verify user is cached
        const cachedUser = await authDb.getUserById(userId);
        expect(cachedUser).toBeDefined();
      });
    });

    describe("getUserByEmail", () => {
      it("should return user by email", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          password_hash: "hash",
          display_name: "Test User",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(mockUser);

        const user = await authDb.getUserByEmail("test@example.com");

        expect(user).toEqual(mockUser);
        expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
          expect.stringContaining("WHERE email = $email"),
          { $email: "test@example.com" }
        );
      });

      it("should return null for non-existent email", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce(undefined);

        const user = await authDb.getUserByEmail("nonexistent@example.com");

        expect(user).toBeNull();
      });

      it("should handle database errors", async () => {
        mockDb.getFirstAsync!.mockRejectedValueOnce(new Error("Database error"));

        await expect(authDb.getUserByEmail("test@example.com")).rejects.toThrow();
      });
    });

    describe("getUserById", () => {
      it("should return cached user if available", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          display_name: "Test User",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(mockUser);

        // First call - should hit database
        const user1 = await authDb.getUserById("user-123");

        // Second call - should hit cache
        const user2 = await authDb.getUserById("user-123");

        expect(user1).toEqual(mockUser);
        expect(user2).toEqual(mockUser);
        expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(1); // Only called once due to cache
      });

      it("should fetch from database if not cached", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          display_name: "Test User",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(mockUser);

        const user = await authDb.getUserById("user-123");

        expect(user).toEqual(mockUser);
        expect(mockDb.getFirstAsync).toHaveBeenCalled();
      });

      it("should return null for non-existent user", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce(undefined);

        const user = await authDb.getUserById("non-existent");

        expect(user).toBeNull();
      });

      it("should invalidate expired cache entries", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          display_name: "Test User",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        };

        mockDb.getFirstAsync!.mockResolvedValue(mockUser);

        // First call
        await authDb.getUserById("user-123");

        // Clear cache to simulate expiration
        authDb.clearUserCache("user-123");

        // Second call should hit database again
        await authDb.getUserById("user-123");

        expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(2);
      });
    });

    describe("clearUserCache", () => {
      it("should clear specific user from cache", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          display_name: "Test User",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        };

        mockDb.getFirstAsync!.mockResolvedValue(mockUser);

        await authDb.getUserById("user-123");
        authDb.clearUserCache("user-123");
        await authDb.getUserById("user-123");

        expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(2);
      });

      it("should clear all users from cache", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          display_name: "Test User",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        };

        mockDb.getFirstAsync!.mockResolvedValue(mockUser);

        await authDb.getUserById("user-123");
        authDb.clearUserCache();
        await authDb.getUserById("user-123");

        expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Session Operations", () => {
    describe("upsertSession", () => {
      it("should insert new session", async () => {
        await authDb.upsertSession("user-123", "access-token", "refresh-token", 900);

        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("INSERT OR REPLACE INTO sessions"),
          expect.objectContaining({
            $userId: "user-123",
            $accessToken: "access-token",
            $refreshToken: "refresh-token",
          })
        );
      });

      it("should calculate expiration time correctly", async () => {
        const expiresIn = 900; // 15 minutes
        await authDb.upsertSession("user-123", "access-token", "refresh-token", expiresIn);

        const call = mockDb.runAsync as jest.Mock;
        const args = call.mock.calls[0];
        const expiresAt = new Date(args[1].$expiresAt);
        const now = new Date();
        const diff = Math.abs(expiresAt.getTime() - now.getTime() - expiresIn * 1000);

        expect(diff).toBeLessThan(1000); // Allow 1 second variance
      });

      it("should set timestamps", async () => {
        await authDb.upsertSession("user-123", "access-token", "refresh-token", 900);

        const call = mockDb.runAsync as jest.Mock;
        const args = call.mock.calls[0];
        expect(args[1]).toMatchObject({
          $createdAt: expect.any(String),
          $lastUsed: expect.any(String),
        });
      });
    });

    describe("getSessionByToken", () => {
      it("should return session by access token", async () => {
        const mockSession = {
          id: "session-123",
          user_id: "user-123",
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_at: "2099-01-01T00:00:00.000Z",
          created_at: "2024-01-01T00:00:00.000Z",
          last_used: "2024-01-01T00:00:00.000Z",
          is_revoked: 0,
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(mockSession);

        const session = await authDb.getSessionByToken("access-token");

        expect(session).toEqual(mockSession);
      });

      it("should not return expired sessions", async () => {
        const expiredSession = {
          id: "session-123",
          user_id: "user-123",
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_at: "2020-01-01T00:00:00.000Z", // Expired
          created_at: "2024-01-01T00:00:00.000Z",
          last_used: "2024-01-01T00:00:00.000Z",
          is_revoked: 0,
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(expiredSession);

        const session = await authDb.getSessionByToken("access-token");

        expect(session).toBeNull();
      });

      it("should not return revoked sessions", async () => {
        const revokedSession = {
          id: "session-123",
          user_id: "user-123",
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_at: "2099-01-01T00:00:00.000Z",
          created_at: "2024-01-01T00:00:00.000Z",
          last_used: "2024-01-01T00:00:00.000Z",
          is_revoked: 1,
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(revokedSession);

        const session = await authDb.getSessionByToken("access-token");

        expect(session).toBeNull();
      });

      it("should return null for non-existent token", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce(undefined);

        const session = await authDb.getSessionByToken("non-existent");

        expect(session).toBeNull();
      });
    });

    describe("revokeSession", () => {
      it("should revoke session by access token", async () => {
        await authDb.revokeSession("access-token");

        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE sessions SET is_revoked = 1"),
          { $accessToken: "access-token" }
        );
      });

      it("should handle non-existent token", async () => {
        await expect(authDb.revokeSession("non-existent")).resolves.not.toThrow();
      });
    });

    describe("revokeAllUserSessions", () => {
      it("should revoke all sessions for user", async () => {
        await authDb.revokeAllUserSessions("user-123");

        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE sessions SET is_revoked = 1"),
          { $userId: "user-123" }
        );
      });

      it("should clear user cache", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        await authDb.revokeAllUserSessions("user-123");

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Cache cleared for user"));
        consoleSpy.mockRestore();
      });
    });
  });

  describe("Password Operations", () => {
    describe("hashPassword", () => {
      it("should generate salt:hash format", async () => {
        const hash = await authDb.hashPassword("password");

        expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
      });

      it("should generate different hashes for same password", async () => {
        const hash1 = await authDb.hashPassword("password");
        const hash2 = await authDb.hashPassword("password");

        expect(hash1).not.toEqual(hash2);
      });

      it("should handle empty password", async () => {
        const hash = await authDb.hashPassword("");

        expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
      });

      it("should handle special characters", async () => {
        const password = "P@$$w0rd!#$%^&*()";
        const hash = await authDb.hashPassword(password);

        expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
      });

      it("should handle unicode", async () => {
        const password = "密码🔒";
        const hash = await authDb.hashPassword(password);

        expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
      });
    });

    describe("verifyPassword", () => {
      it("should verify correct password", async () => {
        const password = "password123";
        const hash = await authDb.hashPassword(password);
        const isValid = await authDb.verifyPassword(password, hash);

        expect(isValid).toBe(true);
      });

      it("should reject incorrect password", async () => {
        const hash = await authDb.hashPassword("password123");
        const isValid = await authDb.verifyPassword("wrong-password", hash);

        expect(isValid).toBe(false);
      });

      it("should handle malformed hash", async () => {
        const isValid = await authDb.verifyPassword("password", "invalid-hash");

        expect(isValid).toBe(false);
      });

      it("should handle empty hash", async () => {
        const isValid = await authDb.verifyPassword("password", "");

        expect(isValid).toBe(false);
      });

      it("should handle hash without salt", async () => {
        const isValid = await authDb.verifyPassword("password", "abcdef1234567890");

        expect(isValid).toBe(false);
      });
    });
  });

  describe("Token Operations", () => {
    describe("createRefreshToken", () => {
      it("should create refresh token", async () => {
        await authDb.createRefreshToken("user-123", "refresh-token", 604800000);

        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO refresh_tokens"),
          expect.objectContaining({
            $userId: "user-123",
          })
        );
      });

      it("should hash token before storing", async () => {
        await authDb.createRefreshToken("user-123", "refresh-token", 604800000);

        const call = mockDb.runAsync as jest.Mock;
        const args = call.mock.calls[0];
        expect(args[1].$tokenHash).toBeDefined();
        expect(args[1].$tokenHash).not.toEqual("refresh-token");
      });
    });

    describe("isValidRefreshToken", () => {
      it("should return true for valid token", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce({ count: 1 });

        const isValid = await authDb.isValidRefreshToken("valid-token");

        expect(isValid).toBe(true);
      });

      it("should return false for invalid token", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce({ count: 0 });

        const isValid = await authDb.isValidRefreshToken("invalid-token");

        expect(isValid).toBe(false);
      });

      it("should return false for revoked token", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce({ count: 0 });

        const isValid = await authDb.isValidRefreshToken("revoked-token");

        expect(isValid).toBe(false);
      });
    });

    describe("revokeRefreshToken", () => {
      it("should revoke refresh token", async () => {
        await authDb.revokeRefreshToken("refresh-token");

        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE refresh_tokens SET is_revoked = 1"),
          expect.objectContaining({
            $tokenHash: expect.any(String),
          })
        );
      });
    });
  });

  describe("Token Refresh", () => {
    describe("refreshToken", () => {
      it("should refresh valid token", async () => {
        const mockSession = {
          id: "session-123",
          user_id: "user-123",
          access_token: "old-access-token",
          refresh_token: "old-refresh-token",
          expires_at: "2099-01-01T00:00:00.000Z",
          created_at: "2024-01-01T00:00:00.000Z",
          last_used: "2024-01-01T00:00:00.000Z",
          is_revoked: 0,
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(mockSession);

        const newTokens = await authDb.refreshToken("user-123", "old-refresh-token");

        expect(newTokens).toBeDefined();
        expect(newTokens?.accessToken).toContain("access_");
        expect(newTokens?.refreshToken).toContain("refresh_");
      });

      it("should return null for invalid token", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce(undefined);

        const newTokens = await authDb.refreshToken("user-123", "invalid-token");

        expect(newTokens).toBeNull();
      });

      it("should return null for expired token", async () => {
        const expiredSession = {
          id: "session-123",
          user_id: "user-123",
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_at: "2020-01-01T00:00:00.000Z", // Expired
          created_at: "2024-01-01T00:00:00.000Z",
          last_used: "2024-01-01T00:00:00.000Z",
          is_revoked: 0,
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(expiredSession);

        const newTokens = await authDb.refreshToken("user-123", "refresh-token");

        expect(newTokens).toBeNull();
      });

      it("should return null for revoked token", async () => {
        const revokedSession = {
          id: "session-123",
          user_id: "user-123",
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_at: "2099-01-01T00:00:00.000Z",
          created_at: "2024-01-01T00:00:00.000Z",
          last_used: "2024-01-01T00:00:00.000Z",
          is_revoked: 1,
        };

        mockDb.getFirstAsync!.mockResolvedValueOnce(revokedSession);

        const newTokens = await authDb.refreshToken("user-123", "refresh-token");

        expect(newTokens).toBeNull();
      });

      it("should handle concurrent refresh requests", async () => {
        const mockSession = {
          id: "session-123",
          user_id: "user-123",
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_at: "2099-01-01T00:00:00.000Z",
          created_at: "2024-01-01T00:00:00.000Z",
          last_used: "2024-01-01T00:00:00.000Z",
          is_revoked: 0,
        };

        mockDb.getFirstAsync!.mockResolvedValue(mockSession);

        const [tokens1, tokens2] = await Promise.all([
          authDb.refreshToken("user-123", "refresh-token"),
          authDb.refreshToken("user-123", "refresh-token"),
        ]);

        // Both should return the same tokens (single-flight pattern)
        expect(tokens1).toBeDefined();
        expect(tokens2).toBeDefined();
        expect(tokens1).toEqual(tokens2);
      });
    });
  });

  describe("Database Management", () => {
    describe("healthCheck", () => {
      it("should return true for healthy database", async () => {
        mockDb.getFirstAsync!.mockResolvedValueOnce({ test: 1 });

        const isHealthy = await authDb.healthCheck();

        expect(isHealthy).toBe(true);
      });

      it("should return false and close connection on error", async () => {
        mockDb.getFirstAsync!.mockRejectedValueOnce(new Error("Database error"));

        const isHealthy = await authDb.healthCheck();

        expect(isHealthy).toBe(false);
        expect(mockDb.closeAsync).toHaveBeenCalled();
      });
    });

    describe("closeDatabase", () => {
      it("should close database connection", async () => {
        await authDb.closeDatabase();

        expect(mockDb.closeAsync).toHaveBeenCalled();
      });

      it("should handle closing already closed database", async () => {
        await authDb.closeDatabase();
        await authDb.closeDatabase();

        expect(mockDb.closeAsync).toHaveBeenCalledTimes(1);
      });
    });

    describe("getDatabaseStats", () => {
      it("should return database statistics", async () => {
        mockDb.getFirstAsync!.mockImplementation((query: string) => {
          if (query.includes("users")) return Promise.resolve({ count: 10 });
          if (query.includes("active sessions")) return Promise.resolve({ count: 5 });
          if (query.includes("expired sessions")) return Promise.resolve({ count: 2 });
          if (query.includes("refresh_tokens")) return Promise.resolve({ count: 3 });
          return Promise.resolve({ count: 0 });
        });

        const stats = await authDb.getDatabaseStats();

        expect(stats).toEqual({
          totalUsers: 10,
          activeSessions: 5,
          expiredSessions: 2,
          activeRefreshTokens: 3,
          cacheSize: 0,
        });
      });

      it("should handle missing stats gracefully", async () => {
        mockDb.getFirstAsync!.mockResolvedValue(undefined);

        const stats = await authDb.getDatabaseStats();

        expect(stats.totalUsers).toBe(0);
        expect(stats.activeSessions).toBe(0);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long emails", async () => {
      const longEmail = "a".repeat(300) + "@example.com";
      mockDb.getFirstAsync!.mockResolvedValue({
        id: "user-123",
        email: longEmail,
        password_hash: "hash",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      });

      const user = await authDb.getUserByEmail(longEmail);

      expect(user?.email).toBe(longEmail);
    });

    it("should handle SQL injection attempts", async () => {
      const maliciousEmail = "'; DROP TABLE users; --";

      mockDb.getFirstAsync!.mockResolvedValue(undefined);

      const user = await authDb.getUserByEmail(maliciousEmail);

      expect(user).toBeNull();
      // Verify the query was parameterized correctly
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(expect.any(String), {
        $email: maliciousEmail,
      });
    });

    it("should handle concurrent database operations", async () => {
      await Promise.all([
        authDb.createUser("user-1", "user1@example.com", "hash1"),
        authDb.createUser("user-2", "user2@example.com", "hash2"),
        authDb.createUser("user-3", "user3@example.com", "hash3"),
      ]);

      expect(mockDb.runAsync).toHaveBeenCalledTimes(3);
    });

    it("should handle special characters in display name", async () => {
      const specialName = '<script>alert("xss")</script>';

      await authDb.createUser("user-123", "test@example.com", "hash", specialName);

      const call = mockDb.runAsync as jest.Mock;
      const args = call.mock.calls[0];
      expect(args[1].$displayName).toBe(specialName);
    });
  });
});
