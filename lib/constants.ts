/**
 * App configuration constants
 */
export const APP_CONFIG = {
  /**
   * Deep link scheme - must match the scheme in app.json
   * Used for OAuth redirects and password reset links
   */
  DEEP_LINK_SCHEME: "recipe-app",

  /**
   * Deep link paths for authentication flows
   */
  DEEP_LINK_PATHS: {
    AUTH_CALLBACK: "auth/callback",
    RESET_PASSWORD: "auth/reset-password",
  },
} as const;
