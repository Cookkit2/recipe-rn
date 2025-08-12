import { BaseAuthStrategy } from "./AuthStrategy";
<<<<<<< HEAD
import type {
=======
import {
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)
  User,
  AuthResult,
  SignInCredentials,
  SocialAuthConfig,
  LinkAccountCredentials,
  AuthSession,
  AuthProvider,
<<<<<<< HEAD
} from "../types/AuthTypes";
=======
} from "./types";
import { supabase } from "./supabase-client";
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)
import type {
  Session,
  User as SupabaseUser,
  AuthError,
} from "@supabase/supabase-js";
import * as ExpoAuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
<<<<<<< HEAD
import { APP_CONFIG } from "~/lib/constants";
import { supabase } from "~/lib/supabase/supabase-client";
=======
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)

/**
 * Supabase authentication strategy implementation
 * Handles all authentication flows using Supabase Auth
 */
export class SupabaseAuthStrategy extends BaseAuthStrategy {
  private currentUser: User | null = null;
  private currentSession: AuthSession | null = null;

  constructor() {
    super();
    this.setupAuthListener();
  }

  /**
   * Set up auth state change listener
   */
  private setupAuthListener(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("Supabase auth state change:", event, session?.user?.id);

      if (session?.user) {
        this.currentUser = this.mapSupabaseUserToUser(session.user);
        this.currentSession = this.mapSupabaseSessionToAuthSession(session);
      } else {
        this.currentUser = null;
        this.currentSession = null;
      }

      // Notify listeners
      this.notifyListeners(this.currentUser);
    });
  }

  /**
   * Map Supabase user to our User type
   */
  private mapSupabaseUserToUser(supabaseUser: SupabaseUser): User {
    const isAnonymous = supabaseUser.is_anonymous || false;
    const provider = this.getProviderFromUser(supabaseUser);

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name:
        supabaseUser.user_metadata?.name ||
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.email?.split("@")[0],
      avatar:
        supabaseUser.user_metadata?.avatar_url ||
        supabaseUser.user_metadata?.picture,
      isAnonymous,
      provider,
      metadata: supabaseUser.user_metadata || {},
      createdAt: new Date(supabaseUser.created_at),
      lastSignIn: new Date(
        supabaseUser.last_sign_in_at || supabaseUser.created_at
      ),
    };
  }

  /**
   * Get auth provider from Supabase user
   */
  private getProviderFromUser(supabaseUser: SupabaseUser): AuthProvider {
    if (supabaseUser.is_anonymous) return "anonymous";

    // Check app_metadata or identities for provider info
    const identities = supabaseUser.identities || [];
    if (identities.length > 0) {
      const provider = identities[0]?.provider;
      if (["google", "facebook", "apple"].includes(provider || "")) {
        return provider as AuthProvider;
      }
    }

    return "email";
  }

  /**
   * Map Supabase session to our AuthSession type
   */
  private mapSupabaseSessionToAuthSession(session: Session): AuthSession {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: new Date(
        session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000
      ),
      tokenType: session.token_type || "Bearer",
    };
  }

  /**
   * Handle Supabase auth errors
   */
  private handleSupabaseError(error: AuthError): AuthResult {
    const errorCode = error.message || "UNKNOWN_ERROR";
    let retryable = true;
    let friendlyMessage = error.message;

    // Map common Supabase errors to our error codes
    if (error.message?.includes("Invalid login credentials")) {
      friendlyMessage = "Invalid email or password";
      retryable = false;
    } else if (error.message?.includes("User already registered")) {
      friendlyMessage = "An account with this email already exists";
      retryable = false;
    } else if (error.message?.includes("Email not confirmed")) {
      friendlyMessage =
        "Please check your email and click the confirmation link";
      retryable = false;
    } else if (error.message?.includes("Too many requests")) {
      friendlyMessage = "Too many attempts. Please try again later";
      retryable = true;
    }

    return this.createErrorResult(errorCode, friendlyMessage, retryable, error);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.warn("Error getting current user:", error);
        return null;
      }

      if (user) {
        this.currentUser = this.mapSupabaseUserToUser(user);
        return this.currentUser;
      }

      return null;
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      return null;
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.warn("Error getting current session:", error);
        return null;
      }

      if (session) {
        this.currentSession = this.mapSupabaseSessionToAuthSession(session);
        return this.currentSession;
      }

      return null;
    } catch (error) {
      console.error("Error in getCurrentSession:", error);
      return null;
    }
  }

  async signInWithEmail(credentials: SignInCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return this.handleSupabaseError(error);
      }

      if (data.user && data.session) {
        const user = this.mapSupabaseUserToUser(data.user);
        const session = this.mapSupabaseSessionToAuthSession(data.session);

        this.currentUser = user;
        this.currentSession = session;

        return this.createSuccessResult(user, session);
      }

      return this.createErrorResult(
        "SIGNIN_FAILED",
        "Sign in failed - no user data returned",
        true
      );
    } catch (error) {
      console.error("Error in signInWithEmail:", error);
      return this.createErrorResult(
        "SIGNIN_ERROR",
        "An unexpected error occurred during sign in",
        true,
        error
      );
    }
  }

  async signInWithProvider(config: SocialAuthConfig): Promise<AuthResult> {
    try {
<<<<<<< HEAD
      // Create redirect URL for OAuth flow based on app.json scheme
      const scheme =
        Linking.createURL("").split(":")[0] || APP_CONFIG.DEEP_LINK_SCHEME;
      const redirectUrl = ExpoAuthSession.makeRedirectUri({ scheme });
=======
      // Create redirect URL for OAuth flow
      const redirectUrl = ExpoAuthSession.makeRedirectUri({
        scheme: "recipe-app", // This should match your app.json scheme
      });
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: config.provider as any, // Supabase provider names match ours
        options: {
          redirectTo: config.redirectUrl || redirectUrl,
          scopes: config.scopes?.join(" "),
        },
      });

      if (error) {
        return this.handleSupabaseError(error);
      }

      // For OAuth flows, the actual authentication happens via redirect
      // The user will be signed in when they return to the app
      if (data.url) {
        // Open the OAuth URL
        await Linking.openURL(data.url);

<<<<<<< HEAD
        // Return success; the actual sign-in will complete via onAuthStateChange
        return { success: true };
      }

      return { success: true };
    } catch (error: any) {
      return this.handleSupabaseError(error);
=======
        // Return a pending result - the actual sign-in will be handled
        // by the auth state change listener when the user returns
        return {
          success: true,
          user: null, // Will be set by auth listener
          session: null,
        };
      }

      return this.createErrorResult(
        "OAUTH_FAILED",
        "Failed to initiate OAuth flow",
        true
      );
    } catch (error) {
      console.error("Error in signInWithProvider:", error);
      return this.createErrorResult(
        "OAUTH_ERROR",
        "An unexpected error occurred during social sign in",
        true,
        error
      );
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)
    }
  }

  async signInAnonymously(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        return this.handleSupabaseError(error);
      }

      if (data.user && data.session) {
        const user = this.mapSupabaseUserToUser(data.user);
        const session = this.mapSupabaseSessionToAuthSession(data.session);

        this.currentUser = user;
        this.currentSession = session;

        return this.createSuccessResult(user, session);
      }

      return this.createErrorResult(
        "ANONYMOUS_SIGNIN_FAILED",
        "Anonymous sign in failed - no user data returned",
        true
      );
    } catch (error) {
      console.error("Error in signInAnonymously:", error);
      return this.createErrorResult(
        "ANONYMOUS_SIGNIN_ERROR",
        "An unexpected error occurred during anonymous sign in",
        true,
        error
      );
    }
  }

  async signUpWithEmail(credentials: SignInCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return this.handleSupabaseError(error);
      }

      if (data.user) {
        // Check if email confirmation is required
        if (!data.session && data.user && !data.user.email_confirmed_at) {
          return {
            success: true,
            user: this.mapSupabaseUserToUser(data.user),
            session: null,
            // Note: This indicates email confirmation is required
          };
        }

        if (data.session) {
          const user = this.mapSupabaseUserToUser(data.user);
          const session = this.mapSupabaseSessionToAuthSession(data.session);

          this.currentUser = user;
          this.currentSession = session;

          return this.createSuccessResult(user, session);
        }
      }

      return this.createErrorResult(
        "SIGNUP_FAILED",
        "Sign up failed - no user data returned",
        true
      );
    } catch (error) {
      console.error("Error in signUpWithEmail:", error);
      return this.createErrorResult(
        "SIGNUP_ERROR",
        "An unexpected error occurred during sign up",
        true,
        error
      );
    }
  }

  async signOut(): Promise<AuthResult> {
<<<<<<< HEAD
    console.log("SupabaseAuthStrategy.signOut() called");
    try {
      console.log("About to call supabase.auth.signOut()");
      const { error } = await supabase.auth.signOut();
      console.log("supabase.auth.signOut() completed, error:", error);

      if (error) {
        console.log(
          "Supabase signOut returned error, clearing local state anyway"
        );
=======
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)
        // Still clear local state even if remote sign out failed
        this.currentUser = null;
        this.currentSession = null;
        this.notifyListeners(null);

        return this.createErrorResult(
          "SIGNOUT_ERROR",
          "Sign out completed locally but may have failed on server",
          false,
          error
        );
      }

<<<<<<< HEAD
      console.log("Supabase signOut successful, clearing local state");
=======
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)
      // Clear local state
      this.currentUser = null;
      this.currentSession = null;
      this.notifyListeners(null);

      return { success: true };
    } catch (error) {
      console.error("Error in signOut:", error);

      // Clear local state even on error
      this.currentUser = null;
      this.currentSession = null;
      this.notifyListeners(null);

      return this.createErrorResult(
        "SIGNOUT_ERROR",
        "An unexpected error occurred during sign out",
        false,
        error
      );
    }
  }

  async refreshSession(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return this.handleSupabaseError(error);
      }

      if (data.user && data.session) {
        const user = this.mapSupabaseUserToUser(data.user);
        const session = this.mapSupabaseSessionToAuthSession(data.session);

        this.currentUser = user;
        this.currentSession = session;

        return this.createSuccessResult(user, session);
      }

      return this.createErrorResult(
        "REFRESH_FAILED",
        "Session refresh failed - no session data returned",
        true
      );
    } catch (error) {
      console.error("Error in refreshSession:", error);
      return this.createErrorResult(
        "REFRESH_ERROR",
        "An unexpected error occurred during session refresh",
        true,
        error
      );
    }
  }

  async linkAnonymousAccount(
    credentials: LinkAccountCredentials
  ): Promise<AuthResult> {
    try {
      // Check if current user is anonymous
      if (!this.currentUser || !this.currentUser.isAnonymous) {
        return this.createErrorResult(
          "NOT_ANONYMOUS",
          "Current user is not anonymous",
          false
        );
      }

      // In Supabase, we need to update the user's email and password
      // This effectively converts anonymous user to permanent user
      const { data, error } = await supabase.auth.updateUser({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return this.handleSupabaseError(error);
      }

      if (data.user) {
        const user = this.mapSupabaseUserToUser(data.user);
        // Session should remain the same, just user data changes

        this.currentUser = user;

        return this.createSuccessResult(user, this.currentSession || undefined);
      }

      return this.createErrorResult(
        "LINK_ACCOUNT_FAILED",
        "Account linking failed - no user data returned",
        true
      );
    } catch (error) {
      console.error("Error in linkAnonymousAccount:", error);
      return this.createErrorResult(
        "LINK_ACCOUNT_ERROR",
        "An unexpected error occurred during account linking",
        true,
        error
      );
    }
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
<<<<<<< HEAD
        redirectTo: `${APP_CONFIG.DEEP_LINK_SCHEME}://${APP_CONFIG.DEEP_LINK_PATHS.RESET_PASSWORD}`,
=======
        redirectTo: `recipe-app://auth/reset-password`, // Deep link for password reset
>>>>>>> 597adb3 (feat: Implement Supabase authentication strategy)
      });

      if (error) {
        return this.handleSupabaseError(error);
      }

      return { success: true };
    } catch (error) {
      console.error("Error in resetPassword:", error);
      return this.createErrorResult(
        "RESET_PASSWORD_ERROR",
        "An unexpected error occurred during password reset",
        true,
        error
      );
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return false;
      }

      // Check if session is expired
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      return expiresAt > Date.now();
    } catch (error) {
      console.error("Error in validateSession:", error);
      return false;
    }
  }

  getProviderInfo() {
    return {
      name: "SupabaseAuthStrategy",
      version: "1.0.0",
      features: ["email", "social", "anonymous", "linking", "refresh", "oauth"],
    };
  }
}
