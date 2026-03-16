/**
 * Input Sanitization Utilities
 * 
 * Prov    // 1  // 1. Remove control characters and null bytes
  sanitized = sanitized.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "");

  // 2. Remove potentially dangerous SQL keywords and patterns first
  // Apply all patterns, then clean up remaining quotes and special characters
  const sqlKeywords = /(\b|^)(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|EVAL|SELECT|UNION|JOIN)\b/gi;
  const sqlComments = /(--|\/\*|\*\/)/g;
  
  // Apply patterns in sequence
  sanitized = sanitized.replace(sqlKeywords, "");
  sanitized = sanitized.replace(sqlComments, "");
  
  // Remove individual dangerous characters with separate calls
  sanitized = sanitized.replace(/;/g, "");
  sanitized = sanitized.replace(/\|/g, "");
  sanitized = sanitized.replace(/&/g, "");
  sanitized = sanitized.replace(/'/g, "");  // Single quotes
  sanitized = sanitized.replace(/"/g, "");  // Double quotes
  
  // Clean up any extra whitespace left by removals
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // 3. Escape SQL wildcards and backslashes AFTER removing dangerous patterns
  sanitized = sanitized.replace(/[%_\\]/g, "\\$&");l characters and null bytes
  sanitized = sanitized.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "");

  // 2. Escape SQL wildcards and backslashes BEFORE removing other patterns
  sanitized = sanitized.replace(/[%_\\]/g, "\\$&");

  // 3. Remove potentially dangerous SQL keywords and patterns2. Remove potentially dangerous SQL keywords and patterns
  const sqlPatterns = [
    /(\b|^)(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|EVAL|SELECT|UNION|JOIN)\b/gi,
    /(--|\/\*|\*\/|;|\||&|'|"|<|>)/g, // SQL operators, quotes, and comment syntax
  ];emove potentially dangerous SQL keywords and patterns
  const sqlPatterns = [
    /(\b|^)(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|EVAL|SELECT|UNION|JOIN)\b/gi,
    /(--|\/\*|\*\/|;|\||&|'|"|<|>)/g, // SQL operators, quotes, and comment syntax
  ];comprehensive input sanitization functions to prevent SQL injection,
 * XSS attacks, and other security vulnerabilities.
 */

export interface SanitizationOptions {
  /** Maximum allowed length for the input */
  maxLength?: number;
  /** Whether to allow HTML characters */
  allowHtml?: boolean;
  /** Whether to allow special characters */
  allowSpecialChars?: boolean;
  /** Custom pattern to remove */
  removePattern?: RegExp;
}

/**
 * Sanitizes user input for database queries
 * @param input - The raw user input
 * @param options - Sanitization options
 * @returns Sanitized string safe for database operations
 */
export function sanitizeForDatabase(input: string, options: SanitizationOptions = {}): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  const { maxLength = 255, allowHtml = false, allowSpecialChars = true, removePattern } = options;

  let sanitized = input.trim();

  // 1. Remove control characters and null bytes
  sanitized = sanitized.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "");

  // 2. Remove potentially dangerous SQL keywords and patterns first
  // Apply all patterns, then clean up remaining quotes and special characters
  const sqlKeywords =
    /(\b|^)(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|EVAL|SELECT|UNION|JOIN)\b/gi;
  const sqlComments = /(--|\/\*|\*\/)/g;

  // Apply patterns in sequence
  sanitized = sanitized.replace(sqlKeywords, "");
  sanitized = sanitized.replace(sqlComments, "");

  // Remove individual dangerous characters with separate calls
  sanitized = sanitized.replace(/;/g, "");
  sanitized = sanitized.replace(/\|/g, "");
  sanitized = sanitized.replace(/&/g, "");
  sanitized = sanitized.replace(/'/g, ""); // Single quotes
  sanitized = sanitized.replace(/"/g, ""); // Double quotes

  // Clean up any extra whitespace left by removals
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // 3. Escape SQL wildcards and backslashes AFTER removing dangerous patterns
  sanitized = sanitized.replace(/[%_\\]/g, "\\$&");

  // 4. Handle HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/[<>]/g, "");
  }

  // 5. Handle special characters if not allowed
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, "");
  }

  // 6. Apply custom pattern removal
  if (removePattern) {
    sanitized = sanitized.replace(removePattern, "");
  }

  // 7. Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes search terms specifically for LIKE queries
 * @param searchTerm - The search term to sanitize
 * @param options - Sanitization options
 * @returns Sanitized search term ready for LIKE queries
 */
export function sanitizeSearchTerm(searchTerm: string, options: SanitizationOptions = {}): string {
  const sanitized = sanitizeForDatabase(searchTerm, {
    maxLength: 100,
    allowHtml: false,
    allowSpecialChars: true,
    ...options,
  });

  // Return with wildcards for LIKE queries
  return `%${sanitized}%`;
}

/**
 * Validates and sanitizes email addresses
 * @param email - The email to validate and sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    return "";
  }

  let sanitized = email.trim().toLowerCase();

  // Remove control characters
  sanitized = sanitized.replace(/[^\x20-\x7E]/g, "");

  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return "";
  }

  // Limit length (reasonable email length)
  if (sanitized.length > 254) {
    return "";
  }

  return sanitized;
}

/**
 * Sanitizes numeric input
 * @param input - The input to sanitize
 * @param options - Min and max values
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumber(
  input: string | number,
  options: { min?: number; max?: number } = {}
): number | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = options;

  // Convert to number
  let num: number;
  if (typeof input === "string") {
    // For strict validation, check if the string is purely numeric
    if (!/^-?\d*\.?\d+$/.test(input.trim())) {
      return null;
    }
    num = parseFloat(input);
  } else {
    num = input;
  }

  // Validate
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  // Check bounds
  if (num < min || num > max) {
    return null;
  }

  return num;
}

/**
 * Sanitizes file names and paths
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for file operations
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "";
  }

  let sanitized = filename.trim();

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, "");
  sanitized = sanitized.replace(/[/\\]/g, "");

  // Remove dangerous characters (control characters 0-31 and other unsafe chars)
  sanitized = sanitized.replace(/[<>:"|?*]/g, "");
  // Remove control characters by keeping only printable ASCII and extended characters
  sanitized = sanitized.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "");

  // Limit length
  if (sanitized.length > 255) {
    const lastDotIndex = sanitized.lastIndexOf(".");
    if (lastDotIndex === -1) {
      sanitized = sanitized.substring(0, 255);
    } else {
      const extension = sanitized.substring(lastDotIndex + 1);
      const nameWithoutExt = sanitized.substring(0, lastDotIndex);
      // Ensure we don't have a negative maxNameLength if extension itself is > 254 chars
      const maxNameLength = Math.max(0, 255 - extension.length - 1);

      if (maxNameLength === 0 && extension.length >= 255) {
        // Edge case: extension itself is >= 255 chars
        sanitized = extension.substring(0, 255);
      } else {
        sanitized = nameWithoutExt.substring(0, maxNameLength) + "." + extension;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitizes URL input
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") {
    return "";
  }

  let sanitized = url.trim();

  // Remove control characters
  sanitized = sanitized.replace(/[^\x20-\x7E]/g, "");

  // Basic URL validation
  try {
    const urlObj = new URL(sanitized);

    // Only allow safe protocols
    const allowedProtocols = ["http:", "https:", "ftp:", "ftps:"];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return "";
    }

    return sanitized; // Return the sanitized version, not toString() which might differ
  } catch {
    return "";
  }
}

/**
 * Deep sanitizes an object recursively
 * @param obj - The object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizationOptions = {}
): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sanitized = { ...obj } as Record<string, unknown>;

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeForDatabase(value, options);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeForDatabase(item, options)
          : typeof item === "object" && item !== null
            ? sanitizeObject(item as Record<string, unknown>, options)
            : item
      );
    }
  }

  return sanitized as T;
}
