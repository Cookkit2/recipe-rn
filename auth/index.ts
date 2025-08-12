// Main exports for the authentication module
export * from "./AuthStrategy";
export * from "./AuthStore";
export * from "./AuthContext";

// Strategy implementations
export { MockAuthStrategy } from "./MockAuthStrategy";
export { SupabaseAuthStrategy } from "./SupabaseAuthStrategy";

// Storage and client
export {
  AuthStorageManager,
  createSupabaseStorageAdapter,
} from "./storage-integration";
export { supabase, supabaseConfig } from "./supabase-client";

// Re-export commonly used items for convenience
export { useAuth, useAuthState, useAuthActions } from "./AuthContext";
export { useAuthStore, useAuthSelectors } from "./AuthStore";
export type { AuthStrategy } from "./AuthStrategy";
export type {
  User,
  AuthResult,
  SignInCredentials,
  SocialAuthConfig,
  AuthProvider as AuthProviderType,
  AuthState,
} from "./types";
