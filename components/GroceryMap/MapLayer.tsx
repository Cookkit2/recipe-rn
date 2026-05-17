import React from "react";
import { View } from "react-native";
import { MapView, Marker } from "expo-maps";

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
      <MapView
        style={{ flex: 1 }}
        initialCameraPosition={{
          target: userLocation,
          zoom: 12,
        }}
      >
        {stores.map((store) => (
          <Marker
            key={store.id}
            identifier={store.id}
            coordinate={{
              latitude: store.latitude,
              longitude: store.longitude,
            }}
            onPress={() => onMarkerPress(store.id)}
          />
        ))}
      </MapView>
    </View>
  );
}
