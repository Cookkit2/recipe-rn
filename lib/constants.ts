export const NAV_THEME = {
  light: {
    background: 'hsl(0 0% 100%)', // background
    border: 'hsl(240 5.9% 90%)', // border
    card: 'hsl(0 0% 100%)', // card
    notification: 'hsl(0 84.2% 60.2%)', // destructive
    primary: 'hsl(240 5.9% 10%)', // primary
    text: 'hsl(240 10% 3.9%)', // foreground
  },
  dark: {
    background: 'hsl(240 10% 3.9%)', // background
    border: 'hsl(240 3.7% 15.9%)', // border
    card: 'hsl(240 10% 3.9%)', // card
    notification: 'hsl(0 72% 51%)', // destructive
    primary: 'hsl(0 0% 98%)', // primary
    text: 'hsl(0 0% 98%)', // foreground
  },
};

/**
 * App configuration constants
 */
export const APP_CONFIG = {
  /**
   * Deep link scheme - must match the scheme in app.json
   * Used for OAuth redirects and password reset links
   */
  DEEP_LINK_SCHEME: 'recipe-app',
  
  /**
   * Deep link paths for authentication flows
   */
  DEEP_LINK_PATHS: {
    AUTH_CALLBACK: 'auth/callback',
    RESET_PASSWORD: 'auth/reset-password',
  }
} as const;
