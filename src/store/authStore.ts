import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as authDb from "~/src/services/database/auth-db";
import { safeJsonParse } from "~/utils/json-parsing";
import type { User, AuthSession, AuthError } from "~/src/types/auth";

// Single-flight pattern for token refresh to prevent multiple simultaneous requests
let refreshInProgress: Promise<void> | null = null;

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

type AuthStateInitial = Omit<
  AuthState,
  "login" | "register" | "logout" | "refreshSession" | "checkAuth" | "clearError"
>;

const initialState: AuthStateInitial = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

/**
 * Email validation
 */
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Common validation logic for login and register
 */
const validateCredentials = (
  email: string,
  password: string,
  displayName?: string
): { isValid: boolean; error?: string } => {
  if (!email || !isValidEmail(email)) {
    return { isValid: false, error: "Invalid email format" };
  }
  if (!password || password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }
  if (displayName !== undefined && displayName.trim().length === 0) {
    return { isValid: false, error: "Display name is required" };
  }
  return { isValid: true };
};

/**
 * Common authentication flow for login and register
 */
const performAuthFlow = async (
  email: string,
  password: string,
  displayName: string | undefined,
  isRegister: boolean
): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  // Check if user exists (for registration)
  if (isRegister) {
    const existingUser = await authDb.getUserByEmail(email);
    if (existingUser) {
      throw new Error("User already exists");
    }
  } else {
    // For login, verify user exists
    const user = await authDb.getUserByEmail(email);
    if (!user || !user.password_hash) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await authDb.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }
  }

  // Generate tokens
  const userId = isRegister
    ? `user_${Crypto.randomUUID()}`
    : (await authDb.getUserByEmail(email))!.id;
  const accessToken = `access_${Crypto.randomUUID()}`;
  const refreshToken = `refresh_${Crypto.randomUUID()}`;

  if (isRegister) {
    // Hash password before storing
    const passwordHash = await authDb.hashPassword(password);
    await authDb.createUser(userId, email, passwordHash, displayName);
  }

  // Store session
  await Promise.all([
    authDb.upsertSession(userId, accessToken, refreshToken, 900), // 15 minutes
    authDb.createRefreshToken(userId, refreshToken, 604800000), // 7 days
    SecureStore.setItemAsync("user_session", JSON.stringify({ userId, accessToken, refreshToken })),
  ]);

  return {
    user: {
      id: userId,
      email,
      displayName:
        displayName ||
        (isRegister ? undefined : (await authDb.getUserByEmail(email))!.display_name),
    },
    accessToken,
    refreshToken,
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        // Validate credentials
        const validation = validateCredentials(email, password);
        if (!validation.isValid) {
          const errorMsg = "Invalid credentials";
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }

        set({ isLoading: true, error: null });

        try {
          const result = await performAuthFlow(email, password, undefined, false);

          // Update state
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const authError = error instanceof Error ? error : new Error("Invalid credentials");
          set({
            error: "Invalid credentials",
            isLoading: false,
          });
          throw authError;
        }
      },

      register: async (email: string, password: string, displayName?: string) => {
        // Validate credentials
        const validation = validateCredentials(email, password, displayName);
        if (!validation.isValid) {
          const errorMsg = validation.error || "Registration failed";
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }

        set({ isLoading: true, error: null });

        try {
          const result = await performAuthFlow(email, password, displayName, true);

          // Update state
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const authError = error instanceof Error ? error : new Error("Registration failed");
          const safeError =
            authError.message === "User already exists"
              ? "Registration failed"
              : "Registration failed";
          set({
            error: safeError,
            isLoading: false,
          });
          throw new Error(safeError);
        }
      },

      logout: async () => {
        try {
          const { accessToken } = get();

          const logoutPromises: Array<Promise<unknown>> = [
            SecureStore.deleteItemAsync("user_session"),
          ];

          if (accessToken) {
            // Revoke session in database concurrently
            logoutPromises.push(authDb.revokeSession(accessToken));
          }

          await Promise.allSettled(logoutPromises);

          // Reset state - ALWAYS do this, even if errors occur
          set(initialState);
        } catch (error) {
          // Always reset state on logout, regardless of errors
          set(initialState);
        }
      },

      refreshSession: async () => {
        const { user, refreshToken } = get();

        if (!user || !refreshToken) {
          return;
        }

        // Single-flight pattern: if a refresh is already in progress, wait for it
        if (refreshInProgress) {
          console.log("[AuthStore] Token refresh already in progress, waiting...");
          try {
            await refreshInProgress;
          } catch {
            // If the in-progress refresh failed, try again
          }
          return;
        }

        set({ isLoading: true, error: null });

        refreshInProgress = (async () => {
          try {
            // Refresh token via database (with debouncing built-in)
            const newTokens = await authDb.refreshToken(user.id, refreshToken);

            if (newTokens) {
              // Update secure store
              await SecureStore.setItemAsync(
                "user_session",
                JSON.stringify({
                  userId: user.id,
                  accessToken: newTokens.accessToken,
                  refreshToken: newTokens.refreshToken,
                })
              );

              // Update state
              set({
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                isLoading: false,
              });
            } else {
              // Token refresh failed, logout user
              await get().logout();
            }
          } catch (error) {
            const authError = error instanceof Error ? error : new Error("Session refresh failed");
            set({
              error: authError.message || "Session refresh failed",
              isLoading: false,
            });
            await get().logout();
          } finally {
            refreshInProgress = null;
          }
        })();

        await refreshInProgress;
      },

      checkAuth: async () => {
        set({ isLoading: true, error: null });

        try {
          // Get session from secure store
          const sessionStr = await SecureStore.getItemAsync("user_session");

          if (!sessionStr) {
            set({ isLoading: false, isAuthenticated: false });
            return;
          }

          const session = safeJsonParse<AuthSession>(sessionStr, {} as AuthSession);

          // Check if tokens are still valid
          const dbSession = await authDb.getSessionByToken(session.accessToken);

          if (dbSession && !dbSession.is_revoked) {
            const [, user] = await Promise.all([
              authDb.upsertSession(session.userId, session.accessToken, session.refreshToken, 900),
              authDb.getUserById(session.userId),
            ]);

            if (user) {
              set({
                user,
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }

          // Session is invalid, logout
          await get().logout();
        } catch (error) {
          // Sanitize error logging - don't log sensitive information
          set({ isLoading: false, isAuthenticated: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-storage",
      storage: {
        getItem: async (name: string): Promise<StorageValue<AuthState> | null> => {
          const str = await SecureStore.getItemAsync(name);
          if (!str) return null;
          return safeJsonParse<StorageValue<AuthState> | null>(str, null);
        },
        setItem: async (name: string, value: StorageValue<AuthState>): Promise<void> => {
          await SecureStore.setItemAsync(name, JSON.stringify(value));
        },
        removeItem: async (name: string): Promise<void> => {
          await SecureStore.deleteItemAsync(name);
        },
      },
      partialize: (state: AuthState) =>
        ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }) as AuthState,
      onRehydrateStorage: () => (state?: AuthState) => {
        if (state) {
          // Hydrated from storage, check auth
          state.checkAuth();
        }
      },
    }
  )
);
