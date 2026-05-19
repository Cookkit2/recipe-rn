import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { formatCurrency } from "~/utils/price-calculator";
import { formatDistance } from "~/utils/store-display";

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
          accessibilityRole="button"
          accessibilityLabel={`${store.name}, ${formatCurrency(store.totalPriceCents, "MYR")}, ${formatDistance(store.distance)}`}
          accessibilityHint="View store details"
          hitSlop={8}
        >
          <Text style={styles.name}>{store.name}</Text>
          <Text style={styles.price}>{formatCurrency(store.totalPriceCents, "MYR")}</Text>
          <Text style={styles.distance}>{formatDistance(store.distance)}</Text>
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
