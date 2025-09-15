interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  classId: number;
  className: string;
}

const MODEL_INPUT_SIZE: [number, number] = [640, 640];

export function postprocessOutputsYolo(
  outputs: Float32Array[] | undefined,
  originalShape: [number, number], // [height, width]
  inputSize: [number, number] = MODEL_INPUT_SIZE,
  confThreshold: number = 0.25
): Detection[] {
  if (!outputs || outputs.length === 0) {
    return [];
  }
  // YOLO v8/v11 outputs are typically [84, 8400]
  // where 84 = 4 (bbox) + 80 (classes)

  const detections: Detection[] = [];

  // Handle single output tensor
  const output = outputs?.[0]; // Shape should be [84 * 8400] flattened

  // Reshape to [84, 8400] if needed
  const outputHeight = 84;
  const outputWidth = 8400;

  // REMOVE HERE
  // // For YOLO v8/v11 format: transpose from [84, 8400] to [8400, 84]
  // const transposed: number[][] = [];
  // for (let i = 0; i < outputWidth; i++) {
  //   const detection: number[] = [];
  //   for (let j = 0; j < outputHeight; j++) {
  //     detection.push(output?.[j * outputWidth + i] ?? 0);
  //   }
  //   transposed.push(detection);
  // }

  // // Scale factors for converting back to original image size
  // const scaleX = originalShape[1] / inputSize[0]; // width scale
  // const scaleY = originalShape[0] / inputSize[1]; // height scale

  // // Process each detection
  // for (const detection of transposed) {
  //   if (detection.length >= 84) {
  //     // YOLO v8/v11 format: 4 bbox + 80 classes
  //     const [xCenter, yCenter, width, height] = detection.slice(0, 4);

  //     if (!xCenter || !yCenter || !width || !height) {
  //       continue;
  //     }

  //     const classScores = detection.slice(4); // 80 class scores

  //     // Find the class with highest score
  //     const maxClassScore = Math.max(...classScores);

  //     if (maxClassScore > confThreshold) {
  //       const classId = classScores.indexOf(maxClassScore);

  //       // Convert from normalized coordinates to pixel coordinates
  //       // YOLO outputs are in normalized format [0, 1]
  //       const xCenterPixel = xCenter * inputSize[0] * scaleX;
  //       const yCenterPixel = yCenter * inputSize[1] * scaleY;
  //       const widthPixel = width * inputSize[0] * scaleX;
  //       const heightPixel = height * inputSize[1] * scaleY;

  //       // Convert from center format to corner format
  //       const x1 = xCenterPixel - widthPixel / 2;
  //       const y1 = yCenterPixel - heightPixel / 2;
  //       const x2 = xCenterPixel + widthPixel / 2;
  //       const y2 = yCenterPixel + heightPixel / 2;

  //       detections.push({
  //         bbox: [x1, y1, x2, y2],
  //         confidence: maxClassScore,
  //         classId: classId,
  //         className: CLASS_NAMES[classId] ?? "",
  //       });
  //     }
  //   }
  // }

  // UNTIL HERE

  // Instead of transposing, process each detection directly from the flat output array
  // Scale factors for converting back to original image size
  const scaleX = originalShape[1] / inputSize[0]; // width scale
  const scaleY = originalShape[0] / inputSize[1]; // height scale
  // Process each detection directly from the flat output array
  for (let i = 0; i < outputWidth; i++) {
    // Each detection is 84 values: [x, y, w, h, ...class scores]
    // const base = i;
    // Extract bbox
    const xCenter = output?.[0 * outputWidth + i] ?? 0;
    const yCenter = output?.[1 * outputWidth + i] ?? 0;
    const width = output?.[2 * outputWidth + i] ?? 0;
    const height = output?.[3 * outputWidth + i] ?? 0;
    if (!xCenter || !yCenter || !width || !height) {
      continue;
    }
    // Extract class scores
    const classScores: number[] = [];
    for (let c = 4; c < outputHeight; c++) {
      classScores.push(output?.[c * outputWidth + i] ?? 0);
    }
    // Find the class with highest score
    const maxClassScore = Math.max(...classScores);
    if (maxClassScore > confThreshold) {
      const classId = classScores.indexOf(maxClassScore);
      // Convert from normalized coordinates to pixel coordinates
      // YOLO outputs are in normalized format [0, 1]
      const xCenterPixel = xCenter * inputSize[0] * scaleX;
      const yCenterPixel = yCenter * inputSize[1] * scaleY;
      const widthPixel = width * inputSize[0] * scaleX;
      const heightPixel = height * inputSize[1] * scaleY;
      // Convert from center format to corner format
      const x1 = xCenterPixel - widthPixel / 2;
      const y1 = yCenterPixel - heightPixel / 2;
      const x2 = xCenterPixel + widthPixel / 2;
      const y2 = yCenterPixel + heightPixel / 2;
      detections.push({
        bbox: [x1, y1, x2, y2],
        confidence: maxClassScore,
        classId: classId,
        className: CLASS_NAMES[classId] ?? "",
      });
    }
  }

  console.log("detections", detections);

  // Apply NMS to filter out overlapping detections
  const results = applyNMS(detections);

  return results;
}

function applyNMS(
  detections: Detection[],
  iouThreshold: number = 0.5
): Detection[] {
  if (detections.length === 0) {
    return detections;
  }

  // Extract boxes and scores
  const boxes = detections.map((d) => d.bbox);
  const scores = detections.map((d) => d.confidence);

  // Calculate areas
  const areas = boxes.map(([x1, y1, x2, y2]) => (x2 - x1) * (y2 - y1));

  // Sort by confidence (highest first)
  const indices = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.index);

  const keep: number[] = [];
  const remaining = [...indices];

  while (remaining.length > 0) {
    // Pick the detection with highest confidence
    const current = remaining.shift()!;
    keep.push(current);

    if (remaining.length === 0 || !boxes[current]) {
      break;
    }

    // Calculate IoU with remaining detections
    const [x1Current, y1Current, x2Current, y2Current] = boxes[current];

    const filteredRemaining = remaining.filter((idx) => {
      const [x1, y1, x2, y2] = boxes[idx] ?? [];

      if (!x1 || !y1 || !x2 || !y2) {
        return true;
      }

      // Calculate intersection coordinates
      const ix1 = Math.max(x1Current, x1);
      const iy1 = Math.max(y1Current, y1);
      const ix2 = Math.min(x2Current, x2);
      const iy2 = Math.min(y2Current, y2);

      // Calculate intersection area
      const intersectionWidth = Math.max(0, ix2 - ix1);
      const intersectionHeight = Math.max(0, iy2 - iy1);
      const intersectionArea = intersectionWidth * intersectionHeight;

      // Calculate union area
      const unionArea =
        (areas[current] ?? 0) + (areas[idx] ?? 0) - intersectionArea;

      // Calculate IoU
      const iou = intersectionArea / unionArea;

      // Keep detections with IoU below threshold
      return iou < iouThreshold;
    });

    remaining.length = 0;
    remaining.push(...filteredRemaining);
  }

  // Return filtered detections
  return keep.map((i) => detections[i]).filter((d) => d !== undefined);
}

// Class names mapping
const CLASS_NAMES: { [key: number]: string } = {
  0: "almond",
  1: "apple",
  2: "asparagus",
  3: "avocado",
  4: "bacon",
  5: "banana",
  6: "bean",
  7: "bean sprout",
  8: "beef",
  9: "beetroot",
  10: "bell pepper",
  11: "blackberry",
  12: "blueberry",
  13: "bok choy",
  14: "bread",
  15: "brie cheese",
  16: "broccoli",
  17: "cabbage",
  18: "carrot",
  19: "cauliflower",
  20: "cheddar cheese",
  21: "cheese",
  22: "cherry",
  23: "chicken breast",
  24: "chicken wing",
  25: "chilli",
  26: "chocolate",
  27: "corn",
  28: "cucumber",
  29: "dry grape",
  30: "durian",
  31: "egg",
  32: "eggplant",
  33: "fish",
  34: "garlic",
  35: "ginger",
  36: "grape",
  37: "green grape",
  38: "green pepper",
  39: "guava",
  40: "jalepeno",
  41: "jam",
  42: "kiwi",
  43: "lemon",
  44: "mango",
  45: "mangoteen",
  46: "meat ball",
  47: "milk",
  48: "mozarella cheese",
  49: "mushroom",
  50: "mussel",
  51: "noodle",
  52: "onion",
  53: "orange",
  54: "oyster",
  55: "papaya",
  56: "parmesan cheese",
  57: "pasta",
  58: "pineapple",
  59: "pomegranate",
  60: "pork",
  61: "pork belly",
  62: "pork rib",
  63: "potato",
  64: "pumpkin",
  65: "raspberry",
  66: "salad",
  67: "salmon",
  68: "scallop",
  69: "shrimp",
  70: "spring onion",
  71: "starfruit",
  72: "stilton cheese",
  73: "strawberry",
  74: "sweet potato",
  75: "tomato",
  76: "tuna",
  77: "vegetable",
  78: "watermelon",
  79: "yogurt",
} as const;
