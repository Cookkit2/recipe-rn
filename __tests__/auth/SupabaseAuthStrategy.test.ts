import { SupabaseAuthStrategy } from "~/auth/SupabaseAuthStrategy";
import { supabase } from "~/auth/supabase-client";
import { APP_CONFIG } from "~/lib/constants";
import type { SignInCredentials, SocialAuthConfig } from "~/auth/types";

// Mock Supabase client
jest.mock("~/auth/supabase-client", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInAnonymously: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// Mock Expo modules
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "recipe-app://auth/callback"),
}));

jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));

describe("SupabaseAuthStrategy", () => {
  let strategy: SupabaseAuthStrategy;
  let mockSupabase: jest.Mocked<typeof supabase>;

  beforeEach(() => {
    mockSupabase = supabase as jest.Mocked<typeof supabase>;
    jest.clearAllMocks();

    // Setup default mock for onAuthStateChange
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    } as any);

    strategy = new SupabaseAuthStrategy();
  });

  describe("initialization", () => {
    it("should initialize and set up auth listener", () => {
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    it("should provide correct provider info", () => {
      const info = strategy.getProviderInfo();
      expect(info.name).toBe("SupabaseAuthStrategy");
      expect(info.version).toBe("1.0.0");
      expect(info.features).toContain("email");
      expect(info.features).toContain("social");
      expect(info.features).toContain("oauth");
    });
  });

  describe("getCurrentUser", () => {
    it("should return null when no user is authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await strategy.getCurrentUser();
      expect(user).toBeNull();
    });

    it("should return mapped user when authenticated", async () => {
      const mockSupabaseUser = {
        id: "user-123",
        email: "test@example.com",
        created_at: "2024-01-01T00:00:00Z",
        last_sign_in_at: "2024-01-01T01:00:00Z",
        user_metadata: {
          name: "Test User",
          avatar_url: "https://example.com/avatar.jpg",
        },
        is_anonymous: false,
        identities: [{ provider: "email" }],
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      } as any);

      const user = await strategy.getCurrentUser();

      expect(user).toEqual({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        avatar: "https://example.com/avatar.jpg",
        isAnonymous: false,
        provider: "email",
        metadata: mockSupabaseUser.user_metadata,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        lastSignIn: new Date("2024-01-01T01:00:00Z"),
      });
    });

    it("should handle errors gracefully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Network error" } as any,
      });

      const user = await strategy.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe("getCurrentSession", () => {
    it("should return null when no session exists", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await strategy.getCurrentSession();
      expect(session).toBeNull();
    });

    it("should return mapped session when exists", async () => {
      const mockSession = {
        access_token: "access-token-123",
        refresh_token: "refresh-token-123",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Bearer",
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any);

      const session = await strategy.getCurrentSession();

      expect(session).toEqual({
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresAt: new Date(mockSession.expires_at * 1000),
        tokenType: "Bearer",
      });
    });
  });

  describe("signInWithEmail", () => {
    it("should sign in successfully with valid credentials", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        created_at: "2024-01-01T00:00:00Z",
        last_sign_in_at: "2024-01-01T01:00:00Z",
        user_metadata: {},
        is_anonymous: false,
        identities: [{ provider: "email" }],
      };

      const mockSession = {
        access_token: "access-token-123",
        refresh_token: "refresh-token-123",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Bearer",
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      } as any);

      const result = await strategy.signInWithEmail(credentials);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("test@example.com");
      expect(result.session?.accessToken).toBe("access-token-123");
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should handle invalid credentials error", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" } as any,
      });

      const result = await strategy.signInWithEmail(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Invalid email or password");
    });

    it("should handle network errors", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error("Network error")
      );

      const result = await strategy.signInWithEmail(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "An unexpected error occurred during sign in"
      );
    });
  });

  describe("signInWithProvider", () => {
    it("should initiate OAuth flow successfully", async () => {
      const config: SocialAuthConfig = {
        provider: "google",
        scopes: ["email", "profile"],
      };

      const mockAuthUrl = "https://supabase.co/auth/google";

      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: mockAuthUrl },
        error: null,
      } as any);

      const mockLinking = require("expo-linking");
      mockLinking.openURL.mockResolvedValue(true);

      const result = await strategy.signInWithProvider(config);

      expect(result.success).toBe(true);
      expect(mockLinking.openURL).toHaveBeenCalledWith(mockAuthUrl);
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${APP_CONFIG.DEEP_LINK_SCHEME}://${APP_CONFIG.DEEP_LINK_PATHS.AUTH_CALLBACK}`,
          scopes: "email profile",
        },
      });
    });

    it("should handle OAuth initiation failure", async () => {
      const config: SocialAuthConfig = {
        provider: "google",
      };

      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: { message: "OAuth provider not configured" } as any,
      });

      const result = await strategy.signInWithProvider(config);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("OAuth provider not configured");
    });
  });

  describe("signInAnonymously", () => {
    it("should sign in anonymously successfully", async () => {
      const mockUser = {
        id: "anon-user-123",
        created_at: "2024-01-01T00:00:00Z",
        last_sign_in_at: "2024-01-01T01:00:00Z",
        user_metadata: {},
        is_anonymous: true,
        identities: [],
      };

      const mockSession = {
        access_token: "anon-access-token-123",
        refresh_token: "anon-refresh-token-123",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Bearer",
      };

      mockSupabase.auth.signInAnonymously.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      } as any);

      const result = await strategy.signInAnonymously();

      expect(result.success).toBe(true);
      expect(result.user?.isAnonymous).toBe(true);
      expect(result.user?.provider).toBe("anonymous");
      expect(result.session?.accessToken).toBe("anon-access-token-123");
    });

    it("should handle anonymous sign in failure", async () => {
      mockSupabase.auth.signInAnonymously.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Anonymous sign in disabled" } as any,
      });

      const result = await strategy.signInAnonymously();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Anonymous sign in disabled");
    });
  });

  describe("signUpWithEmail", () => {
    it("should sign up successfully and return user", async () => {
      const credentials: SignInCredentials = {
        email: "newuser@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "new-user-123",
        email: "newuser@example.com",
        created_at: "2024-01-01T00:00:00Z",
        last_sign_in_at: null,
        user_metadata: {},
        is_anonymous: false,
        email_confirmed_at: "2024-01-01T00:00:00Z",
        identities: [{ provider: "email" }],
      };

      const mockSession = {
        access_token: "new-access-token-123",
        refresh_token: "new-refresh-token-123",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Bearer",
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      } as any);

      const result = await strategy.signUpWithEmail(credentials);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("newuser@example.com");
      expect(result.session?.accessToken).toBe("new-access-token-123");
    });

    it("should handle email confirmation required", async () => {
      const credentials: SignInCredentials = {
        email: "newuser@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "new-user-123",
        email: "newuser@example.com",
        created_at: "2024-01-01T00:00:00Z",
        last_sign_in_at: null,
        user_metadata: {},
        is_anonymous: false,
        email_confirmed_at: null, // Email not confirmed
        identities: [{ provider: "email" }],
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null }, // No session when email confirmation required
        error: null,
      } as any);

      const result = await strategy.signUpWithEmail(credentials);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("newuser@example.com");
      expect(result.session).toBeNull(); // No session until email confirmed
    });

    it("should handle email already exists error", async () => {
      const credentials: SignInCredentials = {
        email: "existing@example.com",
        password: "password123",
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" } as any,
      });

      const result = await strategy.signUpWithEmail(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "An account with this email already exists"
      );
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await strategy.signOut();

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it("should handle sign out error but still clear local state", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: "Network error" } as any,
      });

      const result = await strategy.signOut();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Sign out completed locally but may have failed on server"
      );
    });
  });

  describe("refreshSession", () => {
    it("should refresh session successfully", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        created_at: "2024-01-01T00:00:00Z",
        last_sign_in_at: "2024-01-01T01:00:00Z",
        user_metadata: {},
        is_anonymous: false,
        identities: [{ provider: "email" }],
      };

      const mockSession = {
        access_token: "new-access-token-123",
        refresh_token: "new-refresh-token-123",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Bearer",
      };

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      } as any);

      const result = await strategy.refreshSession();

      expect(result.success).toBe(true);
      expect(result.session?.accessToken).toBe("new-access-token-123");
    });

    it("should handle refresh failure", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Refresh token expired" } as any,
      });

      const result = await strategy.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Refresh token expired");
    });
  });

  describe("validateSession", () => {
    it("should return true for valid session", async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockSession = {
        access_token: "valid-token",
        expires_at: futureExpiry,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any);

      const isValid = await strategy.validateSession();
      expect(isValid).toBe(true);
    });

    it("should return false for expired session", async () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const mockSession = {
        access_token: "expired-token",
        expires_at: pastExpiry,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any);

      const isValid = await strategy.validateSession();
      expect(isValid).toBe(false);
    });

    it("should return false when no session", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const isValid = await strategy.validateSession();
      expect(isValid).toBe(false);
    });
  });

  describe("resetPassword", () => {
    it("should send password reset email successfully", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      } as any);

      const result = await strategy.resetPassword("test@example.com");

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        {
          redirectTo: `${APP_CONFIG.DEEP_LINK_SCHEME}://${APP_CONFIG.DEEP_LINK_PATHS.RESET_PASSWORD}`,
        }
      );
    });

    it("should handle password reset error", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: "Email rate limit exceeded" } as any,
      });

      const result = await strategy.resetPassword("test@example.com");

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Email rate limit exceeded");
    });
  });
});
