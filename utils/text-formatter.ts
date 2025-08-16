/**
 * Comprehensive text utility functions for text formatting, manipulation, and validation
 */

// ========================
// BASIC TEXT FORMATTING
// ========================

/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalizes the first letter of each word
 */
export const titleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Converts text to sentence case (first letter capitalized, rest lowercase)
 */
export const sentenceCase = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Converts camelCase or PascalCase to readable text
 * Example: "ingredientName" -> "Ingredient Name"
 */
export const camelCaseToReadable = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

/**
 * Converts text to kebab-case (lowercase with hyphens)
 */
export const toKebabCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * Converts text to camelCase
 */
export const toCamelCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/[\s-_]+/g, '');
};

// ========================
// TEXT MANIPULATION
// ========================

/**
 * Truncates text to specified length and adds ellipsis
 */
export const truncate = (str: string, length: number, suffix: string = '...'): string => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

/**
 * Truncates text to specified number of words
 */
export const truncateWords = (str: string, wordCount: number, suffix: string = '...'): string => {
  if (!str) return '';
  const words = str.split(' ');
  if (words.length <= wordCount) return str;
  return words.slice(0, wordCount).join(' ') + suffix;
};

/**
 * Extracts initials from a name
 * Example: "John Doe" -> "JD"
 */
export const getInitials = (str: string, maxInitials: number = 2): string => {
  if (!str) return '';
  return str
    .split(' ')
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
};

/**
 * Removes extra whitespace and normalizes spacing
 */
export const normalizeWhitespace = (str: string): string => {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Removes all non-alphanumeric characters except spaces
 */
export const sanitizeText = (str: string): string => {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9\s]/g, '').trim();
};

/**
 * Creates a URL-friendly slug from text
 */
export const createSlug = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ========================
// PLURALIZATION & NUMBERS
// ========================

/**
 * Simple pluralization helper
 */
export const pluralize = (word: string, count: number): string => {
  if (!word) return '';
  if (count === 1) return word;
  
  // Handle common irregular plurals
  const irregulars: Record<string, string> = {
    'child': 'children',
    'person': 'people',
    'man': 'men',
    'woman': 'women',
    'tooth': 'teeth',
    'foot': 'feet',
    'mouse': 'mice',
    'goose': 'geese'
  };
  
  const lowerWord = word.toLowerCase();
  if (irregulars[lowerWord]) {
    return irregulars[lowerWord];
  }
  
  // Handle regular plurals
  if (word.endsWith('y') && !/[aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
    return word + 'es';
  }
  if (word.endsWith('f')) {
    return word.slice(0, -1) + 'ves';
  }
  if (word.endsWith('fe')) {
    return word.slice(0, -2) + 'ves';
  }
  
  return word + 's';
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
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = num % 100;
  const index = (value - 20) % 10;
  
  return num + (suffixes[index] || suffixes[value] || suffixes[0] || 'th');
};

// ========================
// RECIPE-SPECIFIC UTILITIES
// ========================

/**
 * Formats ingredient quantities with proper fractions
 */
export const formatQuantity = (quantity: number): string => {
  if (quantity === 0) return '0';
  if (quantity % 1 === 0) return quantity.toString();
  
  // Convert decimals to fractions for common cooking measurements
  const fractionMap: Record<string, string> = {
    '0.125': '⅛',
    '0.25': '¼',
    '0.33': '⅓',
    '0.333': '⅓',
    '0.5': '½',
    '0.66': '⅔',
    '0.667': '⅔',
    '0.75': '¾',
    '0.875': '⅞'
  };
  
  const decimal = (quantity % 1).toFixed(3);
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
  if (minutes < 1) return 'Less than a minute';
  if (minutes < 60) return formatCount(minutes, 'minute');
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return formatCount(hours, 'hour');
  }
  
  return `${formatCount(hours, 'hour')} ${formatCount(remainingMinutes, 'minute')}`;
};

/**
 * Formats serving size
 */
export const formatServings = (servings: number): string => {
  if (servings === 1) return '1 serving';
  return `${servings} servings`;
};

/**
 * Formats recipe difficulty level
 */
export const formatDifficulty = (level: number): string => {
  const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];
  return difficulties[Math.max(0, Math.min(level - 1, difficulties.length - 1))] || 'Easy';
};

// ========================
// VALIDATION HELPERS
// ========================

/**
 * Checks if a string is empty or only whitespace
 */
export const isEmpty = (str: string): boolean => {
  return !str || str.trim().length === 0;
};

/**
 * Checks if a string contains only letters
 */
export const isAlphabetic = (str: string): boolean => {
  return /^[a-zA-Z]+$/.test(str);
};

/**
 * Checks if a string contains only alphanumeric characters
 */
export const isAlphanumeric = (str: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(str);
};

/**
 * Checks if a string is a valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Checks if a string contains profanity (basic check)
 */
export const containsProfanity = (str: string): boolean => {
  const profanityList = ['damn', 'hell', 'crap']; // Add more as needed
  const lowerStr = str.toLowerCase();
  return profanityList.some(word => lowerStr.includes(word));
};

// ========================
// SEARCH & MATCHING
// ========================

/**
 * Simple fuzzy search - checks if search term appears in target string
 */
export const fuzzyMatch = (searchTerm: string, target: string): boolean => {
  if (!searchTerm || !target) return false;
  return target.toLowerCase().includes(searchTerm.toLowerCase());
};

/**
 * Highlights search terms in text (returns object for custom styling)
 */
export const highlightSearchTerm = (text: string, searchTerm: string): Array<{text: string, isHighlighted: boolean}> => {
  if (!searchTerm || !text) {
    return [{text, isHighlighted: false}];
  }
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map(part => ({
    text: part,
    isHighlighted: regex.test(part)
  }));
};

/**
 * Calculates similarity between two strings (0-1 scale)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

/**
 * Helper function for Levenshtein distance calculation
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0]![i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j]![0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const currentRow = matrix[j]!;
      const prevRow = matrix[j - 1]!;
      
      currentRow[i] = Math.min(
        (currentRow[i - 1] || 0) + 1, // deletion
        (prevRow[i] || 0) + 1, // insertion
        (prevRow[i - 1] || 0) + indicator, // substitution
      );
    }
  }
  
  return matrix[str2.length]![str1.length] || 0;
};

// ========================
// DISPLAY FORMATTING
// ========================

/**
 * Formats currency values
 */
export const formatCurrency = (amount: number, currency: string = '$'): string => {
  return `${currency}${amount.toFixed(2)}`;
};

/**
 * Formats file sizes in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formats large numbers with abbreviations (1K, 1M, etc.)
 */
export const formatLargeNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
  return (num / 1000000000).toFixed(1) + 'B';
};

// ========================
// DATE & TIME HELPERS
// ========================

/**
 * Formats relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

// ========================
// RANDOM GENERATORS
// ========================

/**
 * Generates a random string of specified length
 */
export const generateRandomString = (length: number, characters?: string): string => {
  const chars = characters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generates a random ID (useful for temporary IDs)
 */
export const generateId = (prefix?: string): string => {
  const id = generateRandomString(8);
  return prefix ? `${prefix}_${id}` : id;
};

// ========================
// EXPORT ALL UTILITIES
// ========================

export const textUtils = {
  // Basic formatting
  capitalize,
  titleCase,
  sentenceCase,
  camelCaseToReadable,
  toKebabCase,
  toCamelCase,
  
  // Text manipulation
  truncate,
  truncateWords,
  getInitials,
  normalizeWhitespace,
  sanitizeText,
  createSlug,
  
  // Pluralization & numbers
  pluralize,
  formatCount,
  formatOrdinal,
  
  // Recipe-specific
  formatQuantity,
  formatCookingTime,
  formatServings,
  formatDifficulty,
  
  // Validation
  isEmpty,
  isAlphabetic,
  isAlphanumeric,
  isValidEmail,
  containsProfanity,
  
  // Search & matching
  fuzzyMatch,
  highlightSearchTerm,
  calculateSimilarity,
  
  // Display formatting
  formatCurrency,
  formatFileSize,
  formatLargeNumber,
  
  // Date & time
  formatRelativeTime,
  
  // Random generators
  generateRandomString,
  generateId
};

export default textUtils;
