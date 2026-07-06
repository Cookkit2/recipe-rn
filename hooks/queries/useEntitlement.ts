import { useQuery } from "@tanstack/react-query";
import type { PurchasesEntitlementInfo } from "react-native-purchases";
import { subscriptionQueryKeys } from "~/hooks/queries/subscriptionQueryKeys";
import { readEntitlement } from "~/utils/subscription-utils";

export interface UseEntitlementResult {
  /** True only when an active Pro entitlement exists. */
  isPro: boolean;
  /** The active Pro entitlement, or null when none/loading. */
  entitlement: PurchasesEntitlementInfo | null;
  /** True before the first cache fill; consumers should render a non-committal state. */
  isLoading: boolean;
}

/**
 * Single source of truth for the user's Pro entitlement state.
 *
 * Keyed on `subscriptionQueryKeys.entitlements()` so it auto-updates on
 * purchase/restore/expiry via the `customerInfoUpdateListener` registered in
 * `app/_layout.tsx` (which calls `invalidateSubscriptionEntitlementsQuery`).
 * No new listener is registered here. Reads come from RevenueCat's cached
 * `getCustomerInfo()`, so a cache hit returns `isPro` synchronously with no
 * network round-trip — a known-Pro user never renders as locked.
 *
 * `isLoading` is exposed deliberately so consumers can avoid the false-default
 * "locked" flash that the legacy `useFeatureFlag` path suffers from. Do NOT
 * treat `isPro === false` while `isLoading === true` as a definitive "not Pro".
 */
export function useEntitlement(): UseEntitlementResult {
  const { data, isLoading } = useQuery({
    queryKey: subscriptionQueryKeys.entitlements(),
    queryFn: readEntitlement,
    staleTime: 5 * 60 * 1000, // 5 minutes — mirrors the previous SubscriptionCard cache
    gcTime: 30 * 60 * 1000,
  });

  const entitlement = data ?? null;

  return {
    isPro: !!entitlement,
    entitlement,
    isLoading,
  };
}
