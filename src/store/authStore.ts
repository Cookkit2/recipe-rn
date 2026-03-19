import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import * as authDb from "~/src/services/database/auth-db";
import type { Session } from "~/src/services/database/auth-db";

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

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // Simulate API call to login endpoint
          // In production, this would call your auth API
          const userId = `user_${Date.now()}`;
          const accessToken = `access_${Date.now()}`;
          const refreshToken = `refresh_${Date.now()}`;

          // Save to database
          await authDb.createUser(userId, email, "Test User");
          await authDb.upsertSession(userId, accessToken, refreshToken, 900); // 15 minutes
          await authDb.createRefreshToken(userId, refreshToken, 604800000); // 7 days

          // Save to secure store
          await SecureStore.setItemAsync(
            "user_session",
            JSON.stringify({ userId, accessToken, refreshToken })
          );

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
        set({ isLoading: true, error: null });

        try {
          // Simulate API call to register endpoint
          const userId = `user_${Date.now()}`;
          const accessToken = `access_${Date.now()}`;
          const refreshToken = `refresh_${Date.now()}`;

          // Save to database
          await authDb.createUser(userId, email, displayName);
          await authDb.upsertSession(userId, accessToken, refreshToken, 900);
          await authDb.createRefreshToken(userId, refreshToken, 604800000);

          // Save to secure store
          await SecureStore.setItemAsync(
            "user_session",
            JSON.stringify({ userId, accessToken, refreshToken })
          );

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

          if (accessToken) {
            // Revoke session in database
            await authDb.revokeSession(accessToken);
          }

          // Clear secure store
          await SecureStore.deleteItemAsync("user_session");

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

          const { userId, accessToken, refreshToken } = JSON.parse(sessionStr);

          // Check if tokens are still valid
          const session = await authDb.getSessionByToken(accessToken);

          if (session) {
            // Update last used time
            await authDb.upsertSession(userId, accessToken, refreshToken, 900);

            // Get user from database
            const user = await authDb.getUserById(userId);

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
      // Note: We need to handle custom serialization for SecureStore
      partialize: (state: AuthState) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Custom serialization to handle SecureStore
    }
  )
);

// Custom middleware to sync with SecureStore
const authStore = useAuthStore as any;
authStore.persist.onRehydrateStorage = () => (state: AuthState | undefined) => {
  if (state) {
    // Hydrated from storage, check auth
    state.checkAuth();
  }
};
