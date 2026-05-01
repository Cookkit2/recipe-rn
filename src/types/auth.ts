/**
 * Authentication type definitions
 */

export interface UserPreferences {
  theme?: "light" | "dark" | "auto";
  notifications?: boolean;
  language?: string;
  measurementUnit?: "metric" | "imperial";
  dietaryRestrictions?: string[];
  favoriteRecipes?: string[];
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthError extends Error {
  code?: string;
  statusCode?: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Database-specific types
export interface DbUser {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  last_used: string;
  is_revoked?: number;
}
