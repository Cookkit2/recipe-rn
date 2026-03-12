import React from "react";
import { View } from "react-native";

interface ScanFrameProps {
  /** Position of the frame center */
  x: number;
  y: number;
}

/**
 * Shared scanning frame indicator with corner brackets.
 * Used by both FocusingAreaIndicator (camera) and ImagePointPickerOverlay (gallery).
 */
export default function ScanFrame({ x, y }: ScanFrameProps) {
  return (
    <View className="absolute w-24 h-24" style={{ left: x - 48, top: y - 48 }} pointerEvents="none">
      {/* Top Left Corner */}
      <View className="absolute top-0 left-0 w-6 h-6">
        <View className="absolute top-0 left-0 w-6 h-1 bg-white" />
        <View className="absolute top-0 left-0 w-1 h-6 bg-white" />
      </View>

      {/* Top Right Corner */}
      <View className="absolute top-0 right-0 w-6 h-6">
        <View className="absolute top-0 right-0 w-6 h-1 bg-white" />
        <View className="absolute top-0 right-0 w-1 h-6 bg-white" />
      </View>

      {/* Bottom Left Corner */}
      <View className="absolute bottom-0 left-0 w-6 h-6">
        <View className="absolute bottom-0 left-0 w-6 h-1 bg-white" />
        <View className="absolute bottom-0 left-0 w-1 h-6 bg-white" />
      </View>

      {/* Bottom Right Corner */}
      <View className="absolute bottom-0 right-0 w-6 h-6">
        <View className="absolute bottom-0 right-0 w-6 h-1 bg-white" />
        <View className="absolute bottom-0 right-0 w-1 h-6 bg-white" />
      </View>
    </View>
  );
}
