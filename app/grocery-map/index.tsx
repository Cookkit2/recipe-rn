import React, { useRef, useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Stack } from "expo-router";
import BottomSheet, { type BottomSheetMethods } from "@expo/ui/community/bottom-sheet";
import { MapLayer } from "~/components/GroceryMap/MapLayer";
import { MiniStoreList } from "~/components/GroceryMap/MiniStoreList";
import { StoreInfoCard, type StoreInfo } from "~/components/GroceryMap/StoreInfoCard";
import { useLocation } from "~/hooks/useLocation";
import { useNearbyStores } from "~/hooks/queries/useStoreQueries";
import { useDistanceCalculation } from "~/hooks/useDistanceCalculation";
import { toast } from "sonner-native";
import { openDirections } from "~/services/geolocation";
import { calculateStoreStatus } from "~/utils/store-hours";

// Default location (Kuala Lumpur, Malaysia)
const DEFAULT_LATITUDE = 3.1577;
const DEFAULT_LONGITUDE = 101.7122;
const DEFAULT_CURRENCY = "MYR";

const SNAP_HIDDEN = 0;
const SNAP_COMPACT = 1;
const SNAP_EXPANDED = 2;

export default function GroceryMapPage() {
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const { data: stores = [], isLoading: storesLoading } = useNearbyStores(
    location?.latitude ?? DEFAULT_LATITUDE,
    location?.longitude ?? DEFAULT_LONGITUDE,
    !!location
  );

  const storesWithDistance = useDistanceCalculation(location, stores);

  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  const handleStoreSelect = useCallback((storeId: string) => {
    setSelectedStore(storeId);
    bottomSheetRef.current?.snapToIndex(SNAP_EXPANDED);
  }, []);

  const handleNavigate = useCallback((store: StoreInfo) => {
    try {
      openDirections(
        {
          latitude: store.latitude,
          longitude: store.longitude,
        },
        store.name
      );
    } catch (error) {
      toast.error("Failed to open directions");
    }
  }, []);

  const handleViewPrices = useCallback((storeId: string) => {
    setSelectedStore(storeId);
    toast.success("Opening store details");
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedStore(null);
  }, []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === SNAP_HIDDEN) handleSheetClose();
    },
    [handleSheetClose]
  );

  if (locationLoading || storesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" accessibilityLiveRegion="polite" />
        <Text style={styles.loadingText} accessibilityLiveRegion="polite">
          Finding nearby stores...
        </Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle} accessibilityLiveRegion="assertive">
          Location Error
        </Text>
        <Text style={styles.errorMessage} accessibilityLiveRegion="polite">
          {locationError}
        </Text>
      </View>
    );
  }

  const userLocation = {
    latitude: location?.latitude ?? DEFAULT_LATITUDE,
    longitude: location?.longitude ?? DEFAULT_LONGITUDE,
  };

  const mapStores = useMemo(
    () =>
      storesWithDistance.map((store) => ({
        id: store.id,
        name: store.name,
        latitude: store.latitude ?? DEFAULT_LATITUDE,
        longitude: store.longitude ?? DEFAULT_LONGITUDE,
        totalPriceCents: 0, // Pending Phase 2: Price Integration
        distance: store.distance,
      })),
    [storesWithDistance]
  );

  const miniListStores = useMemo(
    () =>
      storesWithDistance.map((store) => ({
        id: store.id,
        name: store.name,
        address: store.address ?? "Unknown address",
        distance: store.distance,
        totalPriceCents: 0, // Pending Phase 2: Price Integration
      })),
    [storesWithDistance]
  );

  const selectedStoreData = storesWithDistance.find((s) => s.id === selectedStore);

  const storeStatus = useMemo(() => {
    if (!selectedStoreData?.opening_hours) return { isOpen: false };
    return calculateStoreStatus(selectedStoreData.opening_hours);
  }, [selectedStoreData?.opening_hours]);

  return (
    <>
      <Stack.Screen options={{ title: "Find Stores" }} />

      <View style={styles.container}>
        <MapLayer
          stores={mapStores}
          userLocation={userLocation}
          onMarkerPress={handleStoreSelect}
        />

        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={["10%", "25%", "50%"]}
          index={1}
          onChange={handleSheetChange}
        >
          {selectedStoreData ? (
            <StoreInfoCard
              store={{
                name: selectedStoreData.name,
                address: selectedStoreData.address ?? "Unknown address",
                distance: selectedStoreData.distance,
                totalPriceCents: 0, // Pending Phase 2: Price Integration
                isOpen: storeStatus.isOpen,
                closingTime: storeStatus.closingTime,
                latitude: selectedStoreData.latitude ?? DEFAULT_LATITUDE,
                longitude: selectedStoreData.longitude ?? DEFAULT_LONGITUDE,
              }}
              onPressViewPrices={() => handleViewPrices(selectedStoreData.id)}
              onPressNavigate={() =>
                handleNavigate({
                  name: selectedStoreData.name,
                  address: selectedStoreData.address ?? "",
                  distance: selectedStoreData.distance,
                  totalPriceCents: 0, // Pending Phase 2: Price Integration
                  isOpen: storeStatus.isOpen,
                  closingTime: storeStatus.closingTime,
                  latitude: selectedStoreData.latitude ?? DEFAULT_LATITUDE,
                  longitude: selectedStoreData.longitude ?? DEFAULT_LONGITUDE,
                })
              }
            />
          ) : (
            <MiniStoreList stores={miniListStores} onStorePress={handleStoreSelect} />
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
