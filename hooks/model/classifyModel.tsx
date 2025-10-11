import { ImageFormat, Skia, type SkImage } from "@shopify/react-native-skia";
import { PREF_UNIT_SYSTEM_KEY } from "~/constants/storage-keys";
import { storage } from "~/data";
import { titleCase } from "~/utils/text-formatter";
import { convertToUnitSystem } from "~/utils/unit-converter";
import { generateGeminiContent } from "~/utils/gemini-api";
// import { generateGroqVisionContent } from "~/utils/groq-api"; // Commented out - using Gemini instead

const VEGE_PROMPT: string = `Identify food item. Output: [name],[quantity],[unit]
Rules: singular lowercase name, no adjectives.
Units: 'units' for countable items, weight/volume (g,kg,ml,L) for packages.
Unknown items: unknown,1,unit`;

const GEMINI_MODEL_INPUT_SIZE = 256; // Reduced from 400 for faster API calls

export const classifyStaticImage = async (skImage: SkImage) => {
  const startTime = performance.now();
  console.log("📊 [Profiling] Starting image classification...");

  // Step 1: Image Compression
  const compressStart = performance.now();
  const imageCompressed = compressImage(skImage, GEMINI_MODEL_INPUT_SIZE);
  const compressEnd = performance.now();
  const compressDuration = compressEnd - compressStart;
  console.log(
    `📊 [Profiling] Image compression took ${compressDuration.toFixed(2)}ms`
  );
  console.log(
    `📊 [Profiling] Compressed image size: ${imageCompressed.length} characters`
  );

  // Step 2: Gemini API Call
  const apiStart = performance.now();
  console.log("📊 [Profiling] Calling Gemini API...");

  const apiResponse = await generateGeminiContent({
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageCompressed,
            },
          },
          { text: VEGE_PROMPT },
        ],
      },
    ],
  });

  // COMMENTED OUT: Groq API Call (if you want to try Groq for faster inference)
  // const apiResponse = await generateGroqVisionContent(
  //   imageCompressed,
  //   VEGE_PROMPT,
  //   "llama-3.2-11b-vision-preview" // Fast vision model
  // );

  const apiEnd = performance.now();
  const apiDuration = apiEnd - apiStart;
  console.log(
    `📊 [Profiling] Gemini API call took ${apiDuration.toFixed(2)}ms`
  );
  console.log("📊 [Profiling] Gemini response:", apiResponse);

  // Step 3: Post-processing
  const postProcessStart = performance.now();
  const ingredientName = postProcessResponse(apiResponse);
  const postProcessEnd = performance.now();
  const postProcessDuration = postProcessEnd - postProcessStart;
  console.log(
    `📊 [Profiling] Post-processing took ${postProcessDuration.toFixed(2)}ms`
  );
  console.log(`📊 [Profiling] Extracted ingredient:`, ingredientName);

  // Overall timing
  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log("\n📊 [Profiling] ===== SUMMARY =====");
  console.log(
    `📊 [Profiling] Image compression: ${compressDuration.toFixed(2)}ms (${(
      (compressDuration / duration) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `📊 [Profiling] Gemini API call:   ${apiDuration.toFixed(2)}ms (${(
      (apiDuration / duration) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `📊 [Profiling] Post-processing:   ${postProcessDuration.toFixed(2)}ms (${(
      (postProcessDuration / duration) *
      100
    ).toFixed(1)}%)`
  );
  console.log(`📊 [Profiling] TOTAL:             ${duration.toFixed(2)}ms`);
  console.log("📊 [Profiling] ==================\n");

  return ingredientName;
};

const compressImage = (image: SkImage, imageSize: number) => {
  "worklet";
  // Create offscreen surface at target size and draw scaled image
  const surface = Skia.Surface.MakeOffscreen(imageSize, imageSize);
  if (!surface) {
    throw new Error("Failed to create surface");
  }

  const canvas = surface.getCanvas();
  const srcRect = {
    x: 0,
    y: 0,
    width: image.width(),
    height: image.height(),
  } as const;
  const dstRect = { x: 0, y: 0, width: imageSize, height: imageSize } as const;
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.drawImageRect(image, srcRect, dstRect, paint);

  const snapshot = surface.makeImageSnapshot();

  const base64 = snapshot?.encodeToBase64(ImageFormat.JPEG, 60); // Reduced quality for faster uploads

  return base64;
};

const postProcessResponse = (responseText: string) => {
  // It return in format of "name,quantity,unit"
  // Split by , and trim whitespace
  const parts = responseText.split(",").map((part) => part.trim());
  if (parts.length < 3) {
    throw new Error(`Invalid response format: ${responseText}`);
  }

  const name = titleCase(parts[0] || "") || "Unknown";
  const quantity = parseInt(parts[1] || "1", 10);
  const unit = parts[2] || "units";

  const preferredSiOrImperial = storage.get(PREF_UNIT_SYSTEM_KEY) as
    | "si"
    | "imperial";

  const convertedUnitAndQuantity = convertToUnitSystem(
    quantity,
    unit,
    preferredSiOrImperial
  );

  return { name, ...convertedUnitAndQuantity };
};
