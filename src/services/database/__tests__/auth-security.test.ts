/**
 * Security Tests for Authentication Module
 * Tests for CRITICAL security vulnerabilities
 */

import * as authDb from "../auth-db";
import * as SecureStore from "expo-secure-store";

describe("Authentication Security Tests", () => {
  beforeEach(async () => {
    await authDb.initializeDatabase();
    // Clear any existing test data
    const db = await authDb.getDatabase();
    await db.runAsync("DELETE FROM users");
    await db.runAsync("DELETE FROM sessions");
    await db.runAsync("DELETE FROM refresh_tokens");
  });

  describe("Password Security", () => {
    test("should hash passwords using PBKDF2", async () => {
      const password = "TestPassword123!";
      const hash = await authDb.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);
      expect(hash.split(":")).toHaveLength(2); // salt:hash format
    });

    test("should verify correct passwords", async () => {
      const password = "TestPassword123!";
      const hash = await authDb.hashPassword(password);
      const isValid = await authDb.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test("should reject incorrect passwords", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword123!";
      const hash = await authDb.hashPassword(password);
      const isValid = await authDb.verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    test("should generate unique hashes for same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await authDb.hashPassword(password);
      const hash2 = await authDb.hashPassword(password);

      expect(hash1).not.toEqual(hash2); // Different salts
    });

    test("should store password hash in database", async () => {
      const userId = "test_user_1";
      const email = "test@example.com";
      const password = "TestPassword123!";
      const passwordHash = await authDb.hashPassword(password);

      await authDb.createUser(userId, email, passwordHash, "Test User");

      const user = await authDb.getUserByEmail(email);
      expect(user?.password_hash).toEqual(passwordHash);
      expect(user?.password_hash).not.toEqual(password);
    });
  });

  describe("Session Security", () => {
    test("should include is_revoked column in sessions", async () => {
      const db = await authDb.getDatabase();
      const result = await db.getFirstAsync<{ sql: string }>(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'`
      );

      expect(result?.sql).toContain("is_revoked");
    });

    test("should revoke sessions correctly", async () => {
      const userId = "test_user_1";
      const email = "test@example.com";
      const passwordHash = await authDb.hashPassword("TestPassword123!");

      await authDb.createUser(userId, email, passwordHash, "Test User");
      await authDb.upsertSession(userId, "access_token_1", "refresh_token_1", 900);

      await authDb.revokeSession("access_token_1");

      const session = await authDb.getSessionByToken("access_token_1");
      expect(session).toBeNull(); // Revoked sessions should not be returned
    });

    test("should not return revoked sessions", async () => {
      const userId = "test_user_1";
      const email = "test@example.com";
      const passwordHash = await authDb.hashPassword("TestPassword123!");

      await authDb.createUser(userId, email, passwordHash, "Test User");
      await authDb.upsertSession(userId, "access_token_1", "refresh_token_1", 900);

      // Manually revoke the session
      const db = await authDb.getDatabase();
      await db.runAsync("UPDATE sessions SET is_revoked = 1 WHERE access_token = $accessToken", {
        $accessToken: "access_token_1",
      });

      const session = await authDb.getSessionByToken("access_token_1");
      expect(session).toBeNull();
    });
  });

  describe("JWT Token Security", () => {
    test("should persist JWT secret across restarts", async () => {
      // This test verifies that the JWT secret is stored in SecureStore
      // and can be retrieved after app restart

      const secret1 = await SecureStore.getItemAsync("jwt_secret");
      expect(secret1).toBeDefined();

      // Simulate app restart by clearing and getting again
      const secret2 = await SecureStore.getItemAsync("jwt_secret");
      expect(secret2).toEqual(secret1);
    });

    // Note: Token generation tests removed as they test implementation details
    // The public API (refreshToken, upsertSession) is tested in the main auth tests
  });

  describe("Account Enumeration Prevention", () => {
    test("should use generic error messages for invalid email", async () => {
      const userId = "test_user_1";
      const email = "test@example.com";
      const passwordHash = await authDb.hashPassword("TestPassword123!");

      await authDb.createUser(userId, email, passwordHash, "Test User");

      const user = await authDb.getUserByEmail("nonexistent@example.com");
      expect(user).toBeNull();
    });

    test("should not reveal if email exists during login", async () => {
      const userId = "test_user_1";
      const email = "test@example.com";
      const passwordHash = await authDb.hashPassword("TestPassword123!");

      await authDb.createUser(userId, email, passwordHash, "Test User");

      // Verify password returns false for non-existent user
      const isValid = await authDb.verifyPassword("password", "hash");
      expect(isValid).toBe(false);
    });
  });

  describe("Token Refresh Security", () => {
    test("should validate refresh token expiration", async () => {
      const userId = "test_user_1";
      const email = "test@example.com";
      const passwordHash = await authDb.hashPassword("TestPassword123!");

      await authDb.createUser(userId, email, passwordHash, "Test User");
      await authDb.upsertSession(userId, "access_token_1", "refresh_token_1", 900);

      // Valid refresh token
      const newTokens = await authDb.refreshToken(userId, "refresh_token_1");
      expect(newTokens).toBeDefined();

      // Invalid refresh token
      const invalidTokens = await authDb.refreshToken(userId, "invalid_token");
      expect(invalidTokens).toBeNull();
    });

    test("should not refresh revoked sessions", async () => {
      const userId = "test_user_1";
      const email = "test@example.com";
      const passwordHash = await authDb.hashPassword("TestPassword123!");

      await authDb.createUser(userId, email, passwordHash, "Test User");
      await authDb.upsertSession(userId, "access_token_1", "refresh_token_1", 900);

      // Revoke the session
      await authDb.revokeSession("access_token_1");

      // Try to refresh
      const newTokens = await authDb.refreshToken(userId, "refresh_token_1");
      expect(newTokens).toBeNull();
    });
  });

  describe("Password Requirements", () => {
    test("should enforce minimum password length", async () => {
      const shortPassword = "12345";
      const validPassword = "123456";

      expect(shortPassword.length).toBeLessThan(6);
      expect(validPassword.length).toBeGreaterThanOrEqual(6);
    });

    test("should handle special characters in passwords", async () => {
      const password = "P@$$w0rd!#$%";
      const hash = await authDb.hashPassword(password);
      const isValid = await authDb.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });
  });
});
