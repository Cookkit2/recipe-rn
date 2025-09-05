import { create } from "zustand";
import type {
  User,
  AuthResult,
  SignInCredentials,
  SocialAuthConfig,
  LinkAccountCredentials,
  AuthState,
  AuthSession,
} from "./types";
import type { AuthStrategy } from "./AuthStrategy";

interface AuthStore {
  // State
  user: User | null;
  session: AuthSession | null;
  authState: AuthState;
  error: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  strategy: AuthStrategy | null;

  // Core Actions
  setStrategy: (strategy: AuthStrategy) => void;
  signInWithEmail: (credentials: SignInCredentials) => Promise<AuthResult>;
  signInWithProvider: (config: SocialAuthConfig) => Promise<AuthResult>;
  signInAnonymously: () => Promise<AuthResult>;
  signUpWithEmail: (credentials: SignInCredentials) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  refreshSession: () => Promise<AuthResult>;
  linkAnonymousAccount: (
    credentials: LinkAccountCredentials
  ) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;

  // Utility Actions
  initialize: () => Promise<void>;
  clearError: () => void;
  validateSession: () => Promise<boolean>;
  forceSignOut: () => void; // Add force sign out method

  // Internal state management
  _setAuthState: (state: AuthState) => void;
  _setUser: (user: User | null) => void;
  _setSession: (session: AuthSession | null) => void;
  _setError: (error: string | null) => void;
  _setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  authState: "idle",
  error: null,
  isLoading: false,
  isInitialized: false,
  strategy: null,

  // Set the authentication strategy
  setStrategy: (strategy: AuthStrategy) => {
    const state = get();

    // Clean up previous strategy listeners if any
    if (state.strategy) {
      // Previous strategy cleanup would happen here if needed
    }

    // Set up auth state change listener
    strategy.onAuthStateChange((user) => {
      get()._setUser(user);
      get()._setAuthState(user ? "authenticated" : "unauthenticated");
    });

    set({ strategy });
  },

  // Email/password sign in
  signInWithEmail: async (credentials: SignInCredentials) => {
    const { strategy } = get();
    if (!strategy) {
      const error = "No authentication strategy configured";
      get()._setError(error);
      return {
        success: false,
        error: { code: "NO_STRATEGY", message: error, retryable: false },
      };
    }

    get()._setLoading(true);
    get()._setError(null);
    get()._setAuthState("loading");

    try {
      const result = await strategy.signInWithEmail(credentials);

      if (result.success && result.user) {
        get()._setUser(result.user);
        get()._setSession(result.session || null);
        get()._setAuthState("authenticated");
      } else {
        get()._setAuthState("error");
        get()._setError(result.error?.message || "Sign in failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setAuthState("error");
      get()._setError(errorMessage);
      return {
        success: false,
        error: { code: "SIGNIN_ERROR", message: errorMessage, retryable: true },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Social provider sign in
  signInWithProvider: async (config: SocialAuthConfig) => {
    const { strategy } = get();
    if (!strategy) {
      const error = "No authentication strategy configured";
      get()._setError(error);
      return {
        success: false,
        error: { code: "NO_STRATEGY", message: error, retryable: false },
      };
    }

    get()._setLoading(true);
    get()._setError(null);
    get()._setAuthState("loading");

    try {
      const result = await strategy.signInWithProvider(config);

      if (result.success && result.user) {
        get()._setUser(result.user);
        get()._setSession(result.session || null);
        get()._setAuthState("authenticated");
      } else {
        get()._setAuthState("error");
        get()._setError(result.error?.message || "Social sign in failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setAuthState("error");
      get()._setError(errorMessage);
      return {
        success: false,
        error: {
          code: "SOCIAL_SIGNIN_ERROR",
          message: errorMessage,
          retryable: true,
        },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Anonymous sign in
  signInAnonymously: async () => {
    const { strategy } = get();
    if (!strategy) {
      const error = "No authentication strategy configured";
      get()._setError(error);
      return {
        success: false,
        error: { code: "NO_STRATEGY", message: error, retryable: false },
      };
    }

    get()._setLoading(true);
    get()._setError(null);
    get()._setAuthState("loading");

    try {
      const result = await strategy.signInAnonymously();

      if (result.success && result.user) {
        get()._setUser(result.user);
        get()._setSession(result.session || null);
        get()._setAuthState("authenticated");
      } else {
        get()._setAuthState("error");
        get()._setError(result.error?.message || "Anonymous sign in failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setAuthState("error");
      get()._setError(errorMessage);
      return {
        success: false,
        error: {
          code: "ANONYMOUS_SIGNIN_ERROR",
          message: errorMessage,
          retryable: true,
        },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Email/password sign up
  signUpWithEmail: async (credentials: SignInCredentials) => {
    const { strategy } = get();
    if (!strategy) {
      const error = "No authentication strategy configured";
      get()._setError(error);
      return {
        success: false,
        error: { code: "NO_STRATEGY", message: error, retryable: false },
      };
    }

    get()._setLoading(true);
    get()._setError(null);
    get()._setAuthState("loading");

    try {
      const result = await strategy.signUpWithEmail(credentials);

      if (result.success && result.user) {
        get()._setUser(result.user);
        get()._setSession(result.session || null);
        get()._setAuthState("authenticated");
      } else {
        get()._setAuthState("error");
        get()._setError(result.error?.message || "Sign up failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setAuthState("error");
      get()._setError(errorMessage);
      return {
        success: false,
        error: { code: "SIGNUP_ERROR", message: errorMessage, retryable: true },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Sign out
  signOut: async () => {
    console.log("AuthStore.signOut() called");
    const { strategy } = get();
    if (!strategy) {
      // Allow sign out even without strategy to clear local state
      get()._setUser(null);
      get()._setSession(null);
      get()._setAuthState("unauthenticated");
      return { success: true };
    }

    get()._setLoading(true);
    get()._setError(null);

    try {
      const result = await strategy.signOut();
      console.log("Strategy.signOut() completed:", result.success);

      // Clear local state regardless of strategy result
      get()._setUser(null);
      get()._setSession(null);
      get()._setAuthState("unauthenticated");

      return result;
    } catch (error) {
      console.error("Error in AuthStore.signOut():", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setError(errorMessage);

      // Still clear local state even if remote sign out failed
      get()._setUser(null);
      get()._setSession(null);
      get()._setAuthState("unauthenticated");

      return {
        success: false,
        error: {
          code: "SIGNOUT_ERROR",
          message: errorMessage,
          retryable: false,
        },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Refresh session
  refreshSession: async () => {
    const { strategy } = get();
    if (!strategy) {
      const error = "No authentication strategy configured";
      get()._setError(error);
      return {
        success: false,
        error: { code: "NO_STRATEGY", message: error, retryable: false },
      };
    }

    get()._setLoading(true);
    get()._setError(null);

    try {
      const result = await strategy.refreshSession();

      if (result.success && result.user) {
        get()._setUser(result.user);
        get()._setSession(result.session || null);
        get()._setAuthState("authenticated");
      } else {
        get()._setAuthState("error");
        get()._setError(result.error?.message || "Session refresh failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setAuthState("error");
      get()._setError(errorMessage);
      return {
        success: false,
        error: {
          code: "REFRESH_ERROR",
          message: errorMessage,
          retryable: true,
        },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Link anonymous account
  linkAnonymousAccount: async (credentials: LinkAccountCredentials) => {
    const { strategy } = get();
    if (!strategy) {
      const error = "No authentication strategy configured";
      get()._setError(error);
      return {
        success: false,
        error: { code: "NO_STRATEGY", message: error, retryable: false },
      };
    }

    get()._setLoading(true);
    get()._setError(null);

    try {
      const result = await strategy.linkAnonymousAccount(credentials);

      if (result.success && result.user) {
        get()._setUser(result.user);
        get()._setSession(result.session || null);
        get()._setAuthState("authenticated");
      } else {
        get()._setAuthState("error");
        get()._setError(result.error?.message || "Account linking failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setAuthState("error");
      get()._setError(errorMessage);
      return {
        success: false,
        error: {
          code: "LINK_ACCOUNT_ERROR",
          message: errorMessage,
          retryable: true,
        },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { strategy } = get();
    if (!strategy) {
      const error = "No authentication strategy configured";
      get()._setError(error);
      return {
        success: false,
        error: { code: "NO_STRATEGY", message: error, retryable: false },
      };
    }

    get()._setLoading(true);
    get()._setError(null);

    try {
      const result = await strategy.resetPassword(email);

      if (!result.success) {
        get()._setError(result.error?.message || "Password reset failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      get()._setError(errorMessage);
      return {
        success: false,
        error: {
          code: "RESET_PASSWORD_ERROR",
          message: errorMessage,
          retryable: true,
        },
      };
    } finally {
      get()._setLoading(false);
    }
  },

  // Initialize auth system
  initialize: async () => {
    const { strategy } = get();
    if (!strategy) {
      set({ isInitialized: true, authState: "unauthenticated" });
      return;
    }

    get()._setLoading(true);

    try {
      // Check if there's an existing session
      const user = await strategy.getCurrentUser();
      const session = await strategy.getCurrentSession();

      if (user && session) {
        // Validate the session
        const isValid = await strategy.validateSession();
        if (isValid) {
          get()._setUser(user);
          get()._setSession(session);
          get()._setAuthState("authenticated");
        } else {
          // Session is invalid, try to refresh
          const refreshResult = await strategy.refreshSession();
          if (refreshResult.success && refreshResult.user) {
            get()._setUser(refreshResult.user);
            get()._setSession(refreshResult.session || null);
            get()._setAuthState("authenticated");
          } else {
            get()._setAuthState("unauthenticated");
          }
        }
      } else {
        get()._setAuthState("unauthenticated");
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      get()._setAuthState("unauthenticated");
    } finally {
      get()._setLoading(false);
      set({ isInitialized: true });
    }
  },

  // Validate current session
  validateSession: async () => {
    const { strategy } = get();
    if (!strategy) return false;

    try {
      return await strategy.validateSession();
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  },

  // Clear error state
  clearError: () => {
    set({ error: null });
  },

  // Force sign out (bypass strategy)
  forceSignOut: () => {
    console.log("Force sign out called - clearing all auth state");
    get()._setUser(null);
    get()._setSession(null);
    get()._setAuthState("unauthenticated");
    get()._setError(null);
    get()._setLoading(false);
  },

  // Internal state management helpers

  // Internal state setters (private)
  _setAuthState: (authState: AuthState) => set({ authState }),
  _setUser: (user: User | null) => set({ user }),
  _setSession: (session: AuthSession | null) => set({ session }),
  _setError: (error: string | null) => set({ error }),
  _setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Computed selectors
export const useAuthSelectors = () => {
  const authStore = useAuthStore();

  return {
    ...authStore,
    isAuthenticated: authStore.authState === "authenticated",
    isAnonymous: authStore.user?.isAnonymous ?? false,
    hasValidSession: authStore.session !== null,
    canLinkAccount: authStore.user?.isAnonymous ?? false,
  };
};
