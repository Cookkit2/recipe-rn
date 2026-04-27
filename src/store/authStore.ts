import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as authDb from "~/src/services/database/auth-db";
import type { Session } from "~/src/services/database/auth-db";
import { safeJsonParse } from "~/utils/json-parsing";

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

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: any;
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

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        if (!email || !isValidEmail(email)) {
          const errorMsg = "Invalid email format";
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }
        if (!password || password.length < 6) {
          const errorMsg = "Password must be at least 6 characters";
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }

        set({ isLoading: true, error: null });

        try {
          // Simulate API call to login endpoint
          // In production, this would call your auth API
          const userId = `user_${Crypto.randomUUID()}`;
          const accessToken = `access_${Crypto.randomUUID()}`;
          const refreshToken = `refresh_${Crypto.randomUUID()}`;

          // Ensure user is created before tokens to prevent FK constraint violations
          await authDb.createUser(userId, email, "Test User");

          await Promise.all([
            authDb.upsertSession(userId, accessToken, refreshToken, 900), // 15 minutes
            authDb.createRefreshToken(userId, refreshToken, 604800000), // 7 days
            SecureStore.setItemAsync(
              "user_session",
              JSON.stringify({ userId, accessToken, refreshToken })
            ),
          ]);

          // Update state
          set({
            user: {
              id: userId,
              email,
              displayName: "Test User",
            },
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || "Login failed",
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, displayName?: string) => {
        if (!email || !isValidEmail(email)) {
          const errorMsg = "Invalid email format";
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }
        if (!password || password.length < 6) {
          const errorMsg = "Password must be at least 6 characters";
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }

        set({ isLoading: true, error: null });

        try {
          // Simulate API call to register endpoint
          const userId = `user_${Crypto.randomUUID()}`;
          const accessToken = `access_${Crypto.randomUUID()}`;
          const refreshToken = `refresh_${Crypto.randomUUID()}`;

          // Ensure user is created before tokens to prevent FK constraint violations
          await authDb.createUser(userId, email, displayName);

          await Promise.all([
            authDb.upsertSession(userId, accessToken, refreshToken, 900),
            authDb.createRefreshToken(userId, refreshToken, 604800000),
            SecureStore.setItemAsync(
              "user_session",
              JSON.stringify({ userId, accessToken, refreshToken })
            ),
          ]);

          // Update state
          set({
            user: {
              id: userId,
              email,
              displayName,
            },
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || "Registration failed",
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          const { accessToken } = get();

          const logoutPromises: Promise<any>[] = [SecureStore.deleteItemAsync("user_session")];

          if (accessToken) {
            // Revoke session in database concurrently
            logoutPromises.push(authDb.revokeSession(accessToken));
          }

          await Promise.all(logoutPromises);

          // Reset state
          set(initialState);
        } catch (error: any) {
          console.error("Logout error:", error);
        }
      },

      refreshSession: async () => {
        const { user, refreshToken } = get();

        if (!user || !refreshToken) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Refresh token via database
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
        } catch (error: any) {
          set({
            error: error.message || "Session refresh failed",
            isLoading: false,
          });
          await get().logout();
        }
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

          const { userId, accessToken, refreshToken } = safeJsonParse<any>(sessionStr, {});

          // Check if tokens are still valid
          const session = await authDb.getSessionByToken(accessToken);

          if (session) {
            const [, user] = await Promise.all([
              authDb.upsertSession(userId, accessToken, refreshToken, 900),
              authDb.getUserById(userId),
            ]);

            if (user) {
              set({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }

          // Session is invalid, logout
          await get().logout();
        } catch (error: any) {
          console.error("Auth check error:", error);
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
