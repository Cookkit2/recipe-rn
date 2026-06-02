import { useMemo } from "react";
import { haversineDistance } from "~/utils/distance-calculation";
import type { OpeningHour } from "~/lib/supabase/supabase-types";

export interface Location {
  latitude: number;
  longitude: number;
}

export interface StoreWithDistance {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distance: number;
  opening_hours?: OpeningHour[] | null;
}

export function useDistanceCalculation(
  userLocation: Location | null,
  stores: Array<{
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    opening_hours?: OpeningHour[] | null;
  }>
): StoreWithDistance[] {
  return useMemo(() => {
    if (!userLocation) {
      return stores.map((store) => ({
        ...store,
        distance: Infinity,
      }));
    }

    return stores
      .map((store) => ({
        ...store,
        distance:
          store.latitude !== null && store.longitude !== null
            ? haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                store.latitude,
                store.longitude
              )
            : Infinity,
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [userLocation, stores]);
}

export function useClosestStore(
  userLocation: Location | null,
  stores: Array<{
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    opening_hours?: OpeningHour[] | null;
  }>
): StoreWithDistance | null {
  const storesWithDistance = useDistanceCalculation(userLocation, stores);
  return storesWithDistance.length > 0 ? storesWithDistance[0]! : null;
}
