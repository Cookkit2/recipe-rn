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
import type { Camera } from "react-native-vision-camera";
import Animated from "react-native-reanimated";
import ImagePointPickerOverlay from "./ImagePointPickerOverlay";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CameraActionRow({
  camera,
  isCameraAvailable,
}: {
  camera: React.RefObject<Camera | null>;
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isRecipeCooked) {
      const isPurchased = await presentPaywallIfNeeded();
      if (!isPurchased) {
        return;
      }
    }

    if (camera.current) {
      try {
        const photo = await camera.current.takePhoto();

        if (photo?.path) {
          processImage(photo.path, { ...framePosition });
        }
      } catch (error) {
        toast.error("Error taking picture");
      }
    }
  };

  const pickFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecipeCooked) {
      const isPurchased = await presentPaywallIfNeeded();
      if (!isPurchased) {
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const selectedImage = result.assets[0];
        // Show point picker overlay so user can select the ingredient location
        setPickedImageUri(selectedImage.uri);
        setShowPointPicker(true);
      }
    } catch (error) {
      toast.error("Error picking from gallery");
    }
  };

  const handlePointConfirm = (point: { x: number; y: number }) => {
    if (pickedImageUri) {
      processImage(pickedImageUri, point);
    }
    setShowPointPicker(false);
    setPickedImageUri(null);
  };

  const handlePointCancel = () => {
    setShowPointPicker(false);
    setPickedImageUri(null);
  };

  const onConfirm = () => {
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
        accessibilityLabel="Save ingredients"
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
