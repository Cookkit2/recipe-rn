/** Local development may bypass billing; release builds always enforce it. */
export function arePaywallsEnabled(): boolean {
  return !__DEV__ || process.env.EXPO_PUBLIC_ENABLE_PAYWALLS !== "false";
}
