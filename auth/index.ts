// Main exports for the authentication module
export * from "./AuthStrategy";
export * from "./AuthStore";
export * from "./AuthContext";

// Strategy implementations
export { MockAuthStrategy } from "./MockAuthStrategy";
export { SupabaseAuthStrategy } from "./SupabaseAuthStrategy";

// Storage and client

// Re-export commonly used items for convenience
export { useAuth } from "./AuthContext";
export type { AuthStrategy } from "./AuthStrategy";
export type {
  User,
  AuthResult,
  SignInCredentials,
  SocialAuthConfig,
  AuthProvider as AuthProviderType,
  AuthState,
} from "~/types/AuthTypes";
