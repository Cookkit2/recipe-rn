import type { SkImage } from "@shopify/react-native-skia";
import { useState } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
} from "react-native-reanimated";

export default function useAnimatingImages({
  THUMBNAIL_SIZE,
}: {
  THUMBNAIL_SIZE: number;
}) {
  // Animation values for image transition
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingImageSk, setAnimatingImageSk] = useState<SkImage | null>(
    null
  );
  const animatingImageOpacity = useSharedValue(0);
  const animatingImageScale = useSharedValue(1);
  const animatingImageX = useSharedValue(0);
  const animatingImageY = useSharedValue(0);

  // Animated style for the flying image
  const animatingImageStyle = useAnimatedStyle(() => ({
    opacity: animatingImageOpacity.value,
    transform: [
      { translateX: animatingImageX.value },
      { translateY: animatingImageY.value },
      { scale: animatingImageScale.value },
    ],
  }));

  const startAnimatingImage = (image: SkImage, width: number, top: number) => {
    // Start the animation
    setIsAnimating(true);
    setAnimatingImageSk(image);
    animatingImageOpacity.value = 1;
    // Animation coordinate system explanation:
    // - Container is positioned at: top + 64 (absolute position)
    // - Image starts at center of container: cameraHeight / 2 (relative to container)
    // - We need to calculate relative movement from container origin to target
    const cameraHeight = (width / 3) * 4;
    const imageStartCenterY = cameraHeight / 2; // Center of image within container
    // Target position: header thumbnail center (global coordinates)
    const headerThumbnailCenter = top + 32; // top + padding(16) + thumbnail_center(16)
    // Container starts at top + 64, so target relative to container is:
    const containerTop = top + 64;
    const targetY = headerThumbnailCenter - containerTop - imageStartCenterY;
    const targetX = -(width / 2) + 24 + 8; // Move to left side of screen + padding + half thumbnail
    const targetScale = THUMBNAIL_SIZE / width; // Scale down from full width to thumbnail size (32px)
    // Reset initial position
    animatingImageX.value = 0;
    animatingImageY.value = 0;
    animatingImageScale.value = 1;
    // Animate to target position
    animatingImageX.value = withTiming(targetX, { duration: 500 });
    animatingImageY.value = withTiming(targetY, { duration: 500 });
    animatingImageScale.value = withTiming(targetScale, { duration: 500 });
    // Hide the center image immediately and add to processed images after delay
    // setSegmentedImage(null);
    // setCapturedImage(null);
    // setIsGreyBackgroundHidden(true);

    // Add to processed images after animation starts
    setTimeout(() => {
      //   updateProcessedImages(segmentedImage);
      // Hide the animating image after animation completes
      setTimeout(() => {
        animatingImageOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(setIsAnimating)(false);
          runOnJS(setAnimatingImageSk)(null);
        });
      }, 400);
    }, 200);
  };

  {
    /* Animating Image for Transition */
  }
  {
    /* {isAnimating && animatingImageSk && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: top + 64, // Start at camera view top
              left: 0,
              width: width,
              height: (width / 3) * 4,
              zIndex: 1000,
            },
            animatingImageStyle,
          ]}
          pointerEvents="none"
        >
          <Canvas style={{ width: width, height: (width / 3) * 4 }}>
            <SkiaImage
              image={animatingImageSk}
              x={0}
              y={0}
              width={width}
              height={(width / 3) * 4}
              fit="contain"
            />
          </Canvas>
        </Animated.View>
      )} */
  }
}
