export const ONBOARDING_COMPLETED_KEY = "onboarding:completed";
export const PREFERENCE_COMPLETED_KEY = "preference:completed";

// Use to track if the user has cooked a recipe
// If he cooked and hvnt subscribed, show paywall
export const RECIPE_COOKED_KEY = "recipe:cooked";

// SUBSCRIPTION
export const TRIAL_START_DATE_KEY = "trial:start_date";
export const SUBSCRIPTION_STATUS_KEY = "subscription:status";

// AUTH (keep existing persisted key formats to avoid migration)
export const AUTH_ACCESS_TOKEN_KEY = "auth_access_token";
export const AUTH_REFRESH_TOKEN_KEY = "auth_refresh_token";
export const AUTH_SESSION_DATA_KEY = "auth_session_data";
export const AUTH_USER_DATA_KEY = "auth_user_data";
export const AUTH_SESSION_EXPIRES_AT_KEY = "auth_session_expires_at";

// USER PREFERENCES / SETTINGS
export const USER_PREFERENCE_KEY = "user_preference"; // theme, etc.
export const PREF_ALLERGENS_KEY = "pref:allergens";
export const PREF_OTHER_ALLERGENS_KEY = "pref:other_allergens";
export const PREF_APPLIANCES_KEY = "pref:appliances";
export const PREF_DIET_KEY = "pref:diet";
export const PREF_UNIT_SYSTEM_KEY = "pref:unit_system";
export const PREF_COLOR_SCHEME_KEY = "color-scheme"; // preserved existing raw key for compatibility

export const PROFILE_IMAGE_KEY = "profile:image";
export const PROFILE_NAME_KEY = "profile:name";