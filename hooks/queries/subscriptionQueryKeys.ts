export const subscriptionQueryKeys = {
  all: ["subscription"] as const,
  entitlements: () => [...subscriptionQueryKeys.all, "entitlements"] as const,
};
