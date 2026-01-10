import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenCornerRadius } from "react-native-screen-corner-radius";

const useDeviceCornerRadius = () => {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "android") {
    return insets.top;
  }

  if (Platform.OS === "ios") {
    return ScreenCornerRadius || 0;
  }

  // Default fallback for other platforms
  return 0;
};

export default useDeviceCornerRadius;
