import { renderHook } from "@testing-library/react-hooks";
import { waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import Purchases from "react-native-purchases";

import { subscriptionQueryKeys } from "~/hooks/queries/subscriptionQueryKeys";
import { useEntitlement } from "~/hooks/queries/useEntitlement";

// Mock react-native-purchases. We control getCustomerInfo() return per test.
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: { getCustomerInfo: jest.fn() },
}));

// Stub native modules imported transitively by utils/subscription-utils so the
// module loads under Jest's node environment without RN's native bridge.
jest.mock("expo-status-bar", () => ({ setStatusBarStyle: jest.fn() }));
jest.mock("react-native-purchases-ui", () => ({
  __esModule: true,
  default: { presentPaywall: jest.fn(), presentPaywallIfNeeded: jest.fn() },
  PAYWALL_RESULT: {
    NOT_PRESENTED: "NOT_PRESENTED",
    ERROR: "ERROR",
    CANCELLED: "CANCELLED",
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
  },
}));

const mockedGetCustomerInfo = Purchases.getCustomerInfo as jest.Mock;

// Shared query client. It is both the provider client for the hook AND the
// `queryClient` read by ~/lib/subscription-query-sync (via the mocked
// ~/store/QueryProvider below), so the real invalidateSubscriptionEntitlementsQuery()
// — the call _layout.tsx's listener makes after a purchase — targets this client
// and refreshes the hook. A getter keeps the binding live across reassignment.
let queryClient: QueryClient;
jest.mock("~/store/QueryProvider", () => ({
  get queryClient() {
    return queryClient;
  },
}));

function makeEntitlement(
  overrides: Partial<{ expirationDateMillis: number; periodType: string }> = {}
) {
  return {
    identifier: "Pro",
    isActive: true,
    willRenew: true,
    periodType: "NORMAL",
    latestPurchaseDate: "2026-01-01T00:00:00Z",
    expirationDateMillis: null,
    ...overrides,
  };
}

function withClient(client: QueryClient) {
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useEntitlement", () => {
  beforeEach(() => {
    mockedGetCustomerInfo.mockReset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("reports isPro=true when an active Pro entitlement is cached", async () => {
    mockedGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { Pro: makeEntitlement() } },
    });

    const { result } = renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isPro).toBe(true);
    expect(result.current.entitlement?.identifier).toBe("Pro");
    expect(result.current.isLoading).toBe(false);
  });

  it("reports isPro=false when no active entitlement exists", async () => {
    mockedGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });

    const { result } = renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isPro).toBe(false);
    expect(result.current.entitlement).toBeNull();
  });

  it("exposes isLoading=true on the very first render before queryFn resolves", () => {
    // Never-resolving promise keeps the query in loading state.
    mockedGetCustomerInfo.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });

    expect(result.current.isLoading).toBe(true);
    // Safe default while loading: not a definitive "Pro", but consumers gate on isLoading.
    expect(result.current.isPro).toBe(false);
  });

  it("is keyed on subscriptionQueryKeys.entitlements()", async () => {
    mockedGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });

    renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });

    await waitFor(() =>
      expect(queryClient.getQueryData(subscriptionQueryKeys.entitlements())).toBeDefined()
    );

    expect(mockedGetCustomerInfo).toHaveBeenCalledTimes(1);
  });

  it("degrades gracefully (isPro=false, no throw) when getCustomerInfo rejects", async () => {
    mockedGetCustomerInfo.mockRejectedValue(new Error("RevenueCat not configured"));

    const { result } = renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isPro).toBe(false);
    expect(result.current.entitlement).toBeNull();
    // Cache not poisoned with a thrown error sentinel.
    expect(queryClient.getQueryData(subscriptionQueryKeys.entitlements())).toBeNull();
  });

  it("flips isPro after invalidating the entitlements query (purchase path)", async () => {
    // Re-import the real invalidation helper so it reads the mocked queryClient.
    const { invalidateSubscriptionEntitlementsQuery } =
      await import("~/lib/subscription-query-sync");

    // First state: not Pro.
    mockedGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });

    const { result } = renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isPro).toBe(false);

    // Simulate the customerInfoUpdateListener firing after a purchase: RevenueCat
    // now reports an active Pro entitlement, and the listener invalidates the key.
    mockedGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { Pro: makeEntitlement() } },
    });

    invalidateSubscriptionEntitlementsQuery();

    await waitFor(() => expect(result.current.isPro).toBe(true));
    expect(result.current.entitlement?.identifier).toBe("Pro");
  });

  it("returns cached isPro without an extra fetch on a cache hit", async () => {
    mockedGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { Pro: makeEntitlement() } },
    });

    // Prime the cache with a first hook, then mount a second consumer under the
    // same QueryClient. The fresh mount must not trigger another getCustomerInfo.
    const first = renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    const callsBefore = mockedGetCustomerInfo.mock.calls.length;

    const second = renderHook(() => useEntitlement(), { wrapper: withClient(queryClient) });
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));

    expect(second.result.current.isPro).toBe(true);
    expect(mockedGetCustomerInfo.mock.calls.length).toBe(callsBefore);
    expect(queryClient.getQueryData(subscriptionQueryKeys.entitlements())).toBeDefined();
  });
});
