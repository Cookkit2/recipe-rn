import { Dimensions } from "react-native";

const { height } = Dimensions.get("window");

// Define snap points
export const EXPANDED_HEIGHT = height * 0.75; // 75% of screen when expanded
export const SNAP_THRESHOLD = 50; // Minimum drag distance to trigger snap
