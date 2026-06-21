import { useQuery } from "@tanstack/react-query";
import {
  fetchNearbyStores,
  fetchStoreById,
  fetchStoreChains,
  fetchStoresByChain,
} from "~/data/supabase-api/stores";
import { storeQueryKeys } from "./storeQueryKeys";

export function useNearbyStores(latitude: number, longitude: number, enabled = true) {
  return useQuery({
    queryKey: storeQueryKeys.nearby(latitude, longitude),
    queryFn: () => fetchNearbyStores({ latitude, longitude, radiusKm: 25, limit: 20 }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

function useStore(storeId: string, enabled = true) {
  return useQuery({
    queryKey: storeQueryKeys.byId(storeId),
    queryFn: () => fetchStoreById(storeId),
    enabled: enabled && !!storeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

function useStoreChains(enabled = true) {
  return useQuery({
    queryKey: storeQueryKeys.chains,
    queryFn: fetchStoreChains,
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

function useStoresByChain(chainId: string, enabled = true) {
  return useQuery({
    queryKey: storeQueryKeys.byChain(chainId),
    queryFn: () => fetchStoresByChain(chainId),
    enabled: enabled && !!chainId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
