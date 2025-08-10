import { MockAuthStrategy } from "~/auth/MockAuthStrategy";
import type { SignInCredentials, SocialAuthConfig } from "~/auth/types";

describe("MockAuthStrategy", () => {
  let mockAuth: MockAuthStrategy;

  beforeEach(() => {
    mockAuth = new MockAuthStrategy({ delay: 0 }); // No delay for tests
  });

  afterEach(() => {
    mockAuth.clearStoredUsers();
  });

  describe("initialization", () => {
    it("should initialize with default test users", () => {
      const users = mockAuth.getStoredUsers();
      expect(users.length).toBeGreaterThan(0);
      expect(users.some((u) => u.email === "test@example.com")).toBe(true);
    });

    it("should accept custom preloaded users", () => {
      const customAuth = new MockAuthStrategy({
        delay: 0,
        preloadUsers: [{ email: "custom@test.com", password: "custompass" }],
      });

      const users = customAuth.getStoredUsers();
      expect(users.some((u) => u.email === "custom@test.com")).toBe(true);
    });
  });

  describe("getCurrentUser", () => {
    it("should return null when no user is signed in", async () => {
      const user = await mockAuth.getCurrentUser();
      expect(user).toBeNull();
    });

    it("should return current user after sign in", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      await mockAuth.signInWithEmail(credentials);
      const user = await mockAuth.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.email).toBe("test@example.com");
    });
  });

  describe("getCurrentSession", () => {
    it("should return null when no session exists", async () => {
      const session = await mockAuth.getCurrentSession();
      expect(session).toBeNull();
    });

    it("should return session after sign in", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      await mockAuth.signInWithEmail(credentials);
      const session = await mockAuth.getCurrentSession();

      expect(session).not.toBeNull();
      expect(session?.accessToken).toMatch(/mock-token/);
      expect(session?.tokenType).toBe("Bearer");
    });
  });

  describe("signInWithEmail", () => {
    it("should sign in with valid credentials", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await mockAuth.signInWithEmail(credentials);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("test@example.com");
      expect(result.user?.isAnonymous).toBe(false);
      expect(result.session).toBeDefined();
    });

    it("should fail with invalid email", async () => {
      const credentials: SignInCredentials = {
        email: "invalid@example.com",
        password: "password123",
      };

      const result = await mockAuth.signInWithEmail(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
      expect(result.error?.message).toContain("No user found");
    });

    it("should fail with invalid password", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const result = await mockAuth.signInWithEmail(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
      expect(result.error?.message).toContain("Invalid password");
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe("signInWithProvider", () => {
    it("should sign in with social provider", async () => {
      const config: SocialAuthConfig = {
        provider: "google",
        scopes: ["email", "profile"],
      };

      const result = await mockAuth.signInWithProvider(config);

      expect(result.success).toBe(true);
      expect(result.user?.provider).toBe("google");
      expect(result.user?.email).toBe("user@google.com");
      expect(result.user?.isAnonymous).toBe(false);
    });

    it("should work with different providers", async () => {
      const facebookConfig: SocialAuthConfig = { provider: "facebook" };
      const appleConfig: SocialAuthConfig = { provider: "apple" };

      const facebookResult = await mockAuth.signInWithProvider(facebookConfig);
      await mockAuth.signOut();
      const appleResult = await mockAuth.signInWithProvider(appleConfig);

      expect(facebookResult.user?.provider).toBe("facebook");
      expect(appleResult.user?.provider).toBe("apple");
    });
  });

  describe("signInAnonymously", () => {
    it("should create anonymous user", async () => {
      const result = await mockAuth.signInAnonymously();

      expect(result.success).toBe(true);
      expect(result.user?.isAnonymous).toBe(true);
      expect(result.user?.provider).toBe("anonymous");
      expect(result.user?.email).toBeUndefined();
      expect(result.session).toBeDefined();
    });
  });

  describe("signUpWithEmail", () => {
    it("should create new user account", async () => {
      const credentials: SignInCredentials = {
        email: "newuser@example.com",
        password: "newpassword",
      };

      const result = await mockAuth.signUpWithEmail(credentials);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("newuser@example.com");
      expect(result.user?.isAnonymous).toBe(false);
      expect(result.user?.provider).toBe("email");
    });

    it("should fail if email already exists", async () => {
      const credentials: SignInCredentials = {
        email: "test@example.com", // Already exists
        password: "password123",
      };

      const result = await mockAuth.signUpWithEmail(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("signOut", () => {
    it("should clear current user and session", async () => {
      // First sign in
      await mockAuth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      expect(await mockAuth.getCurrentUser()).not.toBeNull();

      // Then sign out
      const result = await mockAuth.signOut();

      expect(result.success).toBe(true);
      expect(await mockAuth.getCurrentUser()).toBeNull();
      expect(await mockAuth.getCurrentSession()).toBeNull();
    });
  });

  describe("refreshSession", () => {
    it("should refresh valid session", async () => {
      // Sign in first
      await mockAuth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      const originalSession = await mockAuth.getCurrentSession();

      // Refresh session
      const result = await mockAuth.refreshSession();
      const newSession = await mockAuth.getCurrentSession();

      expect(result.success).toBe(true);
      expect(newSession).not.toBeNull();
      expect(newSession?.accessToken).not.toBe(originalSession?.accessToken);
    });

    it("should fail when no session exists", async () => {
      const result = await mockAuth.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NO_SESSION");
    });
  });

  describe("linkAnonymousAccount", () => {
    it("should link anonymous account to email", async () => {
      // First sign in anonymously
      await mockAuth.signInAnonymously();
      const anonymousUser = await mockAuth.getCurrentUser();

      // Link to email account
      const result = await mockAuth.linkAnonymousAccount({
        email: "linked@example.com",
        password: "linkpassword",
      });

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(anonymousUser?.id); // Same user ID
      expect(result.user?.email).toBe("linked@example.com");
      expect(result.user?.isAnonymous).toBe(false);
      expect(result.user?.provider).toBe("email");
    });

    it("should fail if user is not anonymous", async () => {
      // Sign in with email (not anonymous)
      await mockAuth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      const result = await mockAuth.linkAnonymousAccount({
        email: "link@example.com",
        password: "linkpassword",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_ANONYMOUS");
    });

    it("should fail if email already exists", async () => {
      // Sign in anonymously
      await mockAuth.signInAnonymously();

      const result = await mockAuth.linkAnonymousAccount({
        email: "test@example.com", // Already exists
        password: "linkpassword",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("resetPassword", () => {
    it("should always return success (security)", async () => {
      const result = await mockAuth.resetPassword("test@example.com");
      expect(result.success).toBe(true);

      const invalidResult = await mockAuth.resetPassword("invalid@example.com");
      expect(invalidResult.success).toBe(true);
    });
  });

  describe("validateSession", () => {
    it("should return true for valid session", async () => {
      await mockAuth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      const isValid = await mockAuth.validateSession();
      expect(isValid).toBe(true);
    });

    it("should return false when no session", async () => {
      const isValid = await mockAuth.validateSession();
      expect(isValid).toBe(false);
    });
  });

  describe("onAuthStateChange", () => {
    it("should notify listeners on sign in", async () => {
      const listener = jest.fn();
      const unsubscribe = mockAuth.onAuthStateChange(listener);

      await mockAuth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
        })
      );

      unsubscribe();
    });

    it("should notify listeners on sign out", async () => {
      const listener = jest.fn();

      // Sign in first
      await mockAuth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      // Add listener after sign in
      const unsubscribe = mockAuth.onAuthStateChange(listener);
      listener.mockClear();

      // Sign out
      await mockAuth.signOut();

      expect(listener).toHaveBeenCalledWith(null);
      unsubscribe();
    });

    it("should allow unsubscribing", async () => {
      const listener = jest.fn();
      const unsubscribe = mockAuth.onAuthStateChange(listener);

      unsubscribe();

      await mockAuth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("getProviderInfo", () => {
    it("should return mock provider info", () => {
      const info = mockAuth.getProviderInfo();

      expect(info.name).toBe("MockAuthStrategy");
      expect(info.version).toBe("1.0.0");
      expect(info.features).toContain("email");
      expect(info.features).toContain("social");
      expect(info.features).toContain("anonymous");
    });
  });

  describe("test utilities", () => {
    it("should allow adding test users", () => {
      mockAuth.addTestUser("testutil@example.com", "testpass");

      const users = mockAuth.getStoredUsers();
      expect(users.some((u) => u.email === "testutil@example.com")).toBe(true);
    });

    it("should allow clearing users", () => {
      mockAuth.clearStoredUsers();

      const users = mockAuth.getStoredUsers();
      expect(users.length).toBe(0);
    });
  });
});
