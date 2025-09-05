import { PURPLE_IMAGES } from "~/constants/purple-images";
import type { ImageSourcePropType } from "react-native";

export function getImages(length: number = 1): ImageSourcePropType[] {
  const imageList = Object.values(PURPLE_IMAGES);
  if (length < 1) {
    return [];
  }

  // Build exactly `length` items, repeating the array as needed
  const result: ImageSourcePropType[] = [];
  let i = 0;
  while (result.length < length) {
    result.push(imageList[i % imageList.length]);
    i += 1;
  }
  return result;
}
