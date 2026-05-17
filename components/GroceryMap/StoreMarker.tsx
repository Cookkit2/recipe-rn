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
