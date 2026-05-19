export const storeQueryKeys = {
  all: ["stores"] as const,
  nearby: (lat: number, lon: number) => ["stores", "nearby", lat, lon] as const,
  byId: (id: string) => ["stores", id] as const,
  byChain: (chainId: string) => ["stores", "chain", chainId] as const,
  chains: ["store-chains"] as const,
} as const;
