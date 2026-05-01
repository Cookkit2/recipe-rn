/**
 * Authentication helper functions
 * Shared utilities to reduce code duplication in auth flows
 */

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as authDb from "~/src/services/database/auth-db";
import type { User, AuthTokens, AuthSession, ValidationResult, AuthError } from "~/src/types/auth";

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Invalid email format" };
  }
  return { isValid: true };
};

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }
  if (password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }
  return { isValid: true };
};

/**
 * Validate credentials before authentication
 */
export const validateCredentials = (
  email: string,
  password: string
): ValidationResult => {
  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    return emailResult;
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.isValid) {
    return passwordResult;
  }

  return { isValid: true };
};

/**
 * Generate mock authentication tokens
 * In production, this would call your auth API
 */
export const generateMockTokens = (userId: string): AuthTokens => {
  return {
    accessToken: `access_${Crypto.randomUUID()}`,
    refreshToken: `refresh_${Crypto.randomUUID()}`,
  };
};

/**
 * Generate a mock user ID
 */
export const generateUserId = (): string => {
  return `user_${Crypto.randomUUID()}`;
};

/**
 * Create user session in database and secure storage
 */
export const createUserSession = async (
  userId: string,
  email: string,
  displayName?: string
): Promise<{ user: User; tokens: AuthTokens }> => {
  // Ensure user is created before tokens to prevent FK constraint violations
  await authDb.createUser(userId, email, displayName || "Test User");

  const tokens = generateMockTokens(userId);

  // Store session in database and secure storage concurrently
  await Promise.all([
    authDb.upsertSession(userId, tokens.accessToken, tokens.refreshToken, 900), // 15 minutes
    authDb.createRefreshToken(userId, tokens.refreshToken, 604800000), // 7 days
    SecureStore.setItemAsync(
      "user_session",
      JSON.stringify({ userId, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
    ),
  ]);

  const user: User = {
    id: userId,
    email,
    displayName: displayName || "Test User",
  };

  return { user, tokens };
};

/**
 * Create auth error with proper typing
 */
export const createAuthError = (message: string, code?: string): AuthError => {
  const error = new Error(message) as AuthError;
  error.code = code;
  return error;
};

/**
 * Handle authentication errors consistently
 */
export const handleAuthError = (error: unknown): AuthError => {
  if (error instanceof Error) {
    return error as AuthError;
  }
  if (typeof error === "string") {
    return new Error(error) as AuthError;
  }
  return new Error("An unknown error occurred") as AuthError;
};

/**
 * Parse session from secure store
 */
export const parseSession = async (
  sessionStr: string | null
): Promise<AuthSession | null> => {
  if (!sessionStr) {
    return null;
  }

  try {
    const session = JSON.parse(sessionStr) as AuthSession;
    return session;
  } catch {
    return null;
  }
};

/**
 * Clear user session from secure storage
 */
export const clearUserSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync("user_session");
};

/**
 * Validate that a session object has all required fields
 */
export const isValidSession = (session: unknown): session is AuthSession => {
  if (!session || typeof session !== "object") {
    return false;
  }

  const s = session as Record<string, unknown>;
  return (
    typeof s.userId === "string" &&
    typeof s.accessToken === "string" &&
    typeof s.refreshToken === "string"
  );
};
