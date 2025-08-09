import React from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import Animated from "react-native-reanimated";

type OutlinedImageProps = {
  source: ImageSourcePropType;
  size?: number;
  strokeColor?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  // Pass-through for Reanimated entering animation on the main image
  entering?: any;
};

/**
 * Renders a PNG with an approximate white outline by layering tinted copies
 * behind the original at small offsets. Works well for small icons/thumbnails.
 */
export function OutlinedImage({
  source,
  size = 48,
  strokeColor = "#FFFFFF",
  strokeWidth = 2,
  style,
  imageStyle,
  entering,
}: OutlinedImageProps) {
  const offsets = React.useMemo(() => {
    const r = Math.max(1, Math.round(strokeWidth));
    return [
      [-r, 0],
      [r, 0],
      [0, -r],
      [0, r],
      [-r, -r],
      [-r, r],
      [r, -r],
      [r, r],
    ];
  }, [strokeWidth]);

  return (
    <View className="relative" style={[{ width: size, height: size }, style]}>
      {offsets.map(([dx, dy], idx) => (
        <Image
          key={`outline-${idx}`}
          source={source}
          style={[
            styles.abs,
            {
              left: dx,
              top: dy,
              width: size,
              height: size,
              tintColor: strokeColor,
            },
            imageStyle,
          ]}
          resizeMode="contain"
        />
      ))}
      <Animated.Image
        source={source}
        style={[styles.abs, { width: size, height: size }, imageStyle]}
        resizeMode="contain"
        entering={entering}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});

export default OutlinedImage;
