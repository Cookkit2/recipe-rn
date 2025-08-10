// Main exports for the authentication module
export * from "./types";
export * from "./AuthStrategy";
export * from "./AuthStore";
export * from "./AuthContext";

// Re-export commonly used items for convenience
export { useAuth, useAuthState, useAuthActions } from "./AuthContext";
export { useAuthStore, useAuthSelectors } from "./AuthStore";
export type { AuthStrategy } from "./AuthStrategy";
export type {
  User,
  AuthResult,
  SignInCredentials,
  SocialAuthConfig,
  AuthProvider,
  AuthState,
} from "./types";
