import React, { useState, useEffect, useCallback } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Button } from "~/components/ui/button";
import * as ImagePicker from "expo-image-picker";
import {
  Canvas,
  Group,
  Image,
  Rect,
  rect,
  useImage,
  interpolate,
  Extrapolate,
} from "@shopify/react-native-skia";
import {
  type SharedValue,
  useSharedValue,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";

export default function Dissolve() {
  const { width, height } = useWindowDimensions();

  // States
  const [animationReady, setAnimationReady] = useState(false);
  const [dissolve, setDissolve] = useState(false);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [pixelPositions, setPixelPositions] = useState<
    Array<{ x: number; y: number; delay: number }>
  >([]);

  const image = useImage(pickedImage);

  // Animation value
  const progress = useSharedValue(0);

  // Canvas dimensions for the image
  const canvasSize = width;
  const pixelSize = 2; // Size of each "pixel" square
  const pixelsPerRow = Math.floor(canvasSize / pixelSize);
  const pixelsPerCol = Math.floor(canvasSize / pixelSize);
  
  // Sampling rate to reduce number of rectangles for performance
  const sampleRate = 3; // Only use every 3rd pixel for better performance

  // Background color based on theme
  const backgroundColor = "#000000";

  // Generate random pixel positions when image is loaded
  useEffect(() => {
    if (image) {
      const positions = [];

      // Create array of sampled pixel positions for better performance
      for (let row = 0; row < pixelsPerCol; row += sampleRate) {
        for (let col = 0; col < pixelsPerRow; col += sampleRate) {
          positions.push({
            x: col * pixelSize,
            y: row * pixelSize,
            delay: Math.random(), // Random delay between 0 and 1
          });
        }
      }

      setPixelPositions(positions);
      setAnimationReady(true);
    }
  }, [image, canvasSize, pixelsPerCol, pixelsPerRow, sampleRate]);

  const pickFromGallery = async () => {
    try {
      setAnimationReady(false);
      setDissolve(false);
      progress.value = 0;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.2,
      });

      if (!result.canceled && result.assets?.[0]) {
        const selectedImage = result.assets[0];
        setPickedImage(selectedImage.uri);
      }
    } catch {
      // Handle error silently or show user feedback
    }
  };

  const startDissolve = () => {
    if (!dissolve) {
      setDissolve(true);
      // Animate from 0 to 1 over 600ms for faster effect
      progress.value = withTiming(1, { duration: 600 });
    } else {
      setDissolve(false);
      // Animate back to 0 to restore image
      progress.value = withTiming(0, { duration: 600 });
    }
  };

  // Render background-colored rectangles based on progress
  const renderPixelMask = useCallback(() => {
    if (!pixelPositions.length) return null;

    return pixelPositions.map((pixel, index) => {
      return (
        <PixelSquare
          key={index}
          x={pixel.x}
          y={pixel.y}
          size={pixelSize}
          progress={progress}
          pixel={pixel}
          backgroundColor={backgroundColor}
        />
      );
    });
  }, [pixelPositions, progress, backgroundColor]);

  return (
    <View className="flex-1 items-center justify-center">
      <Canvas style={{ width: width, height: height - 320 }}>
        <Group>
          {/* Original image */}
          <Image
            image={image}
            fit="contain"
            rect={rect(0, 0, canvasSize, canvasSize)}
          />

          {/* Background-colored rectangles for dissolve effect */}
          {dissolve && pixelPositions.length > 0 && renderPixelMask()}
        </Group>
      </Canvas>

      <View className="flex-row mb-12 gap-4">
        <Button onPress={pickFromGallery}>
          <Text>Pick Image</Text>
        </Button>

        <Button disabled={!animationReady} onPress={startDissolve}>
          <Text>{dissolve ? "Restore" : "Dissolve"}</Text>
        </Button>
      </View>
    </View>
  );
}

const PixelSquare = ({
  x,
  y,
  size,
  progress,
  pixel,
  backgroundColor,
}: {
  x: number;
  y: number;
  size: number;
  progress: SharedValue<number>;
  pixel: { x: number; y: number; delay: number };
  backgroundColor: string;
}) => {
  // Calculate if this pixel should be visible based on progress and its delay
  const pixelOpacity = useDerivedValue(() => {
    // Only show the rectangle when progress reaches this pixel's delay time
    if (progress.value >= pixel.delay) {
      const adjustedProgress = progress.value - pixel.delay;
      return interpolate(
        adjustedProgress,
        [0, 0.05], // Rectangle appears very quickly once its time comes
        [0, 1],
        Extrapolate.CLAMP
      );
    }
    return 0; // Not visible until its delay time is reached
  });

  return (
    <Group opacity={pixelOpacity}>
      <Rect x={x} y={y} width={size} height={size} color={backgroundColor} />
    </Group>
  );
};
