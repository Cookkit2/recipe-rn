import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import { formatCurrency } from "~/utils/price-calculator";

export interface StoreMarkerProps {
  totalPriceCents: number;
  onPress?: () => void;
}

export function StoreMarker({ totalPriceCents, onPress }: StoreMarkerProps) {
  const formattedPrice = formatCurrency(totalPriceCents);

  return (
    <View style={styles.container}>
      {onPress ? (
        <Pressable
          style={styles.pressable}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Store with price ${formattedPrice}`}
          hitSlop={8}
        >
          <View style={styles.marker}>
            <ShoppingCart size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>

          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{formattedPrice}</Text>
          </View>
        </Pressable>
      ) : (
        <>
          <View style={styles.marker}>
            <ShoppingCart size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>

          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{formattedPrice}</Text>
          </View>
        </>
      )}
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
  pressable: {
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
