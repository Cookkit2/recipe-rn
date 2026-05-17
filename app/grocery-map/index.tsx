import React, { useRef, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { MapLayer } from "~/components/GroceryMap/MapLayer";
import { MiniStoreList } from "~/components/GroceryMap/MiniStoreList";
import { StoreInfoCard, type StoreInfo } from "~/components/GroceryMap/StoreInfoCard";
import { useLocation } from "~/hooks/useLocation";
import { useNearbyStores } from "~/hooks/queries/useStoreQueries";
import { useDistanceCalculation } from "~/hooks/useDistanceCalculation";
import { toast } from "sonner-native";
import { openDirections } from "~/services/geolocation";

export default function GroceryMapPage() {
  const router = useRouter();
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const { data: stores = [], isLoading: storesLoading } = useNearbyStores(
    location?.latitude || 3.1577,
    location?.longitude || 101.7122,
    !!location
  );

  const storesWithDistance = useDistanceCalculation(location, stores);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleMarkerPress = useCallback((storeId: string) => {
    setSelectedStore(storeId);
    bottomSheetRef.current?.snapToIndex(2); // Expand to 50%
  }, []);

  const handleStorePress = useCallback((storeId: string) => {
    setSelectedStore(storeId);
    bottomSheetRef.current?.snapToIndex(2); // Expand to 50%
  }, []);

  const handleNavigate = useCallback(
    (store: StoreInfo) => {
      const storeData = storesWithDistance.find((s) => s.id === selectedStore);
      if (storeData) {
        openDirections(
          { latitude: storeData.latitude || 0, longitude: storeData.longitude || 0 },
          store.name
        );
      }
    },
    [selectedStore, storesWithDistance]
  );

  const handleViewPrices = useCallback((storeId: string) => {
    setSelectedStore(storeId);
    toast.success("Opening store details");
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedStore(null);
  }, []);

  if (locationLoading || storesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Finding nearby stores...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Location Error</Text>
        <Text style={styles.errorMessage}>{locationError}</Text>
      </View>
    );
  }

  const userLocation = {
    latitude: location?.latitude || 3.1577,
    longitude: location?.longitude || 101.7122,
  };
  const mapStores = storesWithDistance.map((store) => ({
    id: store.id,
    name: store.name,
    latitude: store.latitude || 0,
    longitude: store.longitude || 0,
    totalPriceCents: 1500, // TODO: Calculate from grocery list
    distance: store.distance,
  }));

  const miniListStores = storesWithDistance.map((store) => ({
    id: store.id,
    name: store.name,
    address: (store as any).address || "Unknown address",
    distance: store.distance,
    totalPriceCents: 1500, // TODO: Calculate from grocery list
  }));

  const selectedStoreData = storesWithDistance.find((s) => s.id === selectedStore);

  return (
    <>
      <Stack.Screen options={{ title: "Find Stores" }} />

      <View style={styles.container}>
        <MapLayer
          stores={mapStores}
          userLocation={userLocation}
          onMarkerPress={handleMarkerPress}
        />

        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={["10%", "25%", "50%"]}
          index={1}
          onChange={(index) => {
            if (index === 0) handleSheetClose();
          }}
        >
          {selectedStoreData ? (
            <StoreInfoCard
              store={{
                name: selectedStoreData.name,
                address: (selectedStoreData as any).address || "Unknown address",
                distance: selectedStoreData.distance,
                totalPriceCents: 1500, // TODO: Calculate from grocery list
                isOpen: true,
                closingTime: "22:00",
              }}
              onPressViewPrices={() => handleViewPrices(selectedStoreData.id)}
              onPressNavigate={() =>
                handleNavigate({
                  name: selectedStoreData.name,
                  address: (selectedStoreData as any).address || "",
                  distance: selectedStoreData.distance,
                  totalPriceCents: 1500,
                  isOpen: true,
                })
              }
            />
          ) : (
            <MiniStoreList stores={miniListStores} onStorePress={handleStorePress} />
          )}
        </BottomSheet>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666666",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
});
