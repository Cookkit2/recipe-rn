import { memo, useMemo, useState, useEffect, useCallback, useRef, type FC } from "react";
import {
  Image as NativeImage,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Image } from "expo-image";
import { toExpoImageSource } from "~/utils/image-source";

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
    if (cacheKey == null) return toExpoImageSource(source);
    if (typeof source === "string") return { uri: source, cacheKey };
    if (typeof source === "object" && "uri" in source) return { ...source, cacheKey };
    return toExpoImageSource(source);
  }, [source, cacheKey]);

  const uri =
    typeof source === "string"
      ? source
      : typeof source === "number"
        ? NativeImage.resolveAssetSource(source)?.uri
        : source && !Array.isArray(source) && "uri" in source
          ? source.uri
          : undefined;
  const key = `${uri}:${size}:${strokeColor}:${strokeWidth}:${cacheKey}`;
  const [baked, setBaked] = useState<{ key: string; uri: string }>();
  const generation = useRef(0);
  const bake = useCallback(() => {
    if (!uri) return () => {};
    let cancelled = false;
    const token = generation.current;
    const run = () => {
      if (cancelled) return;
      void import("~/lib/outlined-thumbnail")
        .then(({ outlinedThumbnail }) =>
          outlinedThumbnail(uri, size, strokeColor, strokeWidth, cacheKey)
        )
        .then((result) => {
          if (result && !cancelled && token === generation.current) setBaked({ key, uri: result });
        })
        .catch(() => {
          /* Preserve the existing outline if baking is unavailable. */
        });
    };
    const timer = setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [uri, size, strokeColor, strokeWidth, cacheKey, key]);
  useEffect(() => {
    const cancel = bake();
    return () => {
      generation.current++;
      cancel();
    };
  }, [bake]);

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

  if (baked?.key === key) {
    const radius = Math.max(1, Math.round(strokeWidth));
    return (
      <View className="relative" style={[{ width: size, height: size }, style]} collapsable={false}>
        <Image
          source={{ uri: baked.uri }}
          style={[
            styles.abs,
            { left: -radius, top: -radius, width: size + radius * 2, height: size + radius * 2 },
            imageStyle,
          ]}
          contentFit="contain"
          cachePolicy={cachePolicy}
        />
      </View>
    );
  }

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
          transition={{ duration: 150, skipOnCacheHit: "all" }}
        />
      ))}
      <Image
        source={resolvedSource}
        onLoad={() => {
          bake();
        }}
        style={[styles.abs, { width: size, height: size }, imageStyle]}
        contentFit="contain"
        cachePolicy={cachePolicy}
        transition={{ duration: 150, skipOnCacheHit: "all" }}
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
