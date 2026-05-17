import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { GoogleMaps } from "expo-maps";
import type { MapLayerProps, StoreLocation } from "~/types/StoreLocation";

const DEFAULT_MAP_ZOOM = 12;

export function MapLayer({ stores, userLocation, onMarkerPress }: MapLayerProps) {
  const markers = useMemo(() => {
    return stores.map((store: StoreLocation) => ({
      id: store.id,
      coordinates: {
        latitude: store.latitude,
        longitude: store.longitude,
      },
    }));
  }, [stores]);

  return (
    <View style={styles.container}>
      <GoogleMaps.View
        style={styles.map}
        cameraPosition={{
          coordinates: userLocation,
          zoom: DEFAULT_MAP_ZOOM,
        }}
        markers={markers}
        onMarkerClick={(marker) => {
          if (marker.id) {
            onMarkerPress(marker.id);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
