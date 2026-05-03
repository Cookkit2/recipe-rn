import type { PhotoOutputOptions } from "react-native-vision-camera";

export const CAMERA_RESOLUTION = { width: 1512, height: 2016 };

export const CAMERA_PHOTO_OUTPUT_OPTIONS = {
  targetResolution: CAMERA_RESOLUTION,
  containerFormat: "jpeg",
  qualityPrioritization: "speed",
} satisfies Partial<PhotoOutputOptions>;
