import React from "react";
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Image } from "expo-image";

type OutlinedImageProps = {
  source: ImageSourcePropType;
  size?: number;
  strokeColor?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
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
          contentFit="contain"
        />
      ))}
      <Image
        source={source}
        style={[styles.abs, { width: size, height: size }, imageStyle]}
        contentFit="contain"
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
