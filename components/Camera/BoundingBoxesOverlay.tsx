import { Canvas, Paint, Rect } from "@shopify/react-native-skia";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useCameraStore } from "~/store/CameraContext";
import useColors from "~/hooks/useColor";

const BoundingBoxesOverlay = () => {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { yoloResults: results, photoSize } = useCameraStore();
  const { width: imageWidth, height: imageHeight } = photoSize || {
    width: 0,
    height: 0,
  };

  // Calculate scaling factors to map from image coordinates to container coordinates
  const scaleX = width / imageWidth;
  const scaleY = width / imageHeight;

  return (
    <Canvas style={[StyleSheet.absoluteFill]}>
      {results?.detections.map((detection, index) => {
        const [x, y, w, h] = detection.bbox;

        // Scale coordinates to container size
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = w * scaleX;
        const scaledHeight = h * scaleY;

        return (
          <Rect
            key={`detection-${index}`}
            x={scaledX}
            y={scaledY}
            width={scaledWidth}
            height={scaledHeight}
            color="transparent"
            style="stroke"
            strokeWidth={3}
          >
            <Paint color={colors.primary} style="stroke" strokeWidth={3} />
          </Rect>
        );
      })}
    </Canvas>
  );
};

export default BoundingBoxesOverlay;
