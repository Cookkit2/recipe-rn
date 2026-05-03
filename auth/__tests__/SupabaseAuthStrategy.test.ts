/**
 * Test suite for Supabase authentication strategy
 * Tests critical authentication flows including sign in, sign up, and OAuth
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { SupabaseAuthStrategy } from "~/auth/SupabaseAuthStrategy";
import type { SignInCredentials, SocialAuthConfig } from "~/types/AuthTypes";

// Mock Supabase client
jest.mock("~/lib/supabase/supabase-client", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock("~/utils/logger", () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock rate limiter
jest.mock("~/utils/rate-limiter", () => ({
  authRateLimiter: {
    canAttempt: jest.fn(() => true),
    reset: jest.fn(),
  },
}));

describe("SupabaseAuthStrategy", () => {
  let authStrategy: SupabaseAuthStrategy;

  beforeEach(() => {
    authStrategy = new SupabaseAuthStrategy();
    jest.clearAllMocks();
  });

  describe("signInWithEmail", () => {
    const validCredentials: SignInCredentials = {
      email: "test@example.com",
      password: "SecurePassword123!",
    };

    it("should successfully sign in with valid credentials", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
      };

      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authStrategy.signInWithEmail(validCredentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe("test@example.com");
      expect(result.session).toBeDefined();
      expect(result.session?.accessToken).toBe("access-token");
    });

    it("should handle invalid credentials", async () => {
      const invalidCredentials: SignInCredentials = {
        email: "test@example.com",
        password: "WrongPassword123!",
      };

      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await authStrategy.signInWithEmail(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle rate limiting", async () => {
      const { authRateLimiter } = require("~/utils/rate-limiter");
      authRateLimiter.canAttempt.mockReturnValue(false);

      const result = await authStrategy.signInWithEmail(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("TOO_MANY_ATTEMPTS");
    });

    it("should handle missing email", async () => {
      const missingEmail: SignInCredentials = {
        email: "",
        password: "SecurePassword123!",
      };

      const result = await authStrategy.signInWithEmail(missingEmail);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should handle weak password", async () => {
      const weakPassword: SignInCredentials = {
        email: "test@example.com",
        password: "weak", // Too short, doesn't meet requirements
      };

      const result = await authStrategy.signInWithEmail(weakPassword);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("signUpWithEmail", () => {
    const validCredentials: SignInCredentials = {
      email: "newuser@example.com",
      password: "SecurePassword123!",
    };

    it("should successfully sign up with valid credentials", async () => {
      const mockUser = {
        id: "user-456",
        email: "newuser@example.com",
        email_confirmed_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
      };

      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authStrategy.signUpWithEmail(validCredentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it("should handle email already registered", async () => {
      const existingUser: SignInCredentials = {
        email: "existing@example.com",
        password: "SecurePassword123!",
      };

      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      const result = await authStrategy.signUpWithEmail(existingUser);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("already exists");
    });

    it("should handle rate limiting", async () => {
      const { authRateLimiter } = require("~/utils/rate-limiter");
      authRateLimiter.canAttempt.mockReturnValue(false);

      const result = await authStrategy.signUpWithEmail(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("TOO_MANY_ATTEMPTS");
    });
  });

  describe("signInWithProvider", () => {
    const validOAuthConfig: SocialAuthConfig = {
      provider: "google",
      scopes: ["email", "profile"],
    };

    it("should successfully initiate OAuth flow", async () => {
      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: {
          url: "https://accounts.google.com/o/oauth2/v2/auth",
          provider: "google",
        },
        error: null,
      });

      const result = await authStrategy.signInWithProvider(validOAuthConfig);

      expect(result.success).toBe(true);
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: expect.stringContaining("cookkit"),
          scopes: "email profile",
        },
      });
    });

    it("should reject invalid redirect URLs", async () => {
      const invalidConfig: SocialAuthConfig = {
        provider: "google",
        redirectUrl: "https://malicious-site.com", // Not in whitelist
      };

      const result = await authStrategy.signInWithProvider(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_REDIRECT");
    });

    it("should handle provider unavailable", async () => {
      const { supabase } = require("~/lib/supabase/supabase-client");
      Object.defineProperty(supabase, "auth", {
        get: () => undefined,
        configurable: true,
      });

      const result = await authStrategy.signInWithProvider(validOAuthConfig);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SUPABASE_UNAVAILABLE");
    });
  });

  describe("signOut", () => {
    it("should successfully sign out", async () => {
      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.signOut.mockResolvedValue({ error: null });

      await authStrategy.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user when signed in", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: new Date().toISOString(),
      };

      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await authStrategy.getCurrentUser();

      expect(user).toBeDefined();
      expect(user?.email).toBe("test@example.com");
    });

    it("should return null when not signed in", async () => {
      const { supabase } = require("~/lib/supabase/supabase-client");
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No user" },
      });

      const user = await authStrategy.getCurrentUser();

      expect(user).toBeNull();
    });
  });
});
