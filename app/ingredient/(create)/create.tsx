import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from "react-native-vision-camera";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import FocusingAreaIndicator from "~/components/Camera/FocusingAreaIndicator";
import { H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { CameraIcon } from "lucide-nativewind";
import type { SkImage } from "@shopify/react-native-skia";
import type { PantryItemConfirmation } from "~/types/PantryItem";
import type { Prettify } from "~/utils/type-prettier";
import { setStatusBarStyle } from "expo-status-bar";
import { useCameraPermissions } from "~/hooks/useCameraPermissions";
import CameraActionRow from "~/components/Camera/CameraActionRow";
import CameraLayout from "~/components/Camera/CameraLayout";

export const CAMERA_RESOLUTION = { width: 3024, height: 4032 };

export type SegmentedImage = Prettify<
  Omit<PantryItemConfirmation, "id" | "image_url"> & {
    skImage: SkImage;
  }
>;

export default function CreateIngredient() {
  const { hasPermission, handlePermissionRequest } = useCameraPermissions();

  const camera = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const isCameraAvailable = !!device;
  const format = useCameraFormat(device, [
    { photoResolution: CAMERA_RESOLUTION },
    { videoResolution: CAMERA_RESOLUTION },
  ]);

  useEffect(() => {
    setStatusBarStyle("light", true);
    return () => setStatusBarStyle("auto", true);
  }, []);

  if (!hasPermission) {
    // Camera permissions are not granted yet.
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
    <CameraLayout>
      <View className="relative w-full aspect-[3/4] z-[1]">
        {isCameraAvailable ? (
          <Camera
            ref={camera}
            photo
            style={[StyleSheet.absoluteFill]}
            photoQualityBalance="speed"
            device={device!}
            format={format}
            enableDepthData={false}
            isActive={true}
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <CameraIcon className="text-white/60" size={56} />
            <H4 className="text-white mt-4 font-urbanist-bold">
              No Camera Available
            </H4>
            <P className="text-gray-300 mt-2 px-8 text-center font-urbanist-regular">
              This device doesn't have an available camera. You can still pick
              an image from your gallery.
            </P>
          </View>
        )}

        {isCameraAvailable && <FocusingAreaIndicator cameraRef={camera} />}
      </View>

      <CameraActionRow camera={camera} isCameraAvailable={isCameraAvailable} />
    </CameraLayout>
  );
}
