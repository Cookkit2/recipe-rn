import React from "react";
import { View } from "react-native";
import type { Camera, Point } from "react-native-vision-camera";
import { useCameraStore } from "~/store/CameraContext";

interface FocusingAreaIndicatorProps {
  cameraRef: React.RefObject<Camera | null>;
}

export default function FocusingAreaIndicator({
  cameraRef,
}: FocusingAreaIndicatorProps) {
  const { framePosition, updateFramePosition } = useCameraStore();

  // Frame position state - default to center of screen

  // Handle touch on camera view to move frame
  const handleCameraTouch = (event: {
    nativeEvent: { locationX: number; locationY: number };
  }) => {
    const { locationX, locationY } = event.nativeEvent;
    const newPosition = { x: locationX - 48, y: locationY - 48 }; // Center the 96x96 frame on touch point
    updateFramePosition(newPosition);

    // Call the optional onTouch callback
    const point: Point = { x: locationX, y: locationY };
    cameraRef.current?.focus(point);
  };

  return (
    <>
      {/* Touch handler overlay */}
      <View
        className="absolute inset-0"
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleCameraTouch}
      />

      {/* Scanning Frame Overlay - positioned based on touch */}
      <View
        className="absolute w-24 h-24"
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
    </>
  );
}
