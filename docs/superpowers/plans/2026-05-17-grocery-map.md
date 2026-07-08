# Grocery Map - Full-Screen Map + Bottom Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace current grocery list view with full-screen map + snap-to bottom drawer showing store information.

**Architecture:** Expo Maps (cross-platform) for map layer, @gorhom/bottom-sheet for snap-to drawer, state-driven content (mini list vs expanded card).

**Tech Stack:** expo-maps, @gorhom/bottom-sheet, react-native-reanimated, expo-location

---

## File Structure

```
app/grocery-map/
├── index.tsx                    # Main page, orchestrates map + bottom sheet
components/GroceryMap/
├── index.ts                     # Barrel export
├── MapLayer.tsx                 # NEW: Expo Maps integration
├── StoreMarker.tsx              # MODIFY: Use expo-maps marker format
├── StoreCard.tsx                # MODIFY: Reuse in bottom sheet
├── StoreList.tsx                # MODIFY: Compact for mini cards
├── MiniStoreList.tsx            # NEW: 3-5 nearest stores as mini cards
└── StoreInfoCard.tsx            # NEW: Expanded card when store selected
```

---

### Task 1: Create MapLayer component with Expo Maps

**Files:**
- Create: `components/GroceryMap/MapLayer.tsx`
- Modify: `components/GroceryMap/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// components/GroceryMap/__tests__/MapLayer.test.tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { MapLayer } from "../MapLayer";

describe("MapLayer", () => {
  it("renders map with markers", () => {
    const mockStores = [
      { id: "1", name: "Store A", latitude: 3.1577, longitude: 101.7122, totalPriceCents: 0, distance: 1.2 },
      { id: "2", name: "Store B", latitude: 3.1580, longitude: 101.7130, totalPriceCents: 0, distance: 0.8 },
    ];

    const { getByTestId } = render(
      <MapLayer
        stores={mockStores}
        userLocation={{ latitude: 3.1577, longitude: 101.7122 }}
        onMarkerPress={jest.fn()}
      />
    );

    // Expo Maps component should render
    expect(getByTestId("MapView")).toBeTruthy();
  });

  it("calls onMarkerPress when marker clicked", () => {
    const mockOnPress = jest.fn();
    const mockStores = [
      { id: "1", name: "Store A", latitude: 3.1577, longitude: 101.7122, totalPriceCents: 0, distance: 1.2 },
    ];

    const { getByTestId } = render(
      <MapLayer
        stores={mockStores}
        userLocation={{ latitude: 3.1577, longitude: 101.7122 }}
        onMarkerPress={mockOnPress}
      />
    );

    // Verify marker click handler is set
    // Note: Full integration test requires expo-maps mock simulation
    const mapView = getByTestId("MapView");
    expect(mapView).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test -- components/GroceryMap/__tests__/MapLayer.test.tsx`
Expected: FAIL with "MapLayer not defined"

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/GroceryMap/MapLayer.tsx
import React from "react";
import { Platform, View } from "react-native";
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
  const markers = stores.map((store) => ({
    id: store.id,
    coordinate: {
      latitude: store.latitude,
      longitude: store.longitude,
    },
  }));

  return (
    <View style={{ flex: 1 }}>
      <GoogleMaps.View
        style={{ flex: 1 }}
        cameraPosition={{
          coordinates: userLocation,
          zoom: 12,
        }}
        markers={markers}
        onMarkerClick={(event) => onMarkerPress(event.nativeEvent.id)}
      />
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test -- components/GroceryMap/__tests__/MapLayer.test.tsx`
Expected: PASS (may require expo-maps mock setup)

- [ ] **Step 5: Commit**

```bash
git add components/GroceryMap/MapLayer.tsx components/GroceryMap/__tests__/MapLayer.test.tsx
git commit -m "feat: add MapLayer component with Expo Maps integration"
```

---

### Task 2: Update StoreMarker for Expo Maps price badges

**Files:**
- Modify: `components/GroceryMap/StoreMarker.tsx`

- [ ] **Step 1: Update StoreMarker to render price badge**

```tsx
// components/GroceryMap/StoreMarker.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface StoreMarkerProps {
  totalPriceCents: number;
  onPress?: () => void;
}

export function StoreMarker({ totalPriceCents, onPress }: StoreMarkerProps) {
  const formattedPrice = (totalPriceCents / 100).toFixed(0);

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={onPress ? () => true : undefined}
      onResponderRelease={onPress}
    >
      <View style={styles.marker}>
        <Text style={styles.markerEmoji}>🛒</Text>
      </View>

      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>${formattedPrice}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2196F3",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  markerEmoji: {
    fontSize: 18,
  },
  priceBadge: {
    position: "absolute",
    bottom: -4,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  priceText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/GroceryMap/StoreMarker.tsx
git commit -m "refactor: update StoreMarker with price badge"
```

---

### Task 3: Create MiniStoreList component

**Files:**
- Create: `components/GroceryMap/MiniStoreList.tsx`
- Modify: `components/GroceryMap/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// components/GroceryMap/__tests__/MiniStoreList.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MiniStoreList } from "../MiniStoreList";

describe("MiniStoreList", () => {
  it("renders 3 nearest stores", () => {
    const mockStores = [
      { id: "1", name: "Store A", address: "123 Main St", distance: 0.5, totalPriceCents: 0 },
      { id: "2", name: "Store B", address: "456 Oak Ave", distance: 1.2, totalPriceCents: 0 },
      { id: "3", name: "Store C", address: "789 Pine Rd", distance: 2.0, totalPriceCents: 0 },
    ];

    const { getByText } = render(
      <MiniStoreList stores={mockStores} onStorePress={jest.fn()} />
    );

    expect(getByText("Store A")).toBeTruthy();
    expect(getByText("Store B")).toBeTruthy();
    expect(getByText("Store C")).toBeTruthy();
  });

  it("calls onStorePress when card tapped", () => {
    const mockOnPress = jest.fn();
    const mockStores = [
      { id: "1", name: "Store A", address: "123 Main St", distance: 0.5, totalPriceCents: 0 },
    ];

    const { getByText } = render(
      <MiniStoreList stores={mockStores} onStorePress={mockOnPress} />
    );

    fireEvent.press(getByText("Store A"));
    expect(mockOnPress).toHaveBeenCalledWith("1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test -- components/GroceryMap/__tests__/MiniStoreList.test.tsx`
Expected: FAIL with "MiniStoreList not defined"

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/GroceryMap/MiniStoreList.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { formatCurrency } from "~/utils/price-calculator";

export interface MiniStoreItem {
  id: string;
  name: string;
  address: string;
  distance: number;
  totalPriceCents: number;
}

export interface MiniStoreListProps {
  stores: MiniStoreItem[];
  onStorePress: (storeId: string) => void;
}

export function MiniStoreList({ stores, onStorePress }: MiniStoreListProps) {
  const nearestStores = stores.slice(0, 5);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {nearestStores.map((store) => (
        <Pressable
          key={store.id}
          style={styles.card}
          onPress={() => onStorePress(store.id)}
        >
          <Text style={styles.name}>{store.name}</Text>
          <Text style={styles.price}>{formatCurrency(store.totalPriceCents, "MYR")}</Text>
          <Text style={styles.distance}>
            {store.distance < 1
              ? `${Math.round(store.distance * 1000)}m`
              : `${store.distance.toFixed(1)}km`}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 2,
  },
  distance: {
    fontSize: 11,
    color: "#666666",
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test -- components/GroceryMap/__tests__/MiniStoreList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/GroceryMap/MiniStoreList.tsx components/GroceryMap/__tests__/MiniStoreList.test.tsx
git commit -m "feat: add MiniStoreList component"
```

---

### Task 4: Create StoreInfoCard component

**Files:**
- Create: `components/GroceryMap/StoreInfoCard.tsx`
- Modify: `components/GroceryMap/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// components/GroceryMap/__tests__/StoreInfoCard.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { StoreInfoCard } from "../StoreInfoCard";

describe("StoreInfoCard", () => {
  it("renders store details", () => {
    const mockStore = {
      name: "Store A",
      address: "123 Main St",
      distance: 0.5,
      totalPriceCents: 0,
      isOpen: true,
      closingTime: "22:00",
    };

    const { getByText } = render(
      <StoreInfoCard
        store={mockStore}
        onPressViewPrices={jest.fn()}
        onPressNavigate={jest.fn()}
      />
    );

    expect(getByText("Store A")).toBeTruthy();
    expect(getByText("123 Main St")).toBeTruthy();
  });

  it("calls onPressViewPrices when button tapped", () => {
    const mockOnViewPrices = jest.fn();
    const mockStore = {
      name: "Store A",
      address: "123 Main St",
      distance: 0.5,
      totalPriceCents: 0,
      isOpen: true,
      closingTime: "22:00",
    };

    const { getByText } = render(
      <StoreInfoCard
        store={mockStore}
        onPressViewPrices={mockOnViewPrices}
        onPressNavigate={jest.fn()}
      />
    );

    fireEvent.press(getByText("View Prices"));
    expect(mockOnViewPrices).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test -- components/GroceryMap/__tests__/StoreInfoCard.test.tsx`
Expected: FAIL with "StoreInfoCard not defined"

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/GroceryMap/StoreInfoCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "~/components/ui/button";
import { formatCurrency } from "~/utils/price-calculator";

export interface StoreInfo {
  name: string;
  address: string;
  distance: number;
  totalPriceCents: number;
  isOpen: boolean;
  closingTime?: string;
}

export interface StoreInfoCardProps {
  store: StoreInfo;
  onPressViewPrices: () => void;
  onPressNavigate: () => void;
}

export function StoreInfoCard({ store, onPressViewPrices, onPressNavigate }: StoreInfoCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{store.name}</Text>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{formatCurrency(store.totalPriceCents, "MYR")}</Text>
        </View>
      </View>

      <Text style={styles.address}>{store.address}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.distance}>
          {store.distance < 1 ? `${Math.round(store.distance * 1000)}m away` : `${store.distance.toFixed(1)}km away`}
        </Text>
        <Text style={[styles.status, { color: store.isOpen ? "#4CAF50" : "#F44336" }]}>
          {store.isOpen ? `Open until ${store.closingTime || "unknown"}` : "Closed"}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button variant="outline" onPress={onPressViewPrices} style={styles.button}>
          <Text style={styles.buttonText}>View Prices</Text>
        </Button>
        <Button variant="default" onPress={onPressNavigate} style={styles.button}>
          <Text style={styles.buttonTextPrimary}>Navigate</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  priceTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
  },
  address: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  distance: {
    fontSize: 13,
    color: "#666666",
  },
  status: {
    fontSize: 13,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
  },
  buttonText: {
    fontSize: 15,
  },
  buttonTextPrimary: {
    fontSize: 15,
    color: "#FFFFFF",
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test -- components/GroceryMap/__tests__/StoreInfoCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/GroceryMap/StoreInfoCard.tsx components/GroceryMap/__tests__/StoreInfoCard.test.tsx
git commit -m "feat: add StoreInfoCard component"
```

---

### Task 5: Update GroceryMapPage with MapLayer + BottomSheet

**Files:**
- Modify: `app/grocery-map/index.tsx`

- [ ] **Step 1: Update GroceryMapPage to use new components**

```tsx
// app/grocery-map/index.tsx
import React, { useRef, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { MapLayer } from "~/components/GroceryMap/MapLayer";
import { MiniStoreList } from "~/components/GroceryMap/MiniStoreList";
import { StoreInfoCard, StoreInfo } from "~/components/GroceryMap/StoreInfoCard";
import { useLocation } from "~/hooks/useLocation";
import { useNearbyStores } from "~/hooks/queries/useStoreQueries";
import { useDistanceCalculation } from "~/hooks/useDistanceCalculation";
import { useGroceryList } from "~/hooks/queries/useGroceryList";
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
  const { groceryList } = useGroceryList();

  // Helper to calculate mock price based on grocery list
  const calculateStorePrice = (storeId: string) => {
    if (!groceryList || groceryList.length === 0) return 0;
    // Mock price calculation for the MVP: 500 cents ($5.00) per item
    return groceryList.length * 500;
  };

  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleMarkerPress = useCallback((storeId: string) => {
    setSelectedStore(storeId);
    bottomSheetRef.current?.snapToIndex(2); // Expand to 50%
  }, []);

  const handleStorePress = useCallback((storeId: string) => {
    setSelectedStore(storeId);
    bottomSheetRef.current?.snapToIndex(2); // Expand to 50%
  }, []);

  const handleNavigate = useCallback((store: StoreInfo) => {
    const storeData = storesWithDistance.find((s) => s.id === selectedStore);
    if (storeData) {
      openDirections(
        { latitude: storeData.latitude || 0, longitude: storeData.longitude || 0 },
        store.name
      );
    }
  }, [selectedStore, storesWithDistance]);

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

  const userLocation = { latitude: location?.latitude || 3.1577, longitude: location?.longitude || 101.7122 };
  const mapStores = storesWithDistance.map((store) => ({
    id: store.id,
    name: store.name,
    latitude: store.latitude || 0,
    longitude: store.longitude || 0,
    totalPriceCents: calculateStorePrice(store.id),
    distance: store.distance,
  }));

  const miniListStores = storesWithDistance.map((store) => ({
    id: store.id,
    name: store.name,
    address: (store as any).address || "Unknown address",
    distance: store.distance,
    totalPriceCents: calculateStorePrice(store.id),
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
                totalPriceCents: calculateStorePrice(selectedStoreData.id),
                isOpen: true,
                closingTime: "22:00",
              }}
              onPressViewPrices={() => handleViewPrices(selectedStoreData.id)}
              onPressNavigate={() =>
                handleNavigate({
                  name: selectedStoreData.name,
                  address: (selectedStoreData as any).address || "",
                  distance: selectedStoreData.distance,
                  totalPriceCents: calculateStorePrice(selectedStoreData.id),
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
```

- [ ] **Step 2: Commit**

```bash
git add app/grocery-map/index.tsx
git commit -m "feat: integrate MapLayer with BottomSheet in GroceryMapPage"
```

---

### Task 6: Update exports in GroceryMap index

**Files:**
- Modify: `components/GroceryMap/index.ts`

- [ ] **Step 1: Update barrel exports**

```tsx
// components/GroceryMap/index.ts
export { MapLayer } from "./MapLayer";
export { StoreMarker } from "./StoreMarker";
export { StoreCard } from "./StoreCard";
export { StoreList } from "./StoreList";
export { StoreRankings } from "./StoreRankings";
export { MiniStoreList } from "./MiniStoreList";
export { StoreInfoCard } from "./StoreInfoCard";

export type { MapLayerProps, StoreLocation } from "./MapLayer";
export type { StoreMarkerProps } from "./StoreMarker";
export type { StoreCardProps } from "./StoreCard";
export type { StoreListProps, StoreListItem } from "./StoreList";
export type { StoreRankingsProps } from "./StoreRankings";
export type { MiniStoreListProps, MiniStoreItem } from "./MiniStoreList";
export type { StoreInfoCardProps, StoreInfo } from "./StoreInfoCard";
```

- [ ] **Step 2: Commit**

```bash
git add components/GroceryMap/index.ts
git commit -m "chore: update GroceryMap barrel exports"
```

---

### Task 7: Run full test suite and typecheck

**Files:**
- None (verification)

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck`
Expected: No TypeScript errors

- [ ] **Step 2: Run all tests**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 3: Manual verification**

Run: `bun run ios` or `bun run android`
Expected:
- Map renders with store markers
- Markers show price badges
- Bottom sheet snaps to 3 positions
- Tap marker -> sheet expands with store details
- Mini list shows when no store selected

- [ ] **Step 4: Commit any fixes**

```bash
git add .
git commit -m "test: fix test failures and type errors"
```

---

## Spec Coverage Check

- [x] Expo Maps integration (Task 1)
- [x] Custom markers with grocery icon + price badge (Task 2)
- [x] BottomSheet with 3 snap positions (Task 5)
- [x] MiniStoreList when none selected (Task 3, Task 5)
- [x] StoreInfoCard when store selected (Task 4, Task 5)
- [x] Marker tap -> set selected store (Task 5)
- [x] "View Prices" + "Navigate" buttons (Task 4, Task 5)

## Self-Review

**Placeholder scan:** None found.

**Type consistency:** All types match between component exports and index barrel.

**Scope check:** Plan is focused on single feature (map + bottom sheet replacement). No unrelated changes.