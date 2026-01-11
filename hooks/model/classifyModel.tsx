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

// Return your answer ONLY in the format: \`name,quantity,unit\`
// - If the quantity on a known food item is unreadable, use \`1\` and \`unit\`.
const VEGE_PROMPT = `
You are an inventory AI. From the image, identify the primary food item.
Do not add any other text.

- If the object is not a food item or is unidentifiable, return \`unknown,1,unit\`.
- For countable items, the unit is \`units\`.
- For packaged goods, read the weight/volume (e.g., \`g\`, \`kg\`, \`ml\`, \`L\`) from the label else use \`1\` and \`unit\` .
`;

const GEMINI_MODEL_INPUT_SIZE = 256; // Reduced from 400 for faster API calls

export const classifyStaticImage = async (skImage: SkImage) => {
  const startTime = performance.now();

  const imageCompressed = compressImage(skImage, GEMINI_MODEL_INPUT_SIZE);
  // const imageCompressed = skImage.encodeToBase64(ImageFormat.JPEG, 85);

  // const objectResult = await generateObject({
  //   model: google("gemini-2.0-flash-lite"),
  //   messages: [
  //     { role: "system", content: "You help planning travel itineraries." },
  //     {
  //       role: "user",
  //       content: [
  //         {
  //           type: "image",
  //           image: imageCompressed,
  //         },
  //         {
  //           type: "text",
  //           text: VEGE_PROMPT,
  //         },
  //       ],
  //     },
  //   ],
  //   schema: z.object({
  //     name: z.string(),
  //     quantity: z.number(),
  //     unit: z.string(),
  //   }),
  // });

  // log.info(objectResult.object);

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
            { text: VEGE_PROMPT },
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
