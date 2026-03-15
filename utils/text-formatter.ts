/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalizes the first letter of each word
 */
export const titleCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Converts text to sentence case (first letter capitalized, rest lowercase)
 */
export const sentenceCase = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Converts camelCase or PascalCase to readable text
 * Example: "ingredientName" -> "Ingredient Name"
 */
export const camelCaseToReadable = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Converts text to kebab-case (lowercase with hyphens)
 */
export const toKebabCase = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
};

/**
 * Converts text to camelCase
 */
export const toCamelCase = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/[\s-_]+/g, "");
};

// ========================
// TEXT MANIPULATION
// ========================

/**
 * Truncates text to specified length and adds ellipsis
 */
export const truncate = (
  str: string,
  length: number,
  suffix: string = "..."
): string => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

/**
 * Truncates text to specified number of words
 */
export const truncateWords = (
  str: string,
  wordCount: number,
  suffix: string = "..."
): string => {
  if (!str) return "";
  const words = str.split(" ");
  if (words.length <= wordCount) return str;
  return words.slice(0, wordCount).join(" ") + suffix;
};

/**
 * Extracts initials from a name
 * Example: "John Doe" -> "JD"
 */
export const getInitials = (str: string, maxInitials: number = 2): string => {
  if (!str) return "";
  return str
    .split(" ")
    .slice(0, maxInitials)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

/**
 * Removes extra whitespace and normalizes spacing
 */
export const normalizeWhitespace = (str: string): string => {
  if (!str) return "";
  return str.replace(/\s+/g, " ").trim();
};

/**
 * Removes all non-alphanumeric characters except spaces
 */
export const sanitizeText = (str: string): string => {
  if (!str) return "";
  return str.replace(/[^a-zA-Z0-9\s]/g, "").trim();
};

/**
 * Creates a URL-friendly slug from text
 */
export const createSlug = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// ========================
// PLURALIZATION & NUMBERS
// ========================

/**
 * Simple pluralization helper
 */
export const pluralize = (word: string, count: number): string => {
  if (!word) return "";
  if (count === 1) return word;

  // Handle common irregular plurals
  const irregulars: Record<string, string> = {
    child: "children",
    person: "people",
    man: "men",
    woman: "women",
    tooth: "teeth",
    foot: "feet",
    mouse: "mice",
    goose: "geese",
  };

  const lowerWord = word.toLowerCase();
  if (irregulars[lowerWord]) {
    return irregulars[lowerWord];
  }

  // Handle regular plurals
  if (word.endsWith("y") && !/[aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + "ies";
  }
  if (
    word.endsWith("s") ||
    word.endsWith("sh") ||
    word.endsWith("ch") ||
    word.endsWith("x") ||
    word.endsWith("z")
  ) {
    return word + "es";
  }
  if (word.endsWith("f")) {
    return word.slice(0, -1) + "ves";
  }
  if (word.endsWith("fe")) {
    return word.slice(0, -2) + "ves";
  }

  return word + "s";
};

/**
 * Formats count with proper pluralization
 * Example: formatCount(1, "recipe") -> "1 recipe", formatCount(2, "recipe") -> "2 recipes"
 */
export const formatCount = (count: number, word: string): string => {
  return `${count} ${pluralize(word, count)}`;
};

/**
 * Formats numbers with ordinal suffix (1st, 2nd, 3rd, etc.)
 */
export const formatOrdinal = (num: number): string => {
  const v = num % 100;
  if (v >= 11 && v <= 13) {
    return num + "th";
  }
  switch (num % 10) {
    case 1:
      return num + "st";
    case 2:
      return num + "nd";
    case 3:
      return num + "rd";
    default:
      return num + "th";
  }
};

// ========================
// RECIPE-SPECIFIC UTILITIES
// ========================

/**
 * Formats ingredient quantities with proper fractions
 */
export const formatQuantity = (quantity: number): string => {
  if (quantity === 0) return "0";
  if (quantity % 1 === 0) return quantity.toString();

  // Convert decimals to fractions for common cooking measurements
  const fractionMap: Record<string, string> = {
    "0.125": "⅛",
    "0.25": "¼",
    "0.33": "⅓",
    "0.333": "⅓",
    "0.5": "½",
    "0.66": "⅔",
    "0.667": "⅔",
    "0.75": "¾",
    "0.875": "⅞",
  };

  const decimal = parseFloat((quantity % 1).toFixed(3)).toString();
  const whole = Math.floor(quantity);
  const fraction = fractionMap[decimal];

  if (fraction) {
    return whole > 0 ? `${whole} ${fraction}` : fraction;
  }

  return quantity.toString();
};

/**
 * Formats cooking time in a readable format
 * Example: formatCookingTime(90) -> "1 hour 30 minutes"
 */
export const formatCookingTime = (minutes: number): string => {
  if (minutes < 1) return "Less than a minute";
  if (minutes < 60) return formatCount(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return formatCount(hours, "hour");
  }

  return `${formatCount(hours, "hour")} ${formatCount(remainingMinutes, "minute")}`;
};

/**
 * Formats serving size
 */
export const formatServings = (servings: number): string => {
  if (servings === 1) return "1 serving";
  return `${servings} servings`;
};

/**
 * Formats recipe difficulty level
 */
export const formatDifficulty = (level: number): string => {
  const difficulties = ["Easy", "Medium", "Hard", "Expert"];
  return (
    difficulties[Math.max(0, Math.min(level - 1, difficulties.length - 1))] ||
    "Easy"
  );
};
