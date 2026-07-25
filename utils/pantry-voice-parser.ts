/**
 * Pantry Voice Batch Parser
 *
 * Parses a free-form speech transcript ("two eggs, milk and cheddar")
 * into a list of candidate pantry items for the "speak your fridge"
 * flow (issue #721). Pure and fully unit-testable: takes a string,
 * returns CreatePantryItem[] candidates with quantity + optional unit.
 *
 * It is intentionally a sibling of utils/voice-command-parser.ts (which
 * parses cooking commands). The two never share surface logic; only the
 * speech engine (hooks/useSpeechRecognition.ts) is shared.
 */

import * as Crypto from "expo-crypto";
import { titleCase } from "~/utils/text-formatter";
import type { CreatePantryItem } from "~/store/CreateIngredientContext";
import type { ItemType } from "~/types/PantryItem";

/** Result of parsing a single spoken fragment. */
export interface ParsedPantryCandidate {
  name: string;
  quantity: number;
  unit: string;
  /** True when the fragment could only be partially understood. */
  lowConfidence: boolean;
}

/**
 * Word -> number table for spoken quantities ("two" -> 2).
 * Kept intentionally small; numeric digits are also handled separately.
 */
const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  dozen: 12,
  couple: 2,
  few: 3,
};

/** Recognized units, mapped to a canonical display form. */
const UNIT_MAP: Record<string, string> = {
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  cup: "cup",
  cups: "cup",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  pint: "pint",
  pints: "pint",
  quart: "quart",
  quarts: "quart",
  gallon: "gallon",
  gallons: "gallon",
  piece: "piece",
  pieces: "piece",
  slice: "slice",
  slices: "slice",
  can: "can",
  cans: "can",
  bunch: "bunch",
  bunches: "bunch",
  pack: "pack",
  packs: "pack",
  package: "pack",
  packages: "pack",
  box: "box",
  boxes: "box",
};

/**
 * Convert a written number word to a numeric value, returning undefined
 * for words that are not quantity tokens.
 */
function numberWordToValue(word: string): number | undefined {
  const lower = word.toLowerCase();
  if (lower in NUMBER_WORDS) {
    return NUMBER_WORDS[lower];
  }
  // Bare numeric digits / decimals ("2", "2.5")
  if (/^\d+(\.\d+)?$/.test(lower)) {
    const value = parseFloat(lower);
    return isNaN(value) ? undefined : value;
  }
  return undefined;
}

/**
 * Simple plural -> singular form for display names. Matches the rule set
 * used elsewhere in the codebase (see VoiceCommandParser.normalizeIngredientName).
 */
export function singularize(word: string): string {
  const rules = [
    { pattern: /ies$/i, replacement: "y" }, // berries -> berry
    { pattern: /([^aeiou])oes$/i, replacement: "$1o" }, // tomatoes -> tomato (keep shoes -> sho? handled below)
    { pattern: /ves$/i, replacement: "f" }, // knives -> knife
    { pattern: /(sh|ch|s|x|z)es$/i, replacement: "$1" }, // dishes -> dish, boxes -> box, buses -> bus
    { pattern: /oes$/i, replacement: "" }, // potatoes already handled above; toes -> toe fallback
    { pattern: /s$/i, replacement: "" }, // eggs -> egg
  ];
  for (const rule of rules) {
    if (rule.pattern.test(word)) {
      return word.replace(rule.pattern, rule.replacement);
    }
  }
  return word;
}

/**
 * Parse a single spoken fragment ("half a gallon of milk", "two eggs")
 * into a candidate, or undefined when nothing meaningful remains.
 */
export function parseFragment(fragment: string): ParsedPantryCandidate | undefined {
  // Lowercase and strip filler phrases. NOTE: "of" is preserved because the
  // container+of pattern ("half a gallon of milk") needs it below.
  const cleaned = fragment
    .toLowerCase()
    .replace(/\b(some|a bit of|a little|please|add|put|i have|i need|need)\b/gi, " ")
    .replace(/[^a-z0-9\s./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return undefined;

  let tokens = cleaned.split(" ").filter(Boolean);

  // Strip leading articles ("a", "an", "the") that carry no ingredient meaning.
  while (tokens.length > 0 && /^(a|an|the)$/.test(tokens[0] ?? "")) {
    tokens = tokens.slice(1);
  }
  if (tokens.length === 0) return undefined;

  let quantity = 1;
  let unit = "unit";
  let nameStart = 0;

  // "dozen eggs" / "two dozen eggs" — handle the special dozen multiplier.
  const dozenIdx = tokens.findIndex((t) => /^dozens?$/.test(t));
  if (dozenIdx > 0) {
    const leadingValue = numberWordToValue(tokens[dozenIdx - 1] ?? "");
    quantity = (leadingValue ?? 1) * 12;
    // Consume everything up to and including the "dozen" token as the quantity.
    nameStart = dozenIdx + 1;
  } else {
    // Leading quantity token (word or digit), e.g. "two eggs", "3 cups flour".
    const firstValue = numberWordToValue(tokens[0] ?? "");
    if (firstValue !== undefined && tokens.length > 1) {
      quantity = firstValue;
      nameStart = 1;
    }
  }

  // Collapse an article that may sit between the quantity and the unit/name.
  if (tokens[nameStart] === "a" || tokens[nameStart] === "an") {
    nameStart += 1;
  }

  // Look for a unit token immediately after the quantity.
  const possibleUnit = tokens[nameStart];
  if (possibleUnit && possibleUnit in UNIT_MAP) {
    unit = UNIT_MAP[possibleUnit] ?? unit;
    nameStart += 1;
  }

  let nameTokens = tokens.slice(nameStart);

  // "half a gallon of milk" pattern: a container noun ("gallon", "bottle",
  // "bag") plus "of <ingredient>". Strip the container and keep the ingredient.
  const ofIdx = nameTokens.findIndex((t) => t === "of");
  if (ofIdx > 0 && ofIdx < nameTokens.length - 1) {
    const container = nameTokens[ofIdx - 1];
    if (container && container in UNIT_MAP) {
      unit = UNIT_MAP[container] ?? unit;
    }
    nameTokens = nameTokens.slice(ofIdx + 1);
  }

  // Drop trailing/connector filler and articles. Articles ("a"/"an"/"the") and
  // "of" only carry grammar, not ingredient meaning.
  nameTokens = nameTokens.filter(
    (t) => !/^(please|too|as|well|also|and|with|of|a|an|the)$/i.test(t)
  );

  if (nameTokens.length === 0) return undefined;

  // Singularize the head noun for friendlier dedup against the catalog.
  const head = nameTokens[0];
  if (head) {
    nameTokens[0] = singularize(head);
  }

  const name = titleCase(nameTokens.join(" "));

  if (!name) return undefined;

  return {
    name,
    quantity,
    unit,
    lowConfidence: false,
  };
}

/**
 * Split a transcript into ingredient fragments on natural separators
 * (commas, semicolons, " and ", " plus ", newlines). Bare "and" inside a
 * fragment such as "salt and pepper" still splits — the parser tolerates
 * the resulting short fragments.
 */
export function splitTranscript(transcript: string): string[] {
  return transcript
    .replace(/(?:\b|^)(and|plus|also)(?:\b|$)/gi, ",")
    .split(/(?:[,;\n]+|(?<=\b)(?:and|plus|also)(?=\b))/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build a CreatePantryItem candidate from a parsed fragment. Status is left
 * undefined so the existing confirmation sheet treats it as eligible for save
 * (mirroring how CreateIngredientContext marks finished camera items).
 */
export function buildCreatePantryItem(candidate: ParsedPantryCandidate): CreatePantryItem {
  const now = new Date();
  return {
    id: `voice-${Date.now()}-${Crypto.randomUUID()}`,
    name: candidate.name,
    quantity: candidate.quantity,
    unit: candidate.unit,
    expiry_date: undefined,
    category: "",
    type: "cabinet" as Exclude<ItemType, "all">,
    image_url: undefined,
    background_color: undefined,
    created_at: now,
    updated_at: now,
    steps_to_store: [],
    status: undefined,
  };
}

/**
 * Parse a full transcript into CreatePantryItem candidates.
 *
 * - Empty / garbage transcripts return [].
 * - Fragments that yield no name are dropped.
 * - Duplicates within the same transcript (same normalized name) are merged
 *   by summing quantities.
 *
 * Normalization against the base-ingredient catalog / IngredientSynonym index
 * happens later in CreateIngredientContext (mirroring the camera flow, which
 * calls baseIngredientApi.getBaseIngredientByName after building the item).
 */
export function parsePantryTranscript(transcript: string): CreatePantryItem[] {
  const trimmed = transcript?.trim();
  if (!trimmed) return [];

  const fragments = splitTranscript(trimmed);
  const byKey = new Map<string, CreatePantryItem>();

  for (const fragment of fragments) {
    const parsed = parseFragment(fragment);
    if (!parsed) continue;

    // Composite key: name + unit, so "2 cups milk" and "1 liter milk" stay
    // as separate editable candidates rather than collapsing into one.
    const key = `${parsed.name.toLowerCase()}::${parsed.unit}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += parsed.quantity;
      continue;
    }
    byKey.set(key, buildCreatePantryItem(parsed));
  }

  return Array.from(byKey.values());
}
