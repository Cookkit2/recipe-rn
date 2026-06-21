import { ImageFormat, Skia, type SkImage } from "@shopify/react-native-skia";
import { PREF_UNIT_SYSTEM_KEY } from "~/constants/storage-keys";
import { DEFAULT_MISSING_CONFIDENCE, UNIDENTIFIABLE_CONFIDENCE } from "~/constants/recognition";
import { storage } from "~/data";
import { titleCase } from "~/utils/text-formatter";
import { convertToUnitSystem } from "~/utils/unit-converter";
import { generateGeminiContent } from "~/utils/gemini-api";
import { log } from "~/utils/logger";

export interface ClassifiedIngredient {
  name: string;
  quantity: number;
  unit: string;
  /**
   * Model-reported confidence for the recognition (0.0-1.0). Low/missing
   * confidence is surfaced to the UI as a `needs_review` flag rather than
   * silently committed. See CONFIDENCE_REVIEW_THRESHOLD.
   */
  confidence: number;
}

/**
 * Response schema wired through Gemini structured output. Asking the model to
 * self-report a confidence isolates the recognition layer (the accuracy
 * bottleneck per [F4]) so hallucinations can be surfaced for review instead of
 * entering the pantry silently. The schema makes the primary path
 * schema-validated; postProcessResponse keeps a defensive fallback parser for
 * any malformed/empty JSON so a soft low-confidence case never turns into a
 * hard failure.
 */
const INGREDIENT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING", description: "Name of the food item, or 'unknown' if unidentifiable" },
    quantity: { type: "NUMBER", description: "Numeric quantity (e.g. 1, 250)" },
    unit: { type: "STRING", description: "Unit of measure (e.g. kg, ml, L, unit, oz)" },
    confidence: {
      type: "NUMBER",
      description:
        "Your confidence that the recognized name is correct, from 0.0 (a guess) to 1.0 (certain). Be honest: hallucinated or uncertain guesses must score below 0.6.",
    },
  },
  required: ["name", "quantity", "unit", "confidence"],
} as const;

// Dynamic prompt builder that includes unit system preference
const buildVegePrompt = (unitSystem: "metric" | "imperial") => {
  const unitGuidance =
    unitSystem === "metric"
      ? "IMPORTANT: Use ONLY metric units (g, kg, ml, L) for weight/volume measurements."
      : "IMPORTANT: Use ONLY imperial units (oz, lb, fl_oz, qt) for weight/volume measurements.";

  return `You are an inventory AI. From the image, identify the primary food item.

Respond as JSON with the fields: name, quantity, unit, confidence.
- name: the food item name, or "unknown" if the object is not a food item or is unidentifiable.
- quantity: numeric quantity. For countable items use the count; for packaged goods read the weight/volume from the label else use 1.
- unit: the unit. Use "unit" for countable items, otherwise g/kg/ml/L (metric) or oz/lb/fl_oz/qt (imperial).
- confidence: your honest confidence the name is correct, 0.0 to 1.0. If you are guessing or unsure, score below 0.6. Hallucinated names must score low.

Rules:
- ${unitGuidance}
- Do not include any text outside the JSON object.
`;
};

const GEMINI_MODEL_INPUT_SIZE = 256; // Reduced from 400 for faster API calls

export const classifyStaticImage = async (skImage: SkImage): Promise<ClassifiedIngredient> => {
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
      // Structured output: schema-validated primary path. Keeps the model's
      // self-reported confidence so hallucinations can be flagged for review.
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: INGREDIENT_RESPONSE_SCHEMA,
      },
    })
  );

  const ingredient = postProcessResponse(geminiResponse);

  // Observability: log the confidence distribution so the threshold can be
  // tuned from real accept/correct data.
  log.info("[classify] recognized ingredient", {
    name: ingredient.name,
    confidence: ingredient.confidence,
  });

  return ingredient;
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

/**
 * Parse the Gemini response into a ClassifiedIngredient.
 *
 * Primary path: schema-validated JSON `{ name, quantity, unit, confidence }`.
 * Defensive fallback: if the JSON is malformed or missing fields, parse what we
 * can from a comma-split (the legacy free-text contract) and assign a low
 * default confidence so the item is surfaced for review rather than trusted.
 * This keeps a soft low-confidence case from becoming a hard failure.
 */
export const postProcessResponse = (responseText: string): ClassifiedIngredient => {
  // Handle legacy "si" value and default to "metric"
  const storedUnit = storage.get(PREF_UNIT_SYSTEM_KEY) as string | undefined;
  const preferredUnit: "metric" | "imperial" = storedUnit === "imperial" ? "imperial" : "metric";

  // --- Primary path: schema-validated JSON ---
  const parsed = tryParseStructuredResponse(responseText);

  let name: string;
  let quantity: number;
  let unit: string;
  let confidence: number;

  if (parsed) {
    name = titleCase(parsed.name) || "Unknown";
    quantity = parsed.quantity;
    unit = parsed.unit.toLowerCase();
    confidence = parsed.confidence;
  } else {
    // --- Defensive fallback: legacy comma-split contract ---
    const legacy = parseLegacyCommaResponse(responseText);
    name = legacy.name;
    quantity = legacy.quantity;
    unit = legacy.unit;
    // Malformed/missing JSON => low confidence so it gets reviewed.
    confidence = DEFAULT_MISSING_CONFIDENCE;
  }

  // The former "unknown" collapse path now carries an explicit low-confidence
  // signal distinct from a hard failure.
  if (name.toLowerCase() === "unknown") {
    confidence = UNIDENTIFIABLE_CONFIDENCE;
  }

  // Clamp confidence into [0, 1] defensively.
  confidence = clampConfidence(confidence);

  // Convert to user's preferred unit system
  const convertedUnitAndQuantity = convertToUnitSystem(quantity, unit, preferredUnit);

  return { name, ...convertedUnitAndQuantity, confidence };
};

interface StructuredResponse {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
}

/**
 * Attempt to parse a schema-validated JSON response. Returns null if the text
 * is not valid JSON or is missing required fields — the caller falls back to
 * the legacy parser. Never throws.
 */
const tryParseStructuredResponse = (responseText: string): StructuredResponse | null => {
  const trimmed = responseText?.trim();
  if (!trimmed) return null;

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return null;
  }

  // The model occasionally wraps the object in markdown fences or returns an
  // array; tolerate a single-object array.
  if (Array.isArray(json)) {
    json = json[0];
  }

  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  const rawName = obj.name;
  const rawQuantity = obj.quantity;
  const rawUnit = obj.unit;

  // name/quantity/unit are required; confidence is optional (defaults low).
  if (typeof rawName !== "string" || rawName.trim() === "") return null;
  const quantity = typeof rawQuantity === "number" ? rawQuantity : parseFloat(String(rawQuantity));
  if (!Number.isFinite(quantity)) return null;
  if (typeof rawUnit !== "string" || rawUnit.trim() === "") return null;

  const confidence = normalizeConfidence(obj.confidence);

  return {
    name: rawName.trim(),
    quantity,
    unit: rawUnit.trim(),
    confidence,
  };
};

/**
 * Normalize an arbitrary confidence value into a finite number in [0, 1].
 * Strings are parsed; missing/invalid values fall back to the low default so
 * the item is surfaced for review rather than trusted.
 */
const normalizeConfidence = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return DEFAULT_MISSING_CONFIDENCE;
};

const clampConfidence = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_MISSING_CONFIDENCE;
  return Math.min(1, Math.max(0, value));
};

/**
 * Legacy comma-split fallback parser (preserved from the original free-text
 * contract). Used only when structured JSON parsing fails, so a malformed model
 * response degrades to a reviewable low-confidence item rather than throwing.
 */
const parseLegacyCommaResponse = (responseText: string) => {
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

  return { name, quantity, unit };
};
