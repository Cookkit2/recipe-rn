import * as Location from "expo-location";
import { useState, useEffect } from "react";

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
}

const LOCATION_TIMEOUT = 10000; // 10 seconds

export function useLocation(refreshInterval: number | null = null): LocationState {
  const [state, setState] = useState<LocationState>({
    location: null,
    error: null,
    loading: true,
    permissionGranted: false,
  });

  const getCurrentLocation = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        setState({
          location: null,
          error: "Location permission denied",
          loading: false,
          permissionGranted: false,
        });
        return;
      }

      setState((prev) => ({ ...prev, permissionGranted: true }));

      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Location timeout")), LOCATION_TIMEOUT)
        ),
      ]);

      setState({
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        error: null,
        loading: false,
        permissionGranted: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get location";
      setState((prev) => ({
        ...prev,
        location: null,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  useEffect(() => {
    getCurrentLocation();

    if (refreshInterval) {
      const interval = setInterval(getCurrentLocation, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return state;
}

function useLocationOnce(): LocationState {
  const location = useLocation(null);
  return location;
}
