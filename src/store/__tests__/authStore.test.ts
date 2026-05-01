/**
 * Authentication Store Tests
 * Tests for Zustand auth store with comprehensive coverage
 */

import { act } from "@testing-library/react-native";
import { useAuthStore } from "../authStore";
import * as authDb from "~/src/services/database/auth-db";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

// Mock dependencies before importing
jest.mock("~/src/services/database/auth-db", () => ({
  getDatabase: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  upsertSession: jest.fn(),
  getSessionByToken: jest.fn(),
  revokeSession: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  refreshToken: jest.fn(),
  createRefreshToken: jest.fn(),
  clearUserCache: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-crypto", () => ({
  getRandomBytes: jest.fn(),
  digestStringAsync: jest.fn(),
  uuidRandom: jest.fn(() => "test-uuid-123"),
}));

type StoreInitializer = (set: unknown, get: unknown) => Record<string, unknown>;

jest.mock("zustand/middleware", () => ({
  persist: (config: StoreInitializer) => (create: unknown) => (set: unknown, get: unknown) => ({
    ...config(set, get),
    // Skip persist middleware in tests
  }),
}));

const mockCrypto = Crypto as jest.Mocked<typeof Crypto> & { uuidRandom: jest.Mock };
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAuthDb = authDb as jest.Mocked<typeof authDb>;

// Helper to get a fresh store instance for each test
const getFreshStore = () => {
  // Reset the store by creating a new instance
  const { getState } = useAuthStore;
  return { getState };
};

describe("AuthStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (mockCrypto.uuidRandom as jest.Mock).mockReturnValue("test-uuid-123");
    mockCrypto.getRandomBytes.mockReturnValue(new Uint8Array(32));
    mockCrypto.digestStringAsync.mockResolvedValue(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    // Reset store state - clear all mocks
    jest.clearAllMocks();

    // Reset the store to initial state
    const initialState = {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };

    useAuthStore.setState(initialState);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("Login", () => {
    const validCredentials = {
      email: "test@example.com",
      password: "password123",
    };

    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        id: "user-123",
        email: validCredentials.email,
        display_name: "Test User",
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthDb.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthDb.verifyPassword.mockResolvedValue(true);

      await act(async () => {
        await useAuthStore.getState().login(validCredentials.email, validCredentials.password);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.display_name,
      });
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toContain("access_");
      expect(state.refreshToken).toContain("refresh_");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should reject invalid email format", async () => {
      await act(async () => {
        await expect(useAuthStore.getState().login("invalid-email", "password123")).rejects.toThrow(
          "Invalid credentials"
        );
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe("Invalid credentials");
      expect(state.isAuthenticated).toBe(false);
    });

    it("should reject short password", async () => {
      await act(async () => {
        await expect(useAuthStore.getState().login("test@example.com", "12345")).rejects.toThrow(
          "Invalid credentials"
        );
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe("Invalid credentials");
    });

    it("should reject non-existent user", async () => {
      mockAuthDb.getUserByEmail.mockResolvedValue(null);

      await act(async () => {
        await expect(
          useAuthStore.getState().login(validCredentials.email, validCredentials.password)
        ).rejects.toThrow("Invalid credentials");
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe("Invalid credentials");
    });

    it("should reject wrong password", async () => {
      const mockUser = {
        id: "user-123",
        email: validCredentials.email,
        display_name: "Test User",
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthDb.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthDb.verifyPassword.mockResolvedValue(false);

      await act(async () => {
        await expect(
          useAuthStore.getState().login(validCredentials.email, validCredentials.password)
        ).rejects.toThrow("Invalid credentials");
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      mockAuthDb.getUserByEmail.mockRejectedValue(new Error("Database error"));

      await act(async () => {
        await expect(
          useAuthStore.getState().login(validCredentials.email, validCredentials.password)
        ).rejects.toThrow();
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should set loading state during login", async () => {
      mockAuthDb.getUserByEmail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 100))
      );

      act(() => {
        useAuthStore.getState().login(validCredentials.email, validCredentials.password);
      });

      // Check loading state during operation
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it("should store session in secure store", async () => {
      const mockUser = {
        id: "user-123",
        email: validCredentials.email,
        display_name: "Test User",
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthDb.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthDb.verifyPassword.mockResolvedValue(true);

      await act(async () => {
        await useAuthStore.getState().login(validCredentials.email, validCredentials.password);
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "user_session",
        expect.stringContaining('"userId"')
      );
    });
  });

  describe("Register", () => {
    const validRegistration = {
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
    };

    it("should register successfully with valid data", async () => {
      mockAuthDb.getUserByEmail.mockResolvedValue(null); // User doesn't exist
      mockAuthDb.hashPassword.mockResolvedValue("hashed-password");

      await act(async () => {
        await useAuthStore
          .getState()
          .register(
            validRegistration.email,
            validRegistration.password,
            validRegistration.displayName
          );
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        id: expect.stringContaining("user_"),
        email: validRegistration.email,
        displayName: validRegistration.displayName,
      });
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();

      expect(mockAuthDb.createUser).toHaveBeenCalled();
    });

    it("should reject invalid email format", async () => {
      await act(async () => {
        await expect(
          useAuthStore.getState().register("invalid-email", "password123", "Test")
        ).rejects.toThrow("Invalid email format");
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should reject short password", async () => {
      await act(async () => {
        await expect(
          useAuthStore.getState().register("test@example.com", "12345", "Test")
        ).rejects.toThrow("Password must be at least 6 characters");
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should reject empty display name", async () => {
      await act(async () => {
        await expect(
          useAuthStore.getState().register("test@example.com", "password123", "   ")
        ).rejects.toThrow("Display name is required");
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should reject existing user", async () => {
      const existingUser = {
        id: "existing-user",
        email: validRegistration.email,
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthDb.getUserByEmail.mockResolvedValue(existingUser);

      await act(async () => {
        await expect(
          useAuthStore
            .getState()
            .register(
              validRegistration.email,
              validRegistration.password,
              validRegistration.displayName
            )
        ).rejects.toThrow("Registration failed");
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe("Registration failed");
    });

    it("should allow display name to be optional", async () => {
      mockAuthDb.getUserByEmail.mockResolvedValue(null);
      mockAuthDb.hashPassword.mockResolvedValue("hashed-password");

      await act(async () => {
        await useAuthStore.getState().register("test@example.com", "password123");
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe("Logout", () => {
    it("should clear all state on logout", async () => {
      // Setup logged in state
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        display_name: "Test User",
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthDb.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthDb.verifyPassword.mockResolvedValue(true);

      await act(async () => {
        await useAuthStore.getState().login("test@example.com", "password123");
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should revoke session in database", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        display_name: "Test User",
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthDb.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthDb.verifyPassword.mockResolvedValue(true);

      await act(async () => {
        await useAuthStore.getState().login("test@example.com", "password123");
      });

      const accessToken = useAuthStore.getState().accessToken!;

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(mockAuthDb.revokeSession).toHaveBeenCalledWith(accessToken);
    });

    it("should delete session from secure store", async () => {
      mockAuthDb.getUserByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockAuthDb.verifyPassword.mockResolvedValue(true);

      await act(async () => {
        await useAuthStore.getState().login("test@example.com", "password123");
      });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("user_session");
    });

    it("should handle logout errors gracefully", async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error("Storage error"));

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      // State should still be cleared even if errors occur
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("Token Refresh", () => {
    beforeEach(() => {
      // Setup logged in state
      useAuthStore.setState({
        user: { id: "user-123", email: "test@example.com" },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    it("should refresh tokens successfully", async () => {
      const newTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockAuthDb.refreshToken.mockResolvedValue(newTokens);

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(newTokens.accessToken);
      expect(state.refreshToken).toBe(newTokens.refreshToken);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it("should logout if refresh fails", async () => {
      mockAuthDb.refreshToken.mockResolvedValue(null);

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it("should handle refresh errors", async () => {
      mockAuthDb.refreshToken.mockRejectedValue(new Error("Refresh failed"));

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
    });

    it("should return early if no user or refresh token", async () => {
      useAuthStore.setState({
        user: null,
        refreshToken: null,
      });

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      expect(mockAuthDb.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe("Check Auth", () => {
    it("should restore session from secure store", async () => {
      const mockSession = {
        userId: "user-123",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        display_name: "Test User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockSession));
      mockAuthDb.getSessionByToken.mockResolvedValue({
        id: "session-123",
        user_id: "user-123",
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: new Date(Date.now() + 900000).toISOString(),
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        is_revoked: 0,
      });
      mockAuthDb.getUserById.mockResolvedValue(mockUser);

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.display_name,
      });
      expect(state.isAuthenticated).toBe(true);
    });

    it("should logout if session is revoked", async () => {
      const mockSession = {
        userId: "user-123",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockSession));
      mockAuthDb.getSessionByToken.mockResolvedValue({
        id: "session-123",
        user_id: "user-123",
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: new Date(Date.now() + 900000).toISOString(),
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        is_revoked: 1, // Revoked
      });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should logout if no session in secure store", async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("should handle malformed session data", async () => {
      mockSecureStore.getItemAsync.mockResolvedValue("invalid-json");

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("Clear Error", () => {
    it("should clear error state", () => {
      useAuthStore.setState({ error: "Some error" });

      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent login requests", async () => {
      mockAuthDb.getUserByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockAuthDb.verifyPassword.mockResolvedValue(true);

      await act(async () => {
        await Promise.all([
          useAuthStore.getState().login("test@example.com", "password123"),
          useAuthStore.getState().login("test@example.com", "password123"),
        ]);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
    });

    it("should handle special characters in email", async () => {
      const email = "test+user@example.com";

      mockAuthDb.getUserByEmail.mockResolvedValue({
        id: "user-123",
        email: email,
        password_hash: "hash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockAuthDb.verifyPassword.mockResolvedValue(true);

      await act(async () => {
        await useAuthStore.getState().login(email, "password123");
      });

      expect(useAuthStore.getState().user?.email).toBe(email);
    });

    it("should handle unicode in display name", async () => {
      mockAuthDb.getUserByEmail.mockResolvedValue(null);
      mockAuthDb.hashPassword.mockResolvedValue("hash");

      await act(async () => {
        await useAuthStore.getState().register("test@example.com", "password123", "用户名");
      });

      expect(useAuthStore.getState().user?.displayName).toBe("用户名");
    });

    it("should handle very long emails", async () => {
      const longEmail = "a".repeat(320) + "@example.com";

      await act(async () => {
        await expect(useAuthStore.getState().login(longEmail, "password123")).rejects.toThrow();
      });
    });

    it("should handle null password hash gracefully", async () => {
      mockAuthDb.getUserByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await act(async () => {
        await expect(
          useAuthStore.getState().login("test@example.com", "password123")
        ).rejects.toThrow("Invalid credentials");
      });
    });
  });
});
