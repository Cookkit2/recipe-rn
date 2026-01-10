import { useEffect, useState } from "react";
import { useCameraPermission } from "react-native-vision-camera";
import { Alert, Linking, Platform } from "react-native";

export function useCameraPermissions() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [hasAskedPermission, setHasAskedPermission] = useState(false);

  useEffect(() => {
    if (!hasPermission && !hasAskedPermission) {
      requestPermission();
      setHasAskedPermission(true);
    }
  }, [hasPermission, requestPermission, hasAskedPermission]);

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
