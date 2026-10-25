// Expo's theme-derived header override cannot change while a screen is visible.
// Let UIKit inherit the app window's appearance instead. useNativeAppearance
// keeps that window aligned with Dark, Light, or System without remounting routes.
export const APP_HEADER_APPEARANCE = {
  unstable_nativeProps: {
    headerConfig: { experimental_userInterfaceStyle: "unspecified" },
  },
} as const;
