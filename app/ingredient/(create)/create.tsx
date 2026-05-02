// @ts-ignore
import { Camera, useCameraDevice, useCameraFormat, type Point } from "react-native-vision-camera";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import allModel from "~/hooks/model/allModel";
import { log } from "~/utils/logger";
import FocusingAreaIndicator from "~/components/Camera/FocusingAreaIndicator";
import { H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { CameraIcon } from "lucide-uniwind";
import { setStatusBarStyle } from "expo-status-bar";
import { useCameraPermissions } from "~/hooks/useCameraPermissions";
import CameraActionRow from "~/components/Camera/CameraActionRow";
import CameraLayout from "~/components/Camera/CameraLayout";
import { CAMERA_RESOLUTION } from "~/constants/camera";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import { scheduleOnRN } from "react-native-worklets";

export default function CreateIngredient() {
  const { hasPermission, handlePermissionRequest } = useCameraPermissions();
  const { updateFramePosition } = useCreateIngredientStore();

  const camera = useRef<any>(null);
  const device = useCameraDevice("back");
  const isCameraAvailable = !!device;
  const format = useCameraFormat(device, [
    { photoResolution: CAMERA_RESOLUTION },
    { videoResolution: CAMERA_RESOLUTION },
  ]);

  // Tap to focus gesture
  const handleTap = (x: number, y: number) => {
    // Update the frame position (subtract 48 to center the frame)
    updateFramePosition({ x: x - 48, y: y - 48 });

    // Focus the camera at the tapped point
    const point: Point = { x, y };
    camera.current?.focus(point);
  };

  const tapGesture = Gesture.Tap().onEnd(({ x, y }) => {
    "worklet";
    scheduleOnRN(handleTap, x, y);
  });

  useEffect(() => {
    const requestId = requestIdleCallback(() => {
      // Load the model if not already loaded
      if (!allModel.isLoaded()) {
        allModel.get().catch((error) => {
          log.error("Failed to load model:", error);
        });
      }
    });

    setStatusBarStyle("light", true);
    return () => {
      setStatusBarStyle("auto", true);
      cancelIdleCallback(requestId);
    };
  }, []);

  if (!hasPermission) {
    // Camera permissions are not granted yet.
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <View className="items-center space-y-6">
          <CameraIcon className="text-white" size={64} />
          <H4 className="text-center text-white">Camera Access Required</H4>
          <P className="text-center text-gray-300">
            We need access to your camera to help you add ingredients by taking photos
          </P>
          <Button variant="default" className="mt-4" onPress={handlePermissionRequest}>
            <P className="text-primary-foreground">Enable Camera</P>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <CameraLayout>
      <View className="relative w-full aspect-3/4 z-1">
        {isCameraAvailable ? (
          <GestureDetector gesture={tapGesture}>
            {/* @ts-ignore */}
            {/* @ts-ignore */}
            {(() => { const C = Camera as any; return <C ref={camera} photo style={[StyleSheet.absoluteFill]} photoQualityBalance="speed" device={device!} format={format} enableDepthData={false} isActive={true} enableZoomGesture={true} />; })()}
          </GestureDetector>
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <CameraIcon className="text-white/60" size={56} />
            <H4 className="text-white mt-4 font-urbanist-bold">No Camera Available</H4>
            <P className="text-gray-300 mt-2 px-8 text-center font-urbanist-regular">
              This device doesn't have an available camera. You can still pick an image from your
              gallery.
            </P>
          </View>
        )}

        {isCameraAvailable && <FocusingAreaIndicator />}
      </View>

      <CameraActionRow camera={camera} isCameraAvailable={isCameraAvailable} />
    </CameraLayout>
  );
}
