import { memo, useMemo, type FC } from "react";
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
  source: ImageSourcePropType | string | undefined;
  size?: number;
  strokeColor?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /** Use with remote URLs for better cache hits. */
  cacheKey?: string;
  /** Default "memory-disk" for list/thumbnail reuse. */
  cachePolicy?: "none" | "disk" | "memory" | "memory-disk";
};

/**
 * Renders a PNG with an approximate white outline by layering tinted copies
 * behind the original at small offsets. Works well for small icons/thumbnails.
 */
export const OutlinedImage: FC<OutlinedImageProps> = ({
  source,
  size = 48,
  strokeColor = "#FFFFFF",
  strokeWidth = 2,
  style,
  imageStyle,
  cacheKey,
  cachePolicy = "memory-disk",
}) => {
  const resolvedSource = useMemo(() => {
    if (source == null) return source;
    if (cacheKey == null) return source;
    if (typeof source === "string") return { uri: source, cacheKey };
    if (typeof source === "object" && "uri" in source) return { ...source, cacheKey };
    return source;
  }, [source, cacheKey]);

  const offsets = useMemo(() => {
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
    <View className="relative" style={[{ width: size, height: size }, style]} collapsable={false}>
      {offsets.map(([dx, dy], idx) => (
        <Image
          key={`outline-${idx}`}
          source={resolvedSource}
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
          cachePolicy={cachePolicy}
          transition={150}
        />
      ))}
      <Image
        source={resolvedSource}
        style={[styles.abs, { width: size, height: size }, imageStyle]}
        contentFit="contain"
        cachePolicy={cachePolicy}
        transition={150}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  abs: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});

export default memo(OutlinedImage);
