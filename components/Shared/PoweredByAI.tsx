import { SparkleIcon } from "lucide-uniwind";
import React from "react";
import { StyleSheet, View } from "react-native";
import { P } from "../ui/typography";
import useColors from "~/hooks/useColor";
import { LinearGradient } from "expo-linear-gradient";

export default function PoweredByAI() {
  const colors = useColors();

  return (
    <View className="relative flex-row items-center justify-center mt-1 gap-2">
      <P className="font-urbanist-bold text-foreground/70">Powered by</P>
      <View className="rounded-full px-3 py-[2] overflow-hidden border-border border-2 flex-row gap-1 items-center">
        <LinearGradient
          colors={[colors.primary, "#FF6F4B"]}
          start={[0.1, 0.4]}
          end={[0.8, 0.9]}
          style={StyleSheet.absoluteFill}
        />
        <P className="font-urbanist-extrabold text-primary-foreground">AI</P>
        <SparkleIcon
          size={14}
          color={colors.primaryForeground}
          fill="#FFFFFF"
        />
      </View>
    </View>
  );
}
