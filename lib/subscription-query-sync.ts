import { subscriptionQueryKeys } from "~/hooks/queries/subscriptionQueryKeys";
import { queryClient } from "~/store/QueryProvider";

/** Invalidate cached entitlement state (e.g. after RevenueCat purchase or listener update). */
export function invalidateSubscriptionEntitlementsQuery(): void {
  void queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.entitlements() });
}
