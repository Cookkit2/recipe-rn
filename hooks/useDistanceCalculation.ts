import { useMemo } from "react";
import { haversineDistance } from "~/utils/distance-calculation";

export interface Location {
  latitude: number;
  longitude: number;
}

export type StoreWithDistance<T> = T & { distance: number };

export function useDistanceCalculation<
  T extends {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  },
>(userLocation: Location | null, stores: T[]): StoreWithDistance<T>[] {
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

export function useClosestStore<
  T extends {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  },
>(userLocation: Location | null, stores: T[]): StoreWithDistance<T> | null {
  const storesWithDistance = useDistanceCalculation(userLocation, stores);
  return storesWithDistance.length > 0 ? storesWithDistance[0]! : null;
}
