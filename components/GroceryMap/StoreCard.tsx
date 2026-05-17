import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "~/components/ui/button";
import { formatCurrency } from "~/utils/price-calculator";
import { formatDistance, formatOpenStatus } from "~/utils/store-display";

export interface StoreCardProps {
  storeName: string;
  address: string;
  distance: number;
  totalPriceCents: number;
  isOpen: boolean;
  closingTime?: string;
  onPressNavigate: () => void;
  onPressViewPrices: () => void;
}

export function StoreCard({
  storeName,
  address,
  distance,
  totalPriceCents,
  isOpen,
  closingTime,
  onPressNavigate,
  onPressViewPrices,
}: StoreCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.storeName}>{storeName}</Text>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{formatCurrency(totalPriceCents, "MYR")}</Text>
        </View>
      </View>

      <Text style={styles.address}>{address}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.distance}>{formatDistance(distance)}</Text>
        <Text style={[styles.status, { color: isOpen ? "#4CAF50" : "#F44336" }]}>
          {formatOpenStatus(isOpen, closingTime)}
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  priceTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 14,
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
    marginBottom: 12,
  },
  distance: {
    fontSize: 12,
    color: "#666666",
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
  },
  buttonText: {
    fontSize: 14,
  },
  buttonTextPrimary: {
    fontSize: 14,
    color: "#FFFFFF",
  },
});
