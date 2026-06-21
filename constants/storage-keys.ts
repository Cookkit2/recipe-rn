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
// Macro/calorie target for target-driven meal-plan generation (#746). JSON
// MacroTarget ({ calories?, proteinG?, carbsG?, fatG? }). Local/MMKV-only.
export const PREF_MACRO_TARGET_KEY = "pref:macro_target";
export const PREF_COLOR_SCHEME_KEY = "color-scheme"; // preserved existing raw key for compatibility

export const PROFILE_IMAGE_KEY = "profile:image";
export const PROFILE_NAME_KEY = "profile:name";

// TEMP: Recipe ID for header button
export const CURRENT_RECIPE_ID_KEY = "current_recipe_id";

// CAMERA ONBOARDING
export const CAMERA_ONBOARDING_COMPLETED_KEY = "camera:onboarding_completed";

// FIRST-SESSION "AHA" (issue #720, dark-launched behind `onboarding_aha` flag).
// Set once the user has seen the "You can cook N recipes tonight" surface, so
// we never re-show it. The guided flow itself is gated by the feature flag, NOT
// this key — this only suppresses repeat impressions within the same install.
export const AHA_SCREEN_SEEN_KEY = "aha:screen_seen";

// VOICE COOKING
export const VOICE_COOKING_SETTINGS_KEY = "voice:cooking_settings";

// NOTIFICATIONS
export const NOTIFICATION_SETTINGS_KEY = "notifications:settings";

// COOKING TIMERS
export const COOKING_TIMERS_KEY = "cooking:timers";

// EXPIRING RECIPES
export const EXPIRING_RECIPES_DISMISSED_AT_KEY = "expiring_recipes:dismissed_at";

// SOCIAL SHARING
export const SOCIAL_SHARES_COUNT_KEY = "social:shares_count";

// ACHIEVEMENTS
export const INGREDIENTS_USED_BEFORE_EXPIRY_KEY = "ingredients:used_before_expiry";

// COOKING SCREEN — per-recipe ingredient tick-off state for the active cook
// session. Keyed by recipeId so each cook tracks its own ingredients; values
// are JSON arrays of relatedIngredientId strings. Local/MMKV-only by design.
export const USED_INGREDIENTS_PREFIX = "cooking:used_ingredients:";
