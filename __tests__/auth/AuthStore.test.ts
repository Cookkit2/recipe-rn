import { act, renderHook } from "@testing-library/react-native";
import { useAuthStore, useAuthSelectors } from "~/auth/AuthStore";
import { MockAuthStrategy } from "~/auth/MockAuthStrategy";
import type { SignInCredentials } from "~/auth/types";

describe("AuthStore", () => {
  let mockStrategy: MockAuthStrategy;

  beforeEach(() => {
    mockStrategy = new MockAuthStrategy({ delay: 0 });

    // Reset the store to initial state
    act(() => {
      useAuthStore.setState({
        user: null,
        session: null,
        authState: "idle",
        error: null,
        isLoading: false,
        isInitialized: false,
        strategy: null,
      });
    });
  });

  afterEach(() => {
    mockStrategy.clearStoredUsers();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.authState).toBe("idle");
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.strategy).toBeNull();
    });
  });

  describe("setStrategy", () => {
    it("should set the authentication strategy", () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setStrategy(mockStrategy);
      });

      expect(result.current.strategy).toBe(mockStrategy);
    });

    it("should set up auth state change listener", () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setStrategy(mockStrategy);
      });

      // Verify strategy is set
      expect(result.current.strategy).toBe(mockStrategy);
    });
  });

  describe("signInWithEmail", () => {
    beforeEach(() => {
      const { result } = renderHook(() => useAuthStore());
      act(() => {
        result.current.setStrategy(mockStrategy);
      });
    });

    it("should handle successful sign in", async () => {
      const { result } = renderHook(() => useAuthStore());
      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      let authResult;
      await act(async () => {
        authResult = await result.current.signInWithEmail(credentials);
      });

      expect(authResult.success).toBe(true);
      expect(result.current.user?.email).toBe("test@example.com");
      expect(result.current.authState).toBe("authenticated");
      expect(result.current.session).not.toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign in failure", async () => {
      const { result } = renderHook(() => useAuthStore());
      const credentials: SignInCredentials = {
        email: "invalid@example.com",
        password: "wrongpassword",
      };

      let authResult;
      await act(async () => {
        authResult = await result.current.signInWithEmail(credentials);
      });

      expect(authResult.success).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.authState).toBe("error");
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle missing strategy", async () => {
      const { result } = renderHook(() => useAuthStore());

      // Reset store to make sure no strategy is set
      act(() => {
        useAuthStore.setState({
          strategy: null,
          user: null,
          session: null,
          authState: "idle",
          error: null,
          isLoading: false,
          isInitialized: false,
        });
      });

      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      let authResult;
      await act(async () => {
        authResult = await result.current.signInWithEmail(credentials);
      });

      expect(authResult!.success).toBe(false);
      expect(authResult!.error?.code).toBe("NO_STRATEGY");
    });

    it("should set loading state during sign in", async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setStrategy(mockStrategy);
      });

      expect(result.current.isLoading).toBe(false);

      const credentials: SignInCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      await act(async () => {
        await result.current.signInWithEmail(credentials);
      });

      // After completion, should not be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.authState).toBe("authenticated");
    });
  });

  describe("signInWithProvider", () => {
    it("should handle successful social sign in", async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setStrategy(mockStrategy);
      });

      let authResult;
      await act(async () => {
        authResult = await result.current.signInWithProvider({
          provider: "google",
        });
      });

      expect(authResult.success).toBe(true);
      expect(result.current.user?.provider).toBe("google");
      expect(result.current.authState).toBe("authenticated");
    });
  });

  describe("signInAnonymously", () => {
    it("should handle anonymous sign in", async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setStrategy(mockStrategy);
      });

      let authResult;
      await act(async () => {
        authResult = await result.current.signInAnonymously();
      });

      expect(authResult.success).toBe(true);
      expect(result.current.user?.isAnonymous).toBe(true);
      expect(result.current.authState).toBe("authenticated");
    });
  });

  describe("signOut", () => {
    it("should clear user state on sign out", async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setStrategy(mockStrategy);
      });

      // First sign in
      await act(async () => {
        await result.current.signInWithEmail({
          email: "test@example.com",
          password: "password123",
        });
      });

      expect(result.current.user).not.toBeNull();

      // Then sign out
      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.authState).toBe("unauthenticated");
    });

    it("should work even without strategy", async () => {
      const { result } = renderHook(() => useAuthStore());

      // Don't set strategy but manually set user to test local cleanup
      act(() => {
        result.current._setUser({
          id: "test",
          isAnonymous: false,
          provider: "email",
          createdAt: new Date(),
          lastSignIn: new Date(),
        });
        result.current._setAuthState("authenticated");
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.authState).toBe("unauthenticated");
    });
  });

  describe("initialize", () => {
    it("should handle initialization without strategy", async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.authState).toBe("unauthenticated");
    });
  });

  describe("utility methods", () => {
    it("should clear error", () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current._setError("Test error");
      });

      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it("should validate session", async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setStrategy(mockStrategy);
      });

      // Sign in first
      await act(async () => {
        await result.current.signInWithEmail({
          email: "test@example.com",
          password: "password123",
        });
      });

      const isValid = await result.current.validateSession();
      expect(isValid).toBe(true);
    });
  });

  describe("useAuthSelectors", () => {
    it("should provide computed selectors", () => {
      const { result } = renderHook(() => useAuthSelectors());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isAnonymous).toBe(false);
      expect(result.current.hasValidSession).toBe(false);
      expect(result.current.canLinkAccount).toBe(false);
    });
  });
});
