import React, { createContext, useContext, useEffect, ReactNode } from "react";
import type { AuthStrategy } from "./AuthStrategy";
import { useAuthStore, useAuthSelectors } from "./AuthStore";

interface AuthContextValue {
  // Re-export store methods and state for convenience
  user: ReturnType<typeof useAuthSelectors>["user"];
  session: ReturnType<typeof useAuthSelectors>["session"];
  authState: ReturnType<typeof useAuthSelectors>["authState"];
  error: ReturnType<typeof useAuthSelectors>["error"];
  isLoading: ReturnType<typeof useAuthSelectors>["isLoading"];
  isInitialized: ReturnType<typeof useAuthSelectors>["isInitialized"];
  isAuthenticated: ReturnType<typeof useAuthSelectors>["isAuthenticated"];
  isAnonymous: ReturnType<typeof useAuthSelectors>["isAnonymous"];
  hasValidSession: ReturnType<typeof useAuthSelectors>["hasValidSession"];
  canLinkAccount: ReturnType<typeof useAuthSelectors>["canLinkAccount"];

  // Actions
  signInWithEmail: ReturnType<typeof useAuthStore>["signInWithEmail"];
  signInWithProvider: ReturnType<typeof useAuthStore>["signInWithProvider"];
  signInAnonymously: ReturnType<typeof useAuthStore>["signInAnonymously"];
  signUpWithEmail: ReturnType<typeof useAuthStore>["signUpWithEmail"];
  signOut: ReturnType<typeof useAuthStore>["signOut"];
  refreshSession: ReturnType<typeof useAuthStore>["refreshSession"];
  linkAnonymousAccount: ReturnType<typeof useAuthStore>["linkAnonymousAccount"];
  resetPassword: ReturnType<typeof useAuthStore>["resetPassword"];
  clearError: ReturnType<typeof useAuthStore>["clearError"];
  validateSession: ReturnType<typeof useAuthStore>["validateSession"];
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  strategy: AuthStrategy;
  /**
   * Whether to automatically initialize on mount
   * @default true
   */
  autoInitialize?: boolean;
  /**
   * Whether to automatically refresh session on app focus
   * @default true
   */
  autoRefresh?: boolean;
}

export function AuthProvider({
  children,
  strategy,
  autoInitialize = true,
  autoRefresh = true,
}: AuthProviderProps) {
  const authStore = useAuthStore();
  const authSelectors = useAuthSelectors();

  // Set the strategy on mount
  useEffect(() => {
    authStore.setStrategy(strategy);
  }, [strategy]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !authStore.isInitialized) {
      authStore.initialize();
    }
  }, [autoInitialize, authStore.isInitialized]);

  // Auto-refresh session on app state change (when supported)
  useEffect(() => {
    if (!autoRefresh || !authSelectors.isAuthenticated) return;

    let intervalId: NodeJS.Timeout;

    // Set up periodic session validation (every 15 minutes)
    intervalId = setInterval(
      async () => {
        if (authSelectors.isAuthenticated && authSelectors.hasValidSession) {
          const isValid = await authStore.validateSession();
          if (!isValid) {
            // Try to refresh the session
            await authStore.refreshSession();
          }
        }
      },
      15 * 60 * 1000
    ); // 15 minutes

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    autoRefresh,
    authSelectors.isAuthenticated,
    authSelectors.hasValidSession,
  ]);

  const contextValue: AuthContextValue = {
    // State
    user: authSelectors.user,
    session: authSelectors.session,
    authState: authSelectors.authState,
    error: authSelectors.error,
    isLoading: authSelectors.isLoading,
    isInitialized: authSelectors.isInitialized,
    isAuthenticated: authSelectors.isAuthenticated,
    isAnonymous: authSelectors.isAnonymous,
    hasValidSession: authSelectors.hasValidSession,
    canLinkAccount: authSelectors.canLinkAccount,

    // Actions
    signInWithEmail: authStore.signInWithEmail,
    signInWithProvider: authStore.signInWithProvider,
    signInAnonymously: authStore.signInAnonymously,
    signUpWithEmail: authStore.signUpWithEmail,
    signOut: authStore.signOut,
    refreshSession: authStore.refreshSession,
    linkAnonymousAccount: authStore.linkAnonymousAccount,
    resetPassword: authStore.resetPassword,
    clearError: authStore.clearError,
    validateSession: authStore.validateSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * Provides all auth state and methods
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook for components that only need auth state (no actions)
 * Useful for optimizing re-renders
 */
export function useAuthState() {
  const auth = useAuth();
  return {
    user: auth.user,
    authState: auth.authState,
    isLoading: auth.isLoading,
    isInitialized: auth.isInitialized,
    isAuthenticated: auth.isAuthenticated,
    isAnonymous: auth.isAnonymous,
    hasValidSession: auth.hasValidSession,
    canLinkAccount: auth.canLinkAccount,
    error: auth.error,
  };
}

/**
 * Hook for components that only need auth actions
 * Useful for optimizing re-renders
 */
export function useAuthActions() {
  const auth = useAuth();
  return {
    signInWithEmail: auth.signInWithEmail,
    signInWithProvider: auth.signInWithProvider,
    signInAnonymously: auth.signInAnonymously,
    signUpWithEmail: auth.signUpWithEmail,
    signOut: auth.signOut,
    refreshSession: auth.refreshSession,
    linkAnonymousAccount: auth.linkAnonymousAccount,
    resetPassword: auth.resetPassword,
    clearError: auth.clearError,
    validateSession: auth.validateSession,
  };
}

/**
 * Higher-order component to protect routes
 * Renders children only if user is authenticated
 */
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireNonAnonymous?: boolean;
}

export function ProtectedRoute({
  children,
  fallback = null,
  requireNonAnonymous = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAnonymous, isInitialized } = useAuthState();

  if (!isInitialized) {
    return fallback; // or loading spinner
  }

  if (!isAuthenticated) {
    return fallback;
  }

  if (requireNonAnonymous && isAnonymous) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for guest-only routes
 * Renders children only if user is NOT authenticated
 */
interface GuestOnlyRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function GuestOnlyRoute({
  children,
  fallback = null,
}: GuestOnlyRouteProps) {
  const { isAuthenticated, isInitialized } = useAuthState();

  if (!isInitialized) {
    return fallback; // or loading spinner
  }

  if (isAuthenticated) {
    return fallback;
  }

  return <>{children}</>;
}
