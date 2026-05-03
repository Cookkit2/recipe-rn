const invalidateQueries = jest.fn();

jest.mock("~/store/QueryProvider", () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueries(...args),
  },
}));

import { subscriptionQueryKeys } from "~/hooks/queries/subscriptionQueryKeys";
import { invalidateSubscriptionEntitlementsQuery } from "~/lib/subscription-query-sync";

describe("invalidateSubscriptionEntitlementsQuery", () => {
  beforeEach(() => {
    invalidateQueries.mockClear();
  });

  it("invalidates the subscription entitlements query key", () => {
    invalidateSubscriptionEntitlementsQuery();
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: subscriptionQueryKeys.entitlements(),
    });
  });
});
