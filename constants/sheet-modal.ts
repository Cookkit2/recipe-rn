import { Dimensions } from "react-native";

export const SCALE_FACTOR = 0.83;
export const DRAG_THRESHOLD = Math.min(Dimensions.get("window").height * 0.2, 150);
export const HORIZONTAL_DRAG_THRESHOLD = Math.min(Dimensions.get("window").width * 0.51, 80);
export const DIRECTION_LOCK_ANGLE = 45; // Angle in degrees to determine horizontal vs vertical movement
export const ENABLE_HORIZONTAL_DRAG_CLOSE = true;
