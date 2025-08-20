/**
 * Example usage of ThanosSnapEffect component
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  ThanosSnapEffect,
  ThanosSnapEffectMask,
} from "../components/Custom/ThanosSnapEffect";

export function ThanosSnapExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thanos Snap Effect Examples</Text>

      {/* Particle-based snap effect */}
      <View style={styles.exampleContainer}>
        <Text style={styles.subtitle}>Particle Effect</Text>
        <ThanosSnapEffect
          style={styles.snapContainer}
          onSnapComplete={() => console.log("Snap complete!")}
        >
          <View style={styles.card}>
            <Text style={styles.cardText}>Tap to Snap! 💜</Text>
            <Text style={styles.cardSubtext}>
              Watch me dissolve into particles
            </Text>
          </View>
        </ThanosSnapEffect>
      </View>

      {/* Mask-based snap effect */}
      <View style={styles.exampleContainer}>
        <Text style={styles.subtitle}>Mask Effect</Text>
        <ThanosSnapEffectMask
          style={styles.snapContainer}
          onSnapComplete={() => console.log("Mask snap complete!")}
        >
          <View style={[styles.card, styles.alternateCard]}>
            <Text style={styles.cardText}>Tap to Snap! ✨</Text>
            <Text style={styles.cardSubtext}>Simple fade with scale</Text>
          </View>
        </ThanosSnapEffectMask>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#cccccc",
    marginBottom: 16,
    textAlign: "center",
  },
  exampleContainer: {
    marginBottom: 40,
  },
  snapContainer: {
    alignItems: "center",
  },
  card: {
    backgroundColor: "#8B5CF6",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 200,
  },
  alternateCard: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  cardText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  cardSubtext: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.8,
    textAlign: "center",
  },
});
