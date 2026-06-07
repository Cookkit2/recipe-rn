import type { ScaledSize } from "react-native";
import { Dimensions, Platform } from "react-native";

const HEADER_HEIGHT = 100;

const ElementsText = {
  AUTOPLAY: "AutoPlay",
};

const isWeb = Platform.OS === "web";

const MAX_WIDTH = 430;

export const window: ScaledSize = isWeb
  ? { width: MAX_WIDTH, height: 800, scale: 1, fontScale: 1 }
  : Dimensions.get("screen");
