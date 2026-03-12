import { useEffect, useState } from "react";
import { useCameraPermission } from "react-native-vision-camera";
import { Alert, Linking, Platform } from "react-native";

/**
 * Custom hook for managing camera permissions with automatic requests and user guidance
 *
 * Automatically requests camera permission on mount if not already granted.
 * If permission is denied, shows an alert with a deep link to device settings.
 *
 * @returns Object containing permission state and request handlers
 * @returns {boolean} hasPermission - Current camera permission status
 * @returns {() => Promise<boolean>} requestPermission - Function to request camera permission
 * @returns {() => Promise<void>} handlePermissionRequest - Function to request permission and show settings alert if denied
 */
export function useCameraPermissions() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [hasAskedPermission, setHasAskedPermission] = useState(false);

  useEffect(() => {
    if (!hasPermission && !hasAskedPermission) {
      requestPermission();
      setHasAskedPermission(true);
    }
  }, [hasPermission, requestPermission, hasAskedPermission]);

  /**
   * Requests camera permission and shows alert dialog if denied
   *
   * If the user denies permission and selects "Don't ask again",
   * displays an alert with options to cancel or open device settings.
   * Uses platform-specific deep links (iOS: app-settings:, Android: Linking.openSettings())
   */
  const handlePermissionRequest = async () => {
    const result = await requestPermission();

    if (!result) {
      // User denied permission and selected "Don't ask again"
      Alert.alert(
        "Camera Permission Required",
        "To add ingredients using your camera, please enable camera access in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    }
  };

  return {
    hasPermission,
    requestPermission,
    handlePermissionRequest,
  };
}
