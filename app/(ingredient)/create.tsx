import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Alert,
  Linking,
  Platform,
  Pressable,
  Dimensions,
} from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import { H4, P } from "~/components/ui/typography";
import {
  CameraIcon,
  ImagesIcon,
  SwitchCameraIcon,
} from "~/lib/icons/CreateIngredientIcons";
import { Button } from "~/components/ui/button";
import { useColorScheme } from "~/hooks/useColorScheme";
import { NAV_THEME } from "~/lib/constants";
import { ArrowLeftIcon } from "~/lib/icons/Back";
import { useRouter } from "expo-router";

export default function CreateIngredient() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [hasAskedPermission, setHasAskedPermission] = useState(false);
  const { colorScheme } = useColorScheme();
  const router = useRouter();

  // Get screen dimensions
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  // Frame position state - default to center of screen
  const [framePosition, setFramePosition] = useState({
    x: screenWidth / 2 - 64, // Center horizontally (minus half frame width)
    y: screenHeight / 2 - 64, // Center vertically (minus half frame height)
  });

  // Bottom sheet ref
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    bottomSheetBackground: {
      backgroundColor: NAV_THEME[colorScheme].card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    bottomSheetIndicator: {
      backgroundColor: NAV_THEME[colorScheme].primary,
      width: 40,
      height: 4,
    },
    cameraView: {
      flex: 1,
    },
  });

  useEffect(() => {
    if (!permission && !hasAskedPermission) {
      requestPermission();
      setHasAskedPermission(true);
    }
  }, [permission, requestPermission, hasAskedPermission]);

  // Camera and gallery functions
  const takePicture = async () => {
    // TODO: Implement camera capture
    // console.log('Taking picture...');
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      // TODO: Handle selected image
      // Image selected successfully
    }
  };

  const handleSheetChanges = useCallback((_index: number) => {
    // Bottom sheet changed to index: _index
  }, []);

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  // Handle touch on camera view to move frame
  const handleCameraTouch = (event: {
    nativeEvent: { pageX: number; pageY: number };
  }) => {
    const { pageX, pageY } = event.nativeEvent;
    setFramePosition({ x: pageX - 64, y: pageY - 64 }); // Center the 128x128 frame on touch point
  };

  if (!permission) {
    // Camera permissions are still loading.
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    const handlePermissionRequest = async () => {
      const result = await requestPermission();

      if (!result.granted && result.canAskAgain === false) {
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

    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <View className="items-center space-y-6">
          <CameraIcon className="text-white" size={64} />
          <H4 className="text-center text-white">Camera Access Required</H4>
          <P className="text-center text-gray-300">
            We need access to your camera to help you add ingredients by taking
            photos
          </P>
          <Button
            variant="default"
            className="mt-4"
            onPress={handlePermissionRequest}
          >
            <P className="text-primary-foreground">Enable Camera</P>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View
        style={dynamicStyles.cameraView}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleCameraTouch}
      >
        {/* CameraView without children */}
        <CameraView style={dynamicStyles.cameraView} facing={facing} />

        {/* Overlay elements positioned absolutely on top of camera */}
        {/* Header with date and instruction */}
        <View className="absolute p-8 w-full flex justify-center items-center">
          <P className="text-white text-center py-1">
            Please place the object within the frame
          </P>
        </View>

        {/* Back Button */}
        <View className="absolute p-8 z-10">
          <Button
            size="icon-sm"
            variant="secondary"
            className="rounded-full"
            onPress={() => router.back()}
          >
            <ArrowLeftIcon className="text-foreground" size={20} />
          </Button>
        </View>

        {/* Scanning Frame Overlay - positioned based on touch */}
        <View
          className="absolute w-32 h-32"
          style={{
            left: framePosition.x,
            top: framePosition.y,
          }}
        >
          {/* Top Left Corner */}
          <View className="absolute top-0 left-0 w-6 h-6">
            <View className="absolute top-0 left-0 w-6 h-1 bg-white" />
            <View className="absolute top-0 left-0 w-1 h-6 bg-white" />
          </View>

          {/* Top Right Corner */}
          <View className="absolute top-0 right-0 w-6 h-6">
            <View className="absolute top-0 right-0 w-6 h-1 bg-white" />
            <View className="absolute top-0 right-0 w-1 h-6 bg-white" />
          </View>

          {/* Bottom Left Corner */}
          <View className="absolute bottom-0 left-0 w-6 h-6">
            <View className="absolute bottom-0 left-0 w-6 h-1 bg-white" />
            <View className="absolute bottom-0 left-0 w-1 h-6 bg-white" />
          </View>

          {/* Bottom Right Corner */}
          <View className="absolute bottom-0 right-0 w-6 h-6">
            <View className="absolute bottom-0 right-0 w-6 h-1 bg-white" />
            <View className="absolute bottom-0 right-0 w-1 h-6 bg-white" />
          </View>
        </View>
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={["20%", "100%"]}
        onChange={handleSheetChanges}
        backgroundStyle={dynamicStyles.bottomSheetBackground}
        handleIndicatorStyle={dynamicStyles.bottomSheetIndicator}
        enableDynamicSizing={false}
      >
        <BottomSheetView className="flex-1 p-6">
          <View className="flex flex-row justify-between items-center px-3">
            {/* Flip Camera Button */}
            <Button
              size="icon-lg"
              variant="secondary"
              className="rounded-full"
              onPress={toggleCameraFacing}
            >
              <SwitchCameraIcon className="text-foreground" size={20} />
            </Button>

            {/* Camera Shutter Button */}
            <Pressable
              className="w-20 h-20 rounded-full bg-white justify-center items-center border-4 border-gray-300"
              onPress={takePicture}
            >
              <View className="w-15 h-15 rounded-full bg-white border-2 border-gray-400" />
            </Pressable>

            {/* Gallery Button */}
            <Button
              size="icon-lg"
              variant="secondary"
              className="rounded-full"
              onPress={pickFromGallery}
            >
              <ImagesIcon className="text-foreground" size={20} />
            </Button>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
