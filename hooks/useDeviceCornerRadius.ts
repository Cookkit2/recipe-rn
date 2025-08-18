import { Platform } from "react-native";
import { ScreenCornerRadius } from "react-native-screen-corner-radius";

const useDeviceCornerRadius = () => {
  if (Platform.OS === "android") {
    return ScreenCornerRadius || 0;
  }

  if (Platform.OS === "ios") {
    return ScreenCornerRadius || 0;

    // TODO: IOS doesn't release this api, thus to be safe

    // const { width, height } = Dimensions.get("window");
    // const screenInches =
    //   Math.sqrt(width * width + height * height) /
    //   Platform.select({ ios: 163, default: 160 });

    // // iPhone corner radius values based on device model dimensions
    // const iosCornerRadius = (() => {
    //   // iPad detection first (larger screens)
    //   if (screenInches > 10) {
    //     return 18.0; // iPad Air / iPad Pro 11-inch / 12.9-inch
    //   }

    //   // iPhone model detection based on screen dimensions
    //   const normalizedWidth = Math.min(width, height);
    //   const normalizedHeight = Math.max(width, height);

    //   // iPhone 16 Pro Max (6.9")
    //   if (normalizedWidth === 440 && normalizedHeight === 956) {
    //     return 55.0;
    //   }

    //   // iPhone 16 Pro (6.3")
    //   if (normalizedWidth === 402 && normalizedHeight === 874) {
    //     return 55.0;
    //   }

    //   // iPhone 16 / 16 Plus / 15 / 15 Plus / 14 Pro / 14 Pro Max (6.1" & 6.7")
    //   if (
    //     (normalizedWidth === 393 && normalizedHeight === 852) ||
    //     (normalizedWidth === 430 && normalizedHeight === 932)
    //   ) {
    //     return 55.0;
    //   }

    //   // iPhone 12 Pro Max / 13 Pro Max / 14 Plus (6.7")
    //   if (
    //     (normalizedWidth === 428 && normalizedHeight === 926) ||
    //     (normalizedWidth === 430 && normalizedHeight === 932)
    //   ) {
    //     return 53.33;
    //   }

    //   // iPhone 12 / 12 Pro / 13 Pro / 14 (6.1")
    //   if (normalizedWidth === 390 && normalizedHeight === 844) {
    //     return 47.33;
    //   }

    //   // iPhone 12 mini / 13 mini (5.4")
    //   if (normalizedWidth === 375 && normalizedHeight === 812) {
    //     return 44.0;
    //   }

    //   // iPhone Xr / 11 (6.1" LCD models)
    //   if (normalizedWidth === 414 && normalizedHeight === 896) {
    //     return 41.5;
    //   }

    //   // iPhone X / Xs / Xs Max / 11 Pro / 11 Pro Max (5.8" & 6.5" OLED models)
    //   if (
    //     (normalizedWidth === 375 && normalizedHeight === 812) ||
    //     (normalizedWidth === 414 && normalizedHeight === 896)
    //   ) {
    //     return 39.0;
    //   }

    //   // Default fallback for unknown iOS devices
    //   return 20.0;
    // })();

    // return iosCornerRadius;
  }

  // Default fallback for other platforms
  return 0;
};

export default useDeviceCornerRadius;
