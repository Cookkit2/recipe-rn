// Shared authentication types
export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  isAnonymous: boolean;
  provider?: AuthProvider;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastSignIn: Date;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User | null;
  error?: AuthError | null;
  session?: AuthSession | null;
}

export interface AuthError {
  code: string;
  message: string;
  retryable: boolean;
  originalError?: any;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export type AuthProvider =
  | "email"
  | "google"
  | "facebook"
  | "apple"
  | "anonymous";

export type AuthState =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

// Social login configuration
export interface SocialAuthConfig {
  provider: Exclude<AuthProvider, "email" | "anonymous">;
  redirectUrl?: string;
  scopes?: string[];
}

// Anonymous account linking
export interface LinkAccountCredentials {
  email: string;
  password: string;
  preserveData?: boolean;
}
