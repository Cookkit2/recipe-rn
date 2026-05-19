import { supabase } from "~/lib/supabase/supabase-client";
import type { Store, StoreChain, OpeningHour } from "~/lib/supabase/supabase-types";

export interface NearbyStoresParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

export async function fetchNearbyStores({
  latitude,
  longitude,
  radiusKm = 25,
  limit = 20,
}: NearbyStoresParams): Promise<Array<Store & { distance: number }>> {
  // Use PostGIS for spatial query if available, otherwise filter client-side
  const { data, error } = await supabase!
    .from("stores" as any)
    .select("*")
    .limit(limit * 2); // Fetch more to filter by distance

  if (error) {
    throw error;
  }

  // Filter by distance client-side
  const storesWithDistance = ((data as unknown as Store[]) || []).map((store) => ({
    ...store,
    distance: calculateDistance(latitude, longitude, store.latitude, store.longitude),
  }));

  return storesWithDistance
    .filter((store) => store.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export async function fetchStoreById(storeId: string): Promise<Store | null> {
  const { data, error } = await supabase!
    .from("stores" as any)
    .select("*")
    .eq("id", storeId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as Store | null;
}

export async function fetchStoreChains(): Promise<StoreChain[]> {
  const { data, error } = await supabase!.from("store_chains" as any).select("*");

  if (error) {
    throw error;
  }

  return (data as unknown as StoreChain[]) || [];
}

export async function fetchStoresByChain(chainId: string): Promise<Store[]> {
  const { data, error } = await supabase!
    .from("stores" as any)
    .select("*")
    .eq("chain_id", chainId);

  if (error) {
    throw error;
  }

  return (data as unknown as Store[]) || [];
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number | null,
  lon2: number | null
): number {
  if (lat2 === null || lon2 === null) return Infinity;

  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
