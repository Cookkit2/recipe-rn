import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Skia, Path, Group } from "@shopify/react-native-skia";
import { toast } from "sonner-native";
import { useCameraStore } from "~/store/CameraContext";

const SegmentationMasksOverlay = () => {
  const { width } = useWindowDimensions();
  const { yoloResults: results, photoSize } = useCameraStore();
  const { width: imageWidth, height: imageHeight } = photoSize || {
    width: 0,
    height: 0,
  };

  // Calculate scaling factors
  const scaleX = width / imageWidth;
  const scaleY = width / imageHeight;

  if (!results?.masks || results?.masks.length === 0) {
    console.log("No masks to render");
    return null;
  }

  console.log(
    `Rendering ${results?.masks.length} masks for ${results?.detections.length} detections`
  );

  return (
    <Canvas style={[StyleSheet.absoluteFill]}>
      {results.masks.map((mask, index) => {
        const detection = results.detections[index];
        if (!detection) {
          console.log(`No detection for mask ${index}`);
          return null;
        }

        console.log(
          `Rendering mask ${mask.mask.length} for detection: ${detection.className}`
        );
        console.log(
          `Mask data: ${mask.width}x${mask.height}, ${mask.mask.length} bytes`
        );

        const [x, y, w, h] = detection.bbox;

        // Scale coordinates to container size
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = w * scaleX;
        const scaledHeight = h * scaleY;

        console.log(
          `Scaled bbox: ${scaledX.toFixed(1)}, ${scaledY.toFixed(
            1
          )}, ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}`
        );

        try {
          // Create contour path from mask data
          const contourPath = createMaskContourPath(mask);
          console.log(
            `Contour path created: ${contourPath ? "success" : "failed"}`,
            contourPath
          );

          if (!contourPath) {
            console.log("No contour path created");
            return null;
          }

          // Render the actual contour mask using Path
          return (
            <Group
              key={`mask-${index}`}
              transform={[
                { translateX: scaledX },
                { translateY: scaledY },
                { scaleX: scaledWidth / mask.width },
                { scaleY: scaledHeight / mask.height },
              ]}
            >
              <Path
                path={contourPath}
                color="rgba(255, 255, 255, 0.7)"
                style="fill"
              />
              <Path
                path={contourPath}
                color="rgba(0, 255, 0, 0.8)"
                style="stroke"
                strokeWidth={2}
              />
            </Group>
          );
        } catch (error) {
          toast.error("Error rendering mask");
          console.error("Error in mask rendering:", error);
          return null;
        }
      })}
    </Canvas>
  );
};

export default SegmentationMasksOverlay;

// Create contour path from mask data and render it using Skia Path
const createMaskContourPath = (mask: {
  mask: Uint8Array;
  width: number;
  height: number;
  color: string;
}) => {
  try {
    console.log(
      `Creating contour path from mask: ${mask.width}x${mask.height}`
    );

    const path = Skia.Path.Make();
    const threshold = 128; // Threshold for mask pixels

    // Find contour points using a simple edge detection approach
    const contourPoints: { x: number; y: number }[] = [];

    // Sample the mask at lower resolution for performance
    const sampleRate = Math.max(
      1,
      Math.floor(Math.min(mask.width, mask.height) / 50)
    );

    for (let y = 0; y < mask.height; y += sampleRate) {
      for (let x = 0; x < mask.width; x += sampleRate) {
        const index = y * mask.width + x;
        if (index < mask.mask.length && (mask.mask[index] ?? 0) > threshold) {
          // Check if this is an edge pixel (has a neighbor that's background)
          const isEdge = checkIfEdgePixel(mask, x, y, threshold);
          if (isEdge) {
            contourPoints.push({ x, y });
          }
        }
      }
    }

    console.log(`Found ${contourPoints.length} contour points`);

    if (contourPoints.length > 0) {
      // Sort points to create a rough contour
      const sortedPoints = sortContourPoints(contourPoints);

      // Create path from sorted points
      if (sortedPoints.length > 0 && sortedPoints[0]) {
        path.moveTo(sortedPoints[0].x, sortedPoints[0].y);
        for (let i = 1; i < sortedPoints.length; i++) {
          const point = sortedPoints[i];
          if (point) {
            path.lineTo(point.x, point.y);
          }
        }
        path.close();
      }
    }

    return contourPoints.length > 10 ? path : null; // Only return if we have enough points
  } catch (error) {
    console.error("Error creating contour path:", error);
    return null;
  }
};

// Check if a pixel is on the edge of the mask
const checkIfEdgePixel = (
  mask: { mask: Uint8Array; width: number; height: number },
  x: number,
  y: number,
  threshold: number
): boolean => {
  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]; // left, right, up, down

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (nx >= 0 && nx < mask.width && ny >= 0 && ny < mask.height) {
      const neighborIndex = ny * mask.width + nx;
      if (
        neighborIndex < mask.mask.length &&
        (mask.mask[neighborIndex] ?? 0) <= threshold
      ) {
        return true; // Has a background neighbor, so it's an edge
      }
    }
  }
  return false;
};

// Sort contour points to create a connected path
const sortContourPoints = (
  points: { x: number; y: number }[]
): { x: number; y: number }[] => {
  if (points.length <= 1) return points;

  const firstPoint = points[0];
  if (!firstPoint) return [];

  const sorted: { x: number; y: number }[] = [firstPoint];
  const remaining = points.slice(1);

  while (remaining.length > 0 && sorted.length < 100) {
    // Limit to prevent infinite loops
    const current = sorted[sorted.length - 1];
    if (!current) break;

    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const point = remaining[i];
      if (point) {
        const distance = Math.hypot(current.x - point.x, current.y - point.y);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }
    }

    const closestPoint = remaining[closestIndex];
    if (closestPoint) {
      sorted.push(closestPoint);
    }
    remaining.splice(closestIndex, 1);
  }

  return sorted;
};

// All mask processing functions are now complete
