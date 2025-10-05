import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  type CameraPosition,
  useCameraPermission,
} from "react-native-vision-camera";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  StyleSheet,
  View,
  Alert,
  Linking,
  Platform,
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
  RefreshCcwIcon,
  XIcon,
} from "lucide-nativewind";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SystemBars } from "react-native-edge-to-edge";
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
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { toast } from "sonner-native";
import { CURVES } from "~/constants/curves";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import {
  type SkImage,
  Image as SkiaImage,
  Canvas,
  Fill,
} from "@shopify/react-native-skia";
import * as FileSystem from "expo-file-system";
import type { PantryItemConfirmation } from "~/types/PantryItem";
import type { Prettify } from "~/utils/type-prettier";
import * as Haptics from "expo-haptics";
import { titleCase } from "~/utils/text-formatter";
import { loadImageIntoSkia } from "~/hooks/model/processImage";
import { classifyStaticImage } from "~/hooks/model/classifyModel";
import { useAsyncEffect } from "~/utils/use-async-effect";
import { storage } from "~/data";
import { RECIPE_COOKED_KEY } from "~/constants/storage-keys";
import { presentPaywallIfNeeded } from "~/utils/subscription-utils";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const THUMBNAIL_SIZE = 32;
const CAMERA_RESOLUTION = { width: 3024, height: 4032 };

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

  const [facing, setFacing] = useState<CameraPosition>("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [hasAskedPermission, setHasAskedPermission] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImageSk, setCapturedImageSk] = useState<SkImage | null>(null);

  const [isSegmentingImage, startTransition] = useTransition();
  const [segmentedImage, setSegmentedImage] = useState<SegmentedImage | null>(
    null
  );

  const device = useCameraDevice(facing);
  const isCameraAvailable = !!device;
  const isRecipeCooked = storage.get(RECIPE_COOKED_KEY) === true;

  const { processPantryItems, addProcessPantryItems, framePosition } =
    useCreateIngredientStore();

  const format = useCameraFormat(device, [
    { photoResolution: CAMERA_RESOLUTION },
    { videoResolution: CAMERA_RESOLUTION },
  ]);

  const capturedImageOpacityValue = useSharedValue(0);
  const greyBackgroundOpacityValue = useSharedValue(0);

  useEffect(() => {
    // Push a new system bar style when the screen mounts
    const entry = SystemBars.pushStackEntry({
      style: "light",
    });

    // Pop it back when leaving (to restore previous settings)
    return () => {
      SystemBars.popStackEntry(entry);
    };
  }, []);

  useEffect(() => {
    if (!hasPermission && !hasAskedPermission) {
      requestPermission();
      setHasAskedPermission(true);
    }
  }, [hasPermission, requestPermission, hasAskedPermission]);

  useAsyncEffect(
    async () => {
      if (!capturedImageSk) return;
      const content = await classifyStaticImage(capturedImageSk);
      setSegmentedImage((prev) => (prev ? { ...prev, ...content } : null));
    },
    async () => {},
    [capturedImageSk]
  );

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
          processImage(photo.path);
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
        const selectedImage = result.assets[0];
        processImage(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
      toast.error("Error picking from gallery");
    }
  };

  const processImage = (imagePath: string) => {
    setCapturedImage(imagePath);
    capturedImageOpacityValue.value = 1;

    // Normalize the frame position to the image size
    const normalizedFramePosition = {
      x: (framePosition.x / width) * CAMERA_RESOLUTION.width,
      y: (framePosition.y / ((width * 4) / 3)) * CAMERA_RESOLUTION.height,
    };

    startTransition(async () => {
      const skImage = await loadImageIntoSkia(imagePath);
      setCapturedImageSk(skImage);

      if (!skImage) {
        toast.error("Failed to load image");
        return;
      }

      // Process the photo for segmentation
      const segmentedImage = await segmentStaticImage(
        skImage,
        normalizedFramePosition
      );

      const result: SegmentedImage = {
        ...segmentedImage,
        name: "",
        quantity: 1,
        unit: "unit",
      };

      setSegmentedImage(result);

      setTimeout(() => {
        capturedImageOpacityValue.value = withTiming(
          0,
          CURVES["expressive.fast.effects"]
        );
      }, 200);
      setTimeout(() => {
        greyBackgroundOpacityValue.value = withTiming(
          1,
          CURVES["expressive.fast.effects"]
        );
      }, 100);
    });
  };

  const confirmSegmentedImage = () => {
    if (!segmentedImage) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const filename = `masked-${Date.now()}.png`;
    const outPath = `${FileSystem.cacheDirectory || ""}${filename}`;

    resetImage();

    // Write to cache asynchronously for better performance
    startTransition(async () => {
      const { finalImage: trimmedImage } = trimTransparentBorders(
        segmentedImage.skImage,
        2
      );

      // Downscale to ~350px width to reduce file size, keep alpha
      const { base64: resizedBase64 } = resizeImagePreserveAlpha(
        trimmedImage,
        300
      );

      await FileSystem.writeAsStringAsync(outPath, resizedBase64 ?? "", {
        encoding: FileSystem.EncodingType.Base64,
      });

      addProcessPantryItems({
        name: titleCase(segmentedImage.name),
        quantity: segmentedImage.quantity,
        image_url: outPath,
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
    setCapturedImage(null);
    setCapturedImageSk(null);

    greyBackgroundOpacityValue.value = withTiming(
      0,
      CURVES["expressive.fast.effects"]
    );
  };

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

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

  if (!hasPermission) {
    // Camera permissions are not granted yet.
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
            Place the item in the frame
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
            enableZoomGesture
            enableDepthData={false}
            isActive={capturedImage || segmentedImage ? false : true}
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
          <Fill
            color={segmentedImage?.background_color}
            opacity={greyBackgroundOpacityValue}
          />
          <SkiaImage
            image={capturedImageSk}
            x={0}
            y={0}
            opacity={capturedImageOpacityValue}
            width={width}
            height={(width / 3) * 4}
            fit="contain"
          />
          {segmentedImage && (
            <SkiaImage
              image={segmentedImage?.skImage}
              x={0}
              y={0}
              width={width}
              height={(width / 3) * 4}
              fit="contain"
            />
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

        {isCameraAvailable && !capturedImageSk && (
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
            disabled={isSegmentingImage}
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
            disabled={!isCameraAvailable || isSegmentingImage}
          >
            {isSegmentingImage ? (
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
            onPress={toggleCameraFacing}
            disabled={!isCameraAvailable || isSegmentingImage}
          >
            <RefreshCcwIcon className="text-white/80" size={24} />
          </Button>
        </View>
      )}
    </View>
  );
}
