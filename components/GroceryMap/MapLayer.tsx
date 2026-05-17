import React from "react";
import { View } from "react-native";
import { GoogleMaps } from "expo-maps";

export interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  totalPriceCents: number;
  distance: number;
}

export interface MapLayerProps {
  stores: StoreLocation[];
  userLocation: { latitude: number; longitude: number };
  onMarkerPress: (storeId: string) => void;
}

export function MapLayer({ stores, userLocation, onMarkerPress }: MapLayerProps) {
  return (
    <View style={{ flex: 1 }}>
      <GoogleMaps.View
        style={{ flex: 1 }}
        cameraPosition={{
          coordinates: userLocation,
          zoom: 12,
        }}
        markers={stores.map((store) => ({
          id: store.id,
          coordinates: {
            latitude: store.latitude,
            longitude: store.longitude,
          },
          title: store.name,
        }))}
        onMarkerClick={(event) => {
          if (event.id) {
            onMarkerPress(event.id);
          }
        }}
      />
    </View>
  );
}
