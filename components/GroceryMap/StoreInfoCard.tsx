import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { formatCurrency } from "~/utils/price-calculator";
import { formatDistance, formatOpenStatus } from "~/utils/store-display";

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
        <Text style={styles.distance}>{formatDistance(store.distance)}</Text>
        <Text style={[styles.status, { color: store.isOpen ? "#4CAF50" : "#F44336" }]}>
          {formatOpenStatus(store.isOpen, store.closingTime)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.outlineButton}
          onPress={onPressViewPrices}
          role="button"
          accessibilityLabel="View prices at this store"
          testID="viewPricesButton"
        >
          <Text style={styles.buttonText}>View Prices</Text>
        </Pressable>
        <Pressable
          style={styles.primaryButton}
          onPress={onPressNavigate}
          role="button"
          accessibilityLabel="Navigate to this store"
          testID="navigateButton"
        >
          <Text style={styles.buttonTextPrimary}>Navigate</Text>
        </Pressable>
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
  },
  outlineButton: {
    flex: 1,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButton: {
    flex: 1,
    marginLeft: 6,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  buttonTextPrimary: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});
