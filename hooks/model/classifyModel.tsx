import { ImageFormat, Skia, type SkImage } from "@shopify/react-native-skia";
import { PREF_UNIT_SYSTEM_KEY } from "~/constants/storage-keys";
import { storage } from "~/data";
import { titleCase } from "~/utils/text-formatter";
import { convertToUnitSystem } from "~/utils/unit-converter";
// import { createGoogleGenerativeAI } from "@ai-sdk/google";

// import { generateObject } from "ai";
// import z from "zod/v4";
// import Constants from "expo-constants";
import { generateGeminiContent } from "~/utils/gemini-api";
import { log } from "~/utils/logger";

// Dynamic prompt builder that includes unit system preference
const buildVegePrompt = (unitSystem: "metric" | "imperial") => {
  const unitGuidance =
    unitSystem === "metric"
      ? "IMPORTANT: Use ONLY metric units (g, kg, ml, L) for weight/volume measurements."
      : "IMPORTANT: Use ONLY imperial units (oz, lb, fl_oz, qt) for weight/volume measurements.";

  return `You are an inventory AI. From the image, identify the primary food item.

CRITICAL: Respond in EXACT format: "item_name,quantity,unit" - use commas to separate values, NO spaces after commas.

Examples:
- "Sugar,1,kg"
- "Apple,3,unit"
- "Milk,1,L"
- "unknown,1,unit" (if not identifiable)

Rules:
- If the object is not a food item or is unidentifiable, return "unknown,1,unit"
- For countable items, use "unit" as the unit
- For packaged goods, read the weight/volume from the label else use "1" and "unit"
- ${unitGuidance}
- NO additional text, explanations, or formatting
`;
};

const GEMINI_MODEL_INPUT_SIZE = 256; // Reduced from 400 for faster API calls

export const classifyStaticImage = async (skImage: SkImage) => {
  const startTime = performance.now();

  // Get user's preferred unit system for prompt guidance
  const storedUnit = storage.get(PREF_UNIT_SYSTEM_KEY) as string | undefined;
  // Handle legacy "si" value and default to "metric"
  const preferredUnit = storedUnit === "imperial" ? "imperial" : "metric";
  const prompt = buildVegePrompt(preferredUnit);

  const imageCompressed = compressImage(skImage, GEMINI_MODEL_INPUT_SIZE);

  const geminiResponse = await generateGeminiContent(
    JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageCompressed,
              },
            },
            { text: prompt },
          ],
        },
      ],
    })
  );

  log.info("Gemini response:", geminiResponse);

  const ingredientName = postProcessResponse(geminiResponse);
  const endTime = performance.now();
  const duration = endTime - startTime;

  log.info(`classifyStaticImage took ${duration} milliseconds`);
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
  // Expected format: "name,quantity,unit"
  // But handle variations: "name, quantity, unit" or "name, quantity unit"

  let name: string;
  let quantity: number;
  let unit: string;

  // First try: standard comma-separated format
  let parts = responseText.split(",").map((part) => part.trim());

  if (parts.length >= 3) {
    // Standard format: "name,quantity,unit"
    name = parts[0] || "Unknown";
    quantity = parseFloat(parts[1] || "1") || 1;
    unit = (parts[2] || "units").toLowerCase();
  } else if (parts.length === 2) {
    // Fallback: "name,quantity unit" (combined quantity and unit)
    name = parts[0] || "Unknown";
    const quantityUnit = (parts[1] || "").split(/\s+/); // Split by whitespace
    quantity = parseFloat(quantityUnit[0] || "1") || 1;
    unit = (quantityUnit[1] || "units").toLowerCase();
  } else {
    // Last resort: single word or unknown format
    const words = responseText.trim().split(/\s+/);
    if (words.length >= 2) {
      // Try to extract quantity and unit from the end
      const lastWord = (words[words.length - 1] || "").toLowerCase();
      const secondLast = words[words.length - 2] || "";

      // Check if second last is a number
      const parsedQuantity = parseFloat(secondLast);
      if (!isNaN(parsedQuantity)) {
        name = words.slice(0, -2).join(" ") || "Unknown";
        quantity = parsedQuantity;
        unit = lastWord || "units";
      } else {
        name = responseText || "Unknown";
        quantity = 1;
        unit = "units";
      }
    } else {
      name = responseText || "Unknown";
      quantity = 1;
      unit = "units";
    }
  }

  // Apply title case to name
  name = titleCase(name) || "Unknown";

  // Handle legacy "si" value and default to "metric"
  const storedUnit = storage.get(PREF_UNIT_SYSTEM_KEY) as string | undefined;
  const preferredUnit: "metric" | "imperial" = storedUnit === "imperial" ? "imperial" : "metric";

  // Convert to user's preferred unit system
  const convertedUnitAndQuantity = convertToUnitSystem(quantity, unit, preferredUnit);

  // Log if API returned a unit that needed conversion (for debugging)
  if (convertedUnitAndQuantity.unit !== unit) {
    log.info(
      `Unit converted from ${unit} to ${convertedUnitAndQuantity.unit} (preferred: ${preferredUnit})`
    );
  }

  return { name, ...convertedUnitAndQuantity };
};
