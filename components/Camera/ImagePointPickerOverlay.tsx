import React, { useState } from "react";
import { Modal, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { CheckIcon, XIcon } from "lucide-uniwind";
import { Button } from "../ui/button";
import { P } from "../ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import ScanFrame from "./ScanFrame";
import useOnPressScale from "~/hooks/animation/useOnPressScale";

interface ImagePointPickerOverlayProps {
  imageUri: string;
  visible: boolean;
  onConfirm: (point: { x: number; y: number }) => void;
  onCancel: () => void;
}

export default function ImagePointPickerOverlay({
  imageUri,
  visible,
  onConfirm,
  onCancel,
}: ImagePointPickerOverlayProps) {
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();

  // Image displayed in 3:4 aspect, same as camera view
  const imageDisplayHeight = (width * 4) / 3;

  // Default point at center of displayed image
  const [selectedPoint, setSelectedPoint] = useState<{
    x: number;
    y: number;
  }>({
    x: width / 2,
    y: imageDisplayHeight / 2,
  });

  const [hasSelected, setHasSelected] = useState(false);

  const handleTouch = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = event.nativeEvent;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPoint({ x: locationX, y: locationY });
    setHasSelected(true);
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(selectedPoint);
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasSelected(false);
    setSelectedPoint({
      x: width / 2,
      y: imageDisplayHeight / 2,
    });
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <Animated.View
        className="flex-1 bg-black"
        style={{ paddingTop: top }}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        {/* Header */}
        <View className="px-4 py-3 items-center">
          <P className="text-white font-urbanist-regular">Tap the ingredient to identify</P>
        </View>

        {/* Image with touch handler */}
        <View className="relative bg-black" style={{ width, height: imageDisplayHeight }}>
          <Image
            source={{ uri: imageUri }}
            style={{ width, height: imageDisplayHeight }}
            contentFit="contain"
          />

          <View
            className="absolute inset-0"
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleTouch}
          />

          <ScanFrame x={selectedPoint.x} y={selectedPoint.y} />
        </View>

        {/* Action Buttons */}
        <View
          className="flex-1 justify-center items-center px-8 gap-3"
          style={{ paddingBottom: bottom }}
        >
          <ConfirmButton onPress={handleConfirm} />

          <CancelButton onPress={handleCancel} />
        </View>
      </Animated.View>
    </Modal>
  );
}

function ConfirmButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();

  return (
    <Animated.View style={animatedStyle}>
      <Button
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        enableAnimation={false}
        className="w-full rounded-full bg-white py-4"
        containerClassName="overflow-hidden"
      >
        <View className="flex-row items-center justify-center gap-2">
          <CheckIcon className="text-black" size={20} />
          <P className="text-black text-base font-urbanist-bold">Confirm Selection</P>
        </View>
      </Button>
    </Animated.View>
  );
}

function CancelButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();

  return (
    <Animated.View style={animatedStyle}>
      <Button
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        enableAnimation={false}
        variant="ghost"
        className="w-full rounded-full py-4"
        containerClassName="overflow-hidden"
      >
        <View className="flex-row items-center justify-center gap-2">
          <XIcon className="text-white/70" size={18} />
          <P className="text-white/70 text-base font-urbanist-regular">Cancel</P>
        </View>
      </Button>
    </Animated.View>
  );
}
