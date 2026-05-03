import React, { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Button } from "../ui/button";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import { useRouter } from "expo-router";
import { ImagesIcon, SaveIcon } from "lucide-uniwind";
import { toast } from "sonner-native";
import { RECIPE_COOKED_KEY } from "~/constants/storage-keys";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import useLocalStorageState from "~/hooks/useLocalStorageState";
import { presentPaywallIfNeeded } from "~/utils/subscription-utils";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import type { CameraPhotoOutput } from "react-native-vision-camera";
import Animated from "react-native-reanimated";
import ImagePointPickerOverlay from "./ImagePointPickerOverlay";
import { log } from "~/utils/logger";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CameraActionRow({
  photoOutput,
  isCameraAvailable,
}: {
  photoOutput: CameraPhotoOutput;
  isCameraAvailable: boolean;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();
  const { processPantryItems, processImage, framePosition } = useCreateIngredientStore();

  const [isRecipeCooked] = useLocalStorageState(RECIPE_COOKED_KEY, {
    defaultValue: false,
  });

  // State for the image point picker overlay
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [showPointPicker, setShowPointPicker] = useState(false);

  // Camera and gallery functions
  const takePicture = async () => {
    log.info("[create-camera] shutter pressed", {
      isCameraAvailable,
      isRecipeCooked,
      frameX: framePosition.x,
      frameY: framePosition.y,
      pendingItems: processPantryItems.length,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isRecipeCooked) {
      log.info("[create-camera] paywall check before capture");
      const isPurchased = await presentPaywallIfNeeded();
      log.info("[create-camera] paywall result before capture", { isPurchased });
      if (!isPurchased) {
        return;
      }
    }

    if (!isCameraAvailable) {
      log.warn("[create-camera] capture skipped because camera is unavailable");
      return;
    }

    try {
      const captureStart = performance.now();
      log.info("[create-camera] capturePhotoToFile starting", {
        enableDepthData: false,
        enableShutterSound: true,
        flashMode: "off",
      });

      const photo = await photoOutput.capturePhotoToFile(
        {
          enableDepthData: false,
          enableShutterSound: true,
          flashMode: "off",
        },
        {}
      );
      const captureDuration = performance.now() - captureStart;

      log.info("[create-camera] capturePhotoToFile completed", {
        filePath: photo.filePath,
        hasFileUriScheme: photo.filePath.startsWith("file://"),
        inferredExtension: photo.filePath.split(".").pop() ?? "none",
        durationMs: Number(captureDuration.toFixed(2)),
      });

      processImage(photo.filePath, { ...framePosition });
    } catch (error) {
      log.error("[create-camera] capturePhotoToFile failed", error);
      toast.error("Error taking picture");
    }
  };

  const pickFromGallery = async () => {
    log.info("[create-camera] gallery button pressed", {
      isRecipeCooked,
      pendingItems: processPantryItems.length,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecipeCooked) {
      log.info("[create-camera] paywall check before gallery picker");
      const isPurchased = await presentPaywallIfNeeded();
      log.info("[create-camera] paywall result before gallery picker", { isPurchased });
      if (!isPurchased) {
        return;
      }
    }

    try {
      log.info("[create-camera] gallery picker starting");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      log.info("[create-camera] gallery picker completed", {
        canceled: result.canceled,
        assetCount: result.assets?.length ?? 0,
        firstUri: result.assets?.[0]?.uri ?? "none",
        firstMimeType: result.assets?.[0]?.mimeType ?? "unknown",
        firstWidth: result.assets?.[0]?.width ?? 0,
        firstHeight: result.assets?.[0]?.height ?? 0,
      });

      if (!result.canceled && result.assets?.[0]) {
        const selectedImage = result.assets[0];
        // Show point picker overlay so user can select the ingredient location
        setPickedImageUri(selectedImage.uri);
        setShowPointPicker(true);
      }
    } catch (error) {
      log.error("[create-camera] gallery picker failed", error);
      toast.error("Error picking from gallery");
    }
  };

  const handlePointConfirm = (point: { x: number; y: number }) => {
    log.info("[create-camera] gallery point confirmed", {
      hasPickedImageUri: !!pickedImageUri,
      pickedImageUri: pickedImageUri ?? "none",
      x: point.x,
      y: point.y,
    });

    if (pickedImageUri) {
      processImage(pickedImageUri, point);
    }
    setShowPointPicker(false);
    setPickedImageUri(null);
  };

  const handlePointCancel = () => {
    log.info("[create-camera] gallery point picker canceled");
    setShowPointPicker(false);
    setPickedImageUri(null);
  };

  const onConfirm = () => {
    log.info("[create-camera] save/confirm pressed", {
      itemCount: processPantryItems.length,
      processingCount: processPantryItems.filter((item) => item.status === "processing").length,
      failedCount: processPantryItems.filter((item) => item.status === "failed").length,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/ingredient/confirmation");
  };

  return (
    <View className="flex flex-row justify-between items-center px-8 pt-8">
      {/* Gallery Button */}
      <Button
        size="icon-lg"
        variant="ghost"
        className="rounded-full active:bg-white/10"
        onPress={pickFromGallery}
        accessibilityLabel="Pick from gallery"
      >
        <ImagesIcon className="text-white/80" size={24} />
      </Button>

      {/* Camera Shutter Button */}
      <AnimatedPressable
        className="w-20 h-20 rounded-full bg-white justify-center items-center border-4 border-gray-300"
        onPress={takePicture}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        disabled={!isCameraAvailable}
        accessibilityLabel="Take picture"
        accessibilityRole="button"
      >
        <View className="w-15 h-15 rounded-full bg-white border-2 border-gray-400" />
      </AnimatedPressable>

      {/* Save Button */}
      <Button
        size="icon-lg"
        variant="ghost"
        className="rounded-full active:bg-white/10"
        onPress={onConfirm}
        disabled={processPantryItems.length === 0}
        accessibilityLabel="Save and confirm"
      >
        <SaveIcon className="text-white/80" size={24} />
      </Button>

      {/* Image Point Picker Overlay for gallery images */}
      {pickedImageUri && (
        <ImagePointPickerOverlay
          imageUri={pickedImageUri}
          visible={showPointPicker}
          onConfirm={handlePointConfirm}
          onCancel={handlePointCancel}
        />
      )}
    </View>
  );
}
