// Test auth types and interfaces
import type {
  User,
  AuthResult,
  SignInCredentials,
  AuthError,
  AuthSession,
  SocialAuthConfig,
  LinkAccountCredentials,
} from "~/types/AuthTypes";

describe("Auth Types", () => {
  describe("User type", () => {
    it("should have required properties", () => {
      const user: User = {
        id: "test-id",
        isAnonymous: false,
        provider: "email",
        createdAt: new Date(),
        lastSignIn: new Date(),
      };

      expect(user.id).toBe("test-id");
      expect(user.isAnonymous).toBe(false);
      expect(user.provider).toBe("email");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.lastSignIn).toBeInstanceOf(Date);
    });

    it("should allow optional properties", () => {
      const user: User = {
        id: "test-id",
        email: "test@example.com",
        name: "Test User",
        avatar: "avatar-url",
        isAnonymous: false,
        provider: "google",
        metadata: { customField: "value" },
        createdAt: new Date(),
        lastSignIn: new Date(),
      };

      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.avatar).toBe("avatar-url");
      expect(user.metadata).toEqual({ customField: "value" });
    });
  });

  describe("AuthResult type", () => {
    it("should represent successful result", () => {
      const user: User = {
        id: "test-id",
        isAnonymous: false,
        provider: "email",
        createdAt: new Date(),
        lastSignIn: new Date(),
      };

      const session: AuthSession = {
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        tokenType: "Bearer",
      };

      const result: AuthResult = {
        success: true,
        user,
        session,
      };

      expect(result.success).toBe(true);
      expect(result.user).toBe(user);
      expect(result.session).toBe(session);
      expect(result.error).toBeUndefined();
    });

    it("should represent error result", () => {
      const error: AuthError = {
        code: "TEST_ERROR",
        message: "Test error message",
        retryable: true,
      };

      const result: AuthResult = {
        success: false,
        error,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
    });
  });

  describe("SignInCredentials type", () => {
    it("should have email and password", () => {
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      expect(credentials.email).toBe("test@example.com");
      expect(credentials.password).toBe("password123");
    });
  });

  describe("SocialAuthConfig type", () => {
    it("should support different providers", () => {
      const googleConfig: SocialAuthConfig = {
        provider: "google",
        redirectUrl: "https://example.com/callback",
        scopes: ["email", "profile"],
      };

      const facebookConfig: SocialAuthConfig = {
        provider: "facebook",
      };

      expect(googleConfig.provider).toBe("google");
      expect(googleConfig.redirectUrl).toBe("https://example.com/callback");
      expect(googleConfig.scopes).toEqual(["email", "profile"]);

      expect(facebookConfig.provider).toBe("facebook");
      expect(facebookConfig.redirectUrl).toBeUndefined();
      expect(facebookConfig.scopes).toBeUndefined();
    });
  });

  describe("LinkAccountCredentials type", () => {
    it("should have required properties", () => {
      const credentials: LinkAccountCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      expect(credentials.email).toBe("test@example.com");
      expect(credentials.password).toBe("password123");
      expect(credentials.preserveData).toBeUndefined();
    });

    it("should support preserveData flag", () => {
      const credentials: LinkAccountCredentials = {
        email: "test@example.com",
        password: "password123",
        preserveData: true,
      };

      expect(credentials.preserveData).toBe(true);
    });
  });
});
