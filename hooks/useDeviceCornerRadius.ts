import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Custom hook for getting the device's screen corner radius.
 *
 * This hook returns the appropriate corner radius value based on the platform:
 * - **Android**: Returns the top safe area inset, which typically corresponds to
 *   the device's notch/camera cutout area
 * - **iOS**: The platform-specific implementation reads the native screen radius.
 * - **Other platforms**: Returns 0 as a fallback
 *
 * This is useful for creating UI elements that need to match or respect the device's
 * physical screen curvature, such as floating cards, modals, or rounded containers.
 *
 * @returns The corner radius value in pixels (number). Returns 0 if the platform
 *          is not supported or no corner radius is available.
 *
 * @example
 * ```tsx
 * const FloatingCard = () => {
 *   const cornerRadius = useDeviceCornerRadius();
 *
 *   return (
 *     <View style={[
 *       styles.card,
 *       { borderRadius: cornerRadius }
 *     ]}>
 *       <Text>Content that matches device corners</Text>
 *     </View>
 *   );
 * };
 * ```
 *
 * @example
 * ```tsx
 * // Use for bottom sheets or modals
 * const BottomSheet = () => {
 *   const cornerRadius = useDeviceCornerRadius();
 *
 *   return (
 *     <View style={{
 *       borderTopLeftRadius: cornerRadius,
 *       borderTopRightRadius: cornerRadius
 *     }}>
 *       // Sheet content
 *     </View>
 *   );
 * };
 * ```
 */

const useDeviceCornerRadius = () => {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "android") {
    return insets.top;
  }

  // Default fallback for other platforms
  return 0;
};

export default useDeviceCornerRadius;
