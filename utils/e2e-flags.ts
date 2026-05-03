import Constants from "expo-constants";

function extraE2E(): boolean {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const v = extra?.EXPO_PUBLIC_E2E;
  return v === true || v === "true";
}

/** True when running Detox / embedded E2E builds (see app.config.js extra + xcode bundle env). */
export const IS_E2E = process.env.EXPO_PUBLIC_E2E === "true" || extraE2E();
