import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { isLatLngInMalaysia } from "~/utils/geo-malaysia";

export type MalaysiaShopEligibilityStatus =
  | "loading"
  | "disabled"
  | "denied"
  | "unavailable"
  | "outside"
  | "eligible";

export interface MalaysiaShopEligibility {
  status: MalaysiaShopEligibilityStatus;
  /** Set when status is eligible */
  latitude?: number;
  longitude?: number;
  /** For UI / debugging */
  message?: string;
  recheck: () => void;
}

function isShopFeatureGloballyEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_MY_SHOP_ENABLED;
  if (raw === undefined || raw === "") {
    return true;
  }
  return raw !== "false" && raw !== "0";
}

export function useMalaysiaShopEligibility(): MalaysiaShopEligibility {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<Omit<MalaysiaShopEligibility, "recheck">>({
    status: "loading",
  });

  const recheck = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isShopFeatureGloballyEnabled()) {
        setState({
          status: "disabled",
          message: "Shop shortcuts are disabled.",
        });
        return;
      }

      setState({ status: "loading" });

      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled) {
        return;
      }

      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setState({
          status: "denied",
          message: "Location permission is needed to confirm you are in Malaysia.",
        });
        return;
      }

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) {
          return;
        }

        const { latitude, longitude } = pos.coords;
        if (!isLatLngInMalaysia(latitude, longitude)) {
          setState({
            status: "outside",
            message: "Shop shortcuts are only available in Malaysia.",
            latitude,
            longitude,
          });
          return;
        }

        setState({
          status: "eligible",
          latitude,
          longitude,
        });
      } catch (e) {
        if (cancelled) {
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.warn("[useMalaysiaShopEligibility] location error:", msg);
        }
        setState({
          status: "unavailable",
          message: "Could not read your location. Try again.",
        });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { ...state, recheck };
}
