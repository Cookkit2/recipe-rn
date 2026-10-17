import type { ImageProps } from "expo-image";
import type { ImageSourcePropType, ImageURISource } from "react-native";

type Source = ImageSourcePropType | string | undefined;

function isSourceArray(source: Source): source is readonly ImageURISource[] {
  return Array.isArray(source);
}

// RN 0.88 exposes readonly source arrays; Expo Image still expects a mutable array.
export function toExpoImageSource(source: Source): ImageProps["source"] {
  return isSourceArray(source) ? [...source] : source;
}
