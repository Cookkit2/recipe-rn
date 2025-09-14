import { useWindowDimensions, View } from "react-native";
import { useCameraStore } from "~/store/CameraContext";
import { P } from "~/components/ui/typography";

// Text labels overlay (using React Native views for easier text rendering)
const TextLabelsOverlay = () => {
  const { width } = useWindowDimensions();
  const { yoloResults: results, photoSize } = useCameraStore();
  const { width: imageWidth, height: imageHeight } = photoSize || {
    width: 0,
    height: 0,
  };

  const scaleX = width / imageWidth;
  const scaleY = width / imageHeight;

  return (
    <>
      {results?.detections.map((detection, index) => {
        const [x, y] = detection.bbox;
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;

        return (
          <View
            key={`label-${index}`}
            className="absolute bg-red-500 p-2 rounded-md"
            style={{
              left: scaledX,
              top: Math.max(0, scaledY - 25),
            }}
          >
            <P>
              {detection.className} ({Math.round(detection.confidence * 100)}%)
            </P>
          </View>
        );
      })}
    </>
  );
};

export default TextLabelsOverlay;
