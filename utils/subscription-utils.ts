import { setStatusBarStyle } from "expo-status-bar";
import Purchases, { type PurchasesEntitlementInfo } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import {
  emitFunnelEvent,
  emitPaywallPresented,
  paywallResultToEvent,
  type FunnelTriggerSource,
} from "~/lib/analytics/funnel-events";
import { invalidateSubscriptionEntitlementsQuery } from "~/lib/subscription-query-sync";
import { log } from "./logger";

// Must match RevenueCat dashboard entitlement identifier (see customerInfo.entitlements.active)
const ENTITLEMENT_IDENTIFIER = "Pro";

/**
 * Read the active Pro entitlement from RevenueCat's cached CustomerInfo.
 *
 * This is the READ half of the entitlement story and the sole data source for
 * `useEntitlement`'s queryFn. It returns the entitlement object (truthy) when an
 * active Pro entitlement exists, or `null` when there is none / RevenueCat is not
 * yet configured / the read throws. The paywall PRESENT action lives in
 * `presentPaywallIfNeeded` below.
 */
export async function readEntitlement(): Promise<PurchasesEntitlementInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    log.info("Customer Info:", customerInfo);
    // Use the same entitlement identifier as configured in RevenueCat dashboard
    return customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER] ?? null;
  } catch (e) {
    log.error("Error getting customer info:", e);
    return null;
  }
}

/**
 * @deprecated Use `useEntitlement` (hooks/queries/useEntitlement.ts) for any React
 * read of Pro state, or `readEntitlement` for an imperative one-off. Kept only for
 * the paywall action path that has not yet migrated. Behavior is intentionally
 * unchanged from before the refactor: returns the raw entitlement (truthy, or
 * `undefined` when absent) on success, and `false` when the read throws.
 */
export const isValidSubscription = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    log.info("Customer Info:", customerInfo);
    // Use the same entitlement identifier as configured in RevenueCat dashboard
    return customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER];
  } catch (e) {
    log.error("Error getting customer info:", e);
    return false;
  }
};

export async function presentPaywall(): Promise<boolean> {
  // Present paywall for current offering:
  const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

  switch (paywallResult) {
    case PAYWALL_RESULT.NOT_PRESENTED:
      invalidateSubscriptionEntitlementsQuery();
      return false;
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
      return false;
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      invalidateSubscriptionEntitlementsQuery();
      return true;
    default:
      return false;
  }
}

export interface PresentPaywallOptions {
  /**
   * Where the paywall was triggered from. Threads through to the
   * `paywall_presented` / `trial_started` funnel events (issue #718) so each
   * gating surface can be analyzed independently. Defaults to `'unknown'`.
   */
  triggerSource?: FunnelTriggerSource;
}

export async function presentPaywallIfNeeded(
  options: PresentPaywallOptions = {}
): Promise<boolean> {
  const triggerSource: FunnelTriggerSource = options.triggerSource ?? "unknown";
  try {
    // Get fresh customer info from RevenueCat
    const customerInfo = await Purchases.getCustomerInfo();
    log.info("presentPaywallIfNeeded - Customer Info:", customerInfo);

    // Check if user has active Pro entitlement
    const hasActiveSubscription = customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER];

    if (hasActiveSubscription) {
      // User already has a valid subscription, no need to show paywall
      log.info("User already has active subscription, skipping paywall");
      invalidateSubscriptionEntitlementsQuery();
      return true;
    }

    // No active subscription, show paywall
    log.info("No active subscription, presenting paywall");
    emitPaywallPresented(triggerSource);
    setStatusBarStyle("light", true);
    let paywallResult: PAYWALL_RESULT;
    try {
      paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_IDENTIFIER,
      });
    } finally {
      setStatusBarStyle("auto", true);
    }

    // Emit the funnel event corresponding to the paywall result. Single source
    // of truth for trial_started / paid_converted / paywall_dismissed.
    const mapped = paywallResultToEvent(paywallResult, triggerSource);
    if (mapped) {
      emitFunnelEvent(mapped.type, { triggerSource: mapped.triggerSource });
    }

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
        log.info("Paywall not presented");
        invalidateSubscriptionEntitlementsQuery();
        return false;
      case PAYWALL_RESULT.ERROR:
        log.error("Paywall error");
        return false;
      case PAYWALL_RESULT.CANCELLED:
        log.info("Paywall cancelled by user");
        return false;
      case PAYWALL_RESULT.PURCHASED:
        log.info("User purchased subscription");
        invalidateSubscriptionEntitlementsQuery();
        return true;
      case PAYWALL_RESULT.RESTORED:
        log.info("User restored subscription");
        invalidateSubscriptionEntitlementsQuery();
        return true;
      default:
        log.warn("Unknown paywall result:", paywallResult);
        return false;
    }
  } catch (e) {
    log.error("Error in presentPaywallIfNeeded:", e);
    return false;
  }
}
