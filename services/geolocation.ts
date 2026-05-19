import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { Platform } from "react-native";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function checkLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === "granted";
}

export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === "ios") {
    await Linking.openURL("app-settings:");
  } else {
    await Linking.openSettings();
  }
}

export async function getCurrentLocation(timeoutMs = 10000): Promise<Coordinates> {
  const location = await Promise.race([
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Location timeout")), timeoutMs)
    ),
  ]);

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export async function openDirections(destination: Coordinates, label: string): Promise<void> {
  const url = Linking.createURL(
    `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&destination_place_id=${encodeURIComponent(label)}`
  );

  const supported = await Linking.canOpenURL(url);

  if (supported) {
    await Linking.openURL(url);
  } else {
    throw new Error("Cannot open directions");
  }
}
