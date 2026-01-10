import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from "react-native-vision-camera";
import {
  useEffect,
  useRef,
  useState,
  startTransition,
  useTransition,
} from "react";
import {
  StyleSheet,
  View,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import FocusingAreaIndicator from "~/components/Camera/FocusingAreaIndicator";
import * as ImagePicker from "expo-image-picker";
import { H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { useRouter } from "expo-router";
import {
  CameraIcon,
  CheckIcon,
  ImagesIcon,
  XIcon,
  SaveIcon,
} from "lucide-nativewind";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  segmentStaticImage,
  trimTransparentBorders,
  resizeImagePreserveAlpha,
} from "~/hooks/model/segmentModel";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import Animated, {
  BounceIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { toast } from "sonner-native";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import {
  type SkImage,
  Image as SkiaImage,
  Canvas,
  Fill,
} from "@shopify/react-native-skia";
import { File, Paths } from "expo-file-system";
import type { PantryItemConfirmation } from "~/types/PantryItem";
import type { Prettify } from "~/utils/type-prettier";
import * as Haptics from "expo-haptics";
import { titleCase } from "~/utils/text-formatter";
import { loadImageIntoSkia } from "~/hooks/model/processImage";
import { classifyStaticImage } from "~/hooks/model/classifyModel";
import { storage } from "~/data";
import {
  RECIPE_COOKED_KEY,
  CAMERA_ONBOARDING_COMPLETED_KEY,
} from "~/constants/storage-keys";
import { presentPaywallIfNeeded } from "~/utils/subscription-utils";
import { setStatusBarStyle } from "expo-status-bar";
import CameraOnboardingSheet from "~/components/Camera/CameraOnboardingSheet";
import useLocalStorageState from "~/hooks/useLocalStorageState";
import { useCameraPermissions } from "~/hooks/useCameraPermissions";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const THUMBNAIL_SIZE = 32;
export const CAMERA_RESOLUTION = { width: 3024, height: 4032 };

export type SegmentedImage = Prettify<
  Omit<PantryItemConfirmation, "id" | "image_url"> & {
    skImage: SkImage;
  }
>;

export default function CreateIngredient() {
  const router = useRouter();
  const { bottom, top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();

  const camera = useRef<Camera>(null);

  const { hasPermission, handlePermissionRequest } = useCameraPermissions();

  const [segmentedImage, setSegmentedImage] = useState<SegmentedImage | null>(
    null
  );
  const [showOnboarding, setShowOnboarding] = useLocalStorageState(
    CAMERA_ONBOARDING_COMPLETED_KEY,
    { defaultValue: false }
  );

  const [isRecipeCooked] = useLocalStorageState(RECIPE_COOKED_KEY, {
    defaultValue: false,
  });

  const device = useCameraDevice("back");
  const isCameraAvailable = !!device;

  const {
    processPantryItems,
    addProcessPantryItems,
    processImage,
    updateFramePosition,
  } = useCreateIngredientStore();

  const format = useCameraFormat(device, [
    { photoResolution: CAMERA_RESOLUTION },
    { videoResolution: CAMERA_RESOLUTION },
  ]);

  const [isProcessingImage, startProcessingImage] = useTransition();

  useEffect(() => {
    setStatusBarStyle("light", true);
    return () => setStatusBarStyle("auto", true);
  }, []);

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
          startProcessingImage(async () => {
            const result = await processImage(photo.path);
            if (result) {
              setSegmentedImage(result);
            }
          });
        }
      } catch (error) {
        console.error("Error taking picture:", error);
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
        // Reset focus point to center when picking from gallery
        const cameraHeight = (width * 4) / 3;
        updateFramePosition({
          x: width / 2,
          y: cameraHeight / 2,
        });

        const selectedImage = result.assets[0];

        startProcessingImage(async () => {
          const result = await processImage(selectedImage.uri);
          if (result) {
            setSegmentedImage(result);
          }
        });
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
      toast.error("Error picking from gallery");
    }
  };

  const confirmSegmentedImage = () => {
    if (!segmentedImage) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const filename = `masked-${Date.now()}.png`;
    const file = new File(Paths.cache, filename);

    resetImage();

    startTransition(() => {
      // Write to cache asynchronously for better performance
      const { finalImage: trimmedImage } = trimTransparentBorders(
        segmentedImage.skImage,
        2
      );

      // Downscale to ~350px width to reduce file size, keep alpha
      const { base64 } = resizeImagePreserveAlpha(trimmedImage, 300);

      file.write(base64, {
        encoding: "base64",
      });

      addProcessPantryItems({
        name: titleCase(segmentedImage.name),
        quantity: segmentedImage.quantity,
        image_url: file.uri,
        background_color: segmentedImage.background_color,
        unit: segmentedImage.unit,
      });
    });
  };

  const cancelSegmentedImage = () => {
    resetImage();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const resetImage = () => {
    setSegmentedImage(null);
  };

  const onConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      router.push("/ingredient/confirmation");
    } catch (error) {
      console.error("Error confirming:", error);
      toast.error("Error confirming");
    }
  };

  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleOnboardingComplete = () => {
    storage.set(CAMERA_ONBOARDING_COMPLETED_KEY, true);
    setShowOnboarding(false);
  };

  const handleOnboardingClose = () => {
    // Close without saving - will show again next time
    setShowOnboarding(false);
  };

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
    <View
      className="flex-1 bg-black"
      style={{ paddingTop: top, paddingBottom: bottom }}
    >
      {/* HEADER */}
      <View className="w-full flex flex-row justify-between items-center py-4">
        {processPantryItems.length === 0 && (
          <P className="text-white pl-4 font-urbanist-regular">
            Logged ingredients will appear here
          </P>
        )}
        <Animated.FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-1 pl-4"
          fadingEdgeLength={10}
          data={processPantryItems}
          itemLayoutAnimation={LinearTransition.springify()
            .damping(15)
            .mass(1)
            .stiffness(150)
            .overshootClamping(0)}
          renderItem={({ item }) => (
            <AnimatedPressable
              key={item.id}
              entering={BounceIn.springify()
                .damping(15)
                .mass(1)
                .stiffness(150)
                .overshootClamping(0)}
              onPress={onConfirm}
              className="ml-3"
            >
              <Image
                source={item.image_url}
                style={[{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }]}
                contentFit="contain"
                contentPosition="center"
              />
            </AnimatedPressable>
          )}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          className="rounded-full mx-4"
          onPress={onBack}
        >
          <XIcon className="text-white" size={20} />
        </Button>
      </View>

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
            isActive={!segmentedImage && !isProcessingImage}
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

        <Canvas
          style={[
            StyleSheet.absoluteFill,
            { width: width, height: (width / 3) * 4 },
          ]}
        >
          {segmentedImage && (
            <>
              <Fill color={segmentedImage.background_color} />
              <SkiaImage
                image={segmentedImage.skImage}
                x={0}
                y={0}
                width={width}
                height={(width / 3) * 4}
                fit="contain"
              />
            </>
          )}
        </Canvas>

        <View className="absolute bottom-16 left-0 right-0 flex-row items-center justify-center">
          {segmentedImage?.name && (
            <Animated.View
              className="rounded-full bg-primary shadow-sm px-4 pt-2 pb-[3]"
              entering={BounceIn.springify()
                .damping(15)
                .mass(1)
                .stiffness(150)
                .overshootClamping(0)}
              exiting={FadeOut.duration(200)}
            >
              <H4 className="font-bowlby-one text-primary-foreground">
                {segmentedImage.name}
              </H4>
            </Animated.View>
          )}
        </View>

        {isCameraAvailable && !segmentedImage && (
          <FocusingAreaIndicator cameraRef={camera} />
        )}
      </View>

      {segmentedImage ? (
        <View className="flex flex-row justify-center items-center px-8 pt-8 gap-8">
          <Button
            size="icon-lg"
            variant="ghost"
            className="rounded-full active:bg-white/10"
            onPress={cancelSegmentedImage}
          >
            <XIcon className="text-white/80" size={24} />
          </Button>

          <AnimatedPressable
            className="w-20 h-20 rounded-full bg-white justify-center items-center border-4 border-gray-300"
            onPress={confirmSegmentedImage}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={animatedStyle}
            disabled={segmentedImage.name.trim() === ""}
          >
            {segmentedImage.name.trim() === "" ? (
              <ActivityIndicator size="small" className="text-black" />
            ) : (
              <CheckIcon className="text-black" size={24} />
            )}
          </AnimatedPressable>
        </View>
      ) : (
        <View className="flex flex-row justify-between items-center px-8 pt-8">
          {/* Gallery Button */}
          <Button
            size="icon-lg"
            variant="ghost"
            className="rounded-full active:bg-white/10"
            onPress={pickFromGallery}
            disabled={isProcessingImage}
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
            disabled={!isCameraAvailable || isProcessingImage}
          >
            {isProcessingImage ? (
              <ActivityIndicator size="small" className="text-black" />
            ) : (
              <View className="w-15 h-15 rounded-full bg-white border-2 border-gray-400" />
            )}
          </AnimatedPressable>

          {/* Flip Camera Button */}
          <Button
            size="icon-lg"
            variant="ghost"
            className="rounded-full active:bg-white/10"
            onPress={onConfirm}
            disabled={
              !isCameraAvailable ||
              isProcessingImage ||
              processPantryItems.length === 0
            }
          >
            <SaveIcon className="text-white/80" size={24} />
          </Button>
        </View>
      )}

      {/* Camera Onboarding Sheet */}
      <CameraOnboardingSheet
        visible={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </View>
  );
}
