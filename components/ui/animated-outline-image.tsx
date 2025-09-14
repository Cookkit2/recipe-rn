import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";

const AnimatedImage = Animated.createAnimatedComponent(Image);

type AnimatedOutlinedImageProps = {
  source: ImageSourcePropType | string | undefined;
  size?: number;
  strokeColor?: string;
  strokeWidth: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

/**
 * Renders a PNG with an approximate white outline by layering tinted copies
 * behind the original at small offsets. Works well for small icons/thumbnails.
 */
export function AnimatedOutlinedImage({
  source,
  size = 48,
  strokeColor = "#FFFFFF",
  strokeWidth,
  style,
  imageStyle,
}: AnimatedOutlinedImageProps) {
  const r = useDerivedValue(() => {
    return Math.max(1, Math.round(strokeWidth.value));
  });

  const offsets = useMemo(() => {
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
  }, [r]);

  return (
    <View className="relative" style={[{ width: size, height: size }, style]}>
      {offsets.map(([dx, dy], idx) => (
        <AnimatedImage
          key={`outline-${idx}`}
          sharedTransitionTag={`outline-${idx}`}
          source={source}
          transition={{
            duration: 100,
            timing: "ease-in-out",
            effect: "cross-dissolve",
          }}
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
      <AnimatedImage
        key={`main-image`}
        sharedTransitionTag={`main-image`}
        transition={{
          duration: 100,
          timing: "ease-in-out",
          effect: "cross-dissolve",
        }}
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

export default AnimatedOutlinedImage;
