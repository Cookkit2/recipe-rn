import type {
  User,
  AuthResult,
  SignInCredentials,
  SocialAuthConfig,
  LinkAccountCredentials,
  AuthSession,
} from "./types";

/**
 * Abstract authentication strategy interface
 * Provides a common contract for all authentication providers
 */
export interface AuthStrategy {
  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Get the current session information
   */
  getCurrentSession(): Promise<AuthSession | null>;

  /**
   * Sign in with email and password
   */
  signInWithEmail(credentials: SignInCredentials): Promise<AuthResult>;

  /**
   * Sign in with social provider (Google, Facebook, Apple)
   */
  signInWithProvider(config: SocialAuthConfig): Promise<AuthResult>;

  /**
   * Sign in anonymously (guest account)
   */
  signInAnonymously(): Promise<AuthResult>;

  /**
   * Sign up with email and password
   */
  signUpWithEmail(credentials: SignInCredentials): Promise<AuthResult>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<AuthResult>;

  /**
   * Refresh the current session
   */
  refreshSession(): Promise<AuthResult>;

  /**
   * Link an anonymous account to a permanent account
   */
  linkAnonymousAccount(
    credentials: LinkAccountCredentials
  ): Promise<AuthResult>;

  /**
   * Reset password for email account
   */
  resetPassword(email: string): Promise<AuthResult>;

  /**
   * Check if the current session is valid
   */
  validateSession(): Promise<boolean>;

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void;

  /**
   * Get provider-specific information
   */
  getProviderInfo(): {
    name: string;
    version: string;
    features: string[];
  };
}

/**
 * Base class with common functionality that strategies can extend
 */
export abstract class BaseAuthStrategy implements AuthStrategy {
  protected listeners: Array<(user: User | null) => void> = [];

  abstract getCurrentUser(): Promise<User | null>;
  abstract getCurrentSession(): Promise<AuthSession | null>;
  abstract signInWithEmail(credentials: SignInCredentials): Promise<AuthResult>;
  abstract signInWithProvider(config: SocialAuthConfig): Promise<AuthResult>;
  abstract signInAnonymously(): Promise<AuthResult>;
  abstract signUpWithEmail(credentials: SignInCredentials): Promise<AuthResult>;
  abstract signOut(): Promise<AuthResult>;
  abstract refreshSession(): Promise<AuthResult>;
  abstract linkAnonymousAccount(
    credentials: LinkAccountCredentials
  ): Promise<AuthResult>;
  abstract resetPassword(email: string): Promise<AuthResult>;
  abstract validateSession(): Promise<boolean>;
  abstract getProviderInfo(): {
    name: string;
    version: string;
    features: string[];
  };

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  protected notifyListeners(user: User | null): void {
    this.listeners.forEach((callback) => callback(user));
  }

  /**
   * Helper method to create consistent error results
   */
  protected createErrorResult(
    code: string,
    message: string,
    retryable = false,
    originalError?: any
  ): AuthResult {
    return {
      success: false,
      error: {
        code,
        message,
        retryable,
        originalError,
      },
    };
  }

  /**
   * Helper method to create successful results
   */
  protected createSuccessResult(user: User, session?: AuthSession): AuthResult {
    return {
      success: true,
      user,
      session,
    };
  }
}
