import { ScreenCornerRadius } from "react-native-screen-corner-radius";

export default function useDeviceCornerRadius() {
  return ScreenCornerRadius || 0;
}
