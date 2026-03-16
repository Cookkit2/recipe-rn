# Security Improvements: Input Sanitization

This document outlines the security enhancements made to the Recipe RN application to prevent SQL injection and other input-based vulnerabilities.

## Overview

The original `BaseRepository.ts` had minimal input sanitization that only escaped `%` and `_` characters. This was insufficient to prevent SQL injection attacks and other security vulnerabilities. We have implemented comprehensive input sanitization throughout the application.

## Changes Made

### 1. Enhanced BaseRepository Sanitization

**File**: `data/db/repositories/BaseRepository.ts`

- **Before**: Only escaped `%` and `_` characters
- **After**: Comprehensive sanitization using dedicated utility functions

```typescript
// OLD - Insufficient protection
const sanitizedTerm = `%${searchTerm.replace(/[%_]/g, "\\$&")}%`;

// NEW - Comprehensive protection
private sanitizeSearchTerm(searchTerm: string): string {
  return sanitizeSearchTerm(searchTerm, {
    maxLength: 100,
    allowHtml: false,
    allowSpecialChars: true,
  });
}
```

### 2. New Input Sanitization Utilities

**File**: `utils/input-sanitization.ts`

Comprehensive sanitization functions for different types of input:

#### `sanitizeForDatabase(input: string, options?: SanitizationOptions)`

- Removes control characters and null bytes
- Escapes SQL wildcards (`%`, `_`, `\`)
- Removes dangerous SQL keywords and patterns
- Handles HTML content based on options
- Enforces length limits
- Filters special characters based on requirements

#### `sanitizeSearchTerm(searchTerm: string, options?: SanitizationOptions)`

- Specifically designed for LIKE queries
- Wraps sanitized terms with wildcards
- Default max length of 100 characters

#### `sanitizeEmail(email: string)`

- Validates email format using regex
- Converts to lowercase
- Removes control characters
- Enforces reasonable length limits (254 characters)

#### `sanitizeNumber(input: string | number, options?: { min?: number; max?: number })`

- Validates numeric input
- Enforces min/max bounds
- Rejects NaN and Infinity values

#### `sanitizeFilename(filename: string)`

- Prevents path traversal attacks (`../`)
- Removes dangerous file system characters
- Maintains file extensions
- Enforces filename length limits

#### `sanitizeUrl(url: string)`

- Validates URL format
- Restricts to safe protocols (http, https, ftp, ftps)
- Rejects dangerous protocols (javascript:, data:, file:)

#### `sanitizeObject<T>(obj: T, options?: SanitizationOptions)`

- Recursively sanitizes object properties
- Handles nested objects and arrays
- Preserves non-string values

## Security Features

### SQL Injection Prevention

1. **Wildcard Escaping**: Escapes `%`, `_`, and `\` characters that have special meaning in SQL LIKE queries
2. **Keyword Filtering**: Removes dangerous SQL keywords like DROP, DELETE, INSERT, etc.
3. **Comment Removal**: Strips SQL comment syntax (`--`, `/* */`)
4. **Operator Filtering**: Removes dangerous SQL operators and characters

### XSS Prevention

1. **HTML Tag Removal**: Optional removal of `<` and `>` characters
2. **Control Character Filtering**: Removes non-printable characters
3. **Script Tag Detection**: Prevents script injection attempts

### Path Traversal Prevention

1. **Directory Navigation**: Removes `../` patterns
2. **Path Separator Filtering**: Strips `/` and `\` characters from filenames
3. **Dangerous Character Removal**: Filters file system special characters

### Input Validation

1. **Length Limits**: Enforces reasonable maximum lengths for different input types
2. **Format Validation**: Email and URL format verification
3. **Numeric Bounds**: Min/max value enforcement for numbers
4. **Protocol Restrictions**: URL protocol whitelist

## Usage Examples

### Database Queries

```typescript
// In repositories
const searchResults = await this.buildSearchQuery(
  this.collection.query(),
  userInput, // Automatically sanitized
  ["name", "description"]
);
```

### User Input Processing

```typescript
import { sanitizeForDatabase, sanitizeEmail } from "~/utils/input-sanitization";

// Sanitize user form input
const cleanInput = sanitizeForDatabase(userInput, {
  maxLength: 255,
  allowHtml: false,
  allowSpecialChars: true,
});

// Validate and sanitize email
const cleanEmail = sanitizeEmail(userEmail);
if (!cleanEmail) {
  throw new Error("Invalid email format");
}
```

### Object Sanitization

```typescript
import { sanitizeObject } from "~/utils/input-sanitization";

// Sanitize entire objects (e.g., API request bodies)
const cleanData = sanitizeObject(requestBody, {
  maxLength: 1000,
  allowHtml: false,
});
```

## Testing

Comprehensive test suite in `__tests__/utils/input-sanitization.test.ts` covers:

- SQL injection attempt prevention
- XSS attack prevention
- Path traversal prevention
- Input validation edge cases
- Performance with large inputs
- Nested object sanitization

## WatermelonDB Specific Considerations

While WatermelonDB provides some protection through its query builder methods (`Q.where`, `Q.like`), additional sanitization is still important because:

1. **Defense in Depth**: Multiple layers of protection
2. **Raw Query Safety**: Protection against any potential raw SQL usage
3. **Future Compatibility**: Safety against framework changes
4. **Cross-Platform Consistency**: Same sanitization on web (LokiJS) and mobile (SQLite)

## Performance Considerations

- Sanitization functions are optimized for performance
- Length limits prevent excessive processing
- Caching can be added for frequently sanitized values
- Sanitization happens at the repository level to avoid redundant processing

## Recommendations

1. **Always Use Sanitization**: Never trust user input, even from authenticated users
2. **Validate Early**: Sanitize input as close to the entry point as possible
3. **Log Suspicious Activity**: Consider logging sanitization events that remove dangerous content
4. **Regular Security Reviews**: Periodically review and update sanitization rules
5. **Test Edge Cases**: Ensure comprehensive test coverage for all input scenarios

## Migration Guide

For existing code:

1. **Replace Direct String Concatenation**: Use sanitization utilities instead of direct string building
2. **Update Search Functions**: Migrate existing search implementations to use `sanitizeSearchTerm`
3. **Form Validation**: Add input sanitization to all form processing
4. **API Endpoints**: Sanitize all incoming request data

## Security Checklist

- [x] SQL injection prevention
- [x] XSS attack prevention
- [x] Path traversal prevention
- [x] Input length validation
- [x] Control character filtering
- [x] Email format validation
- [x] URL protocol validation
- [x] Comprehensive test coverage
- [x] Documentation and examples

This implementation provides robust protection against common input-based vulnerabilities while maintaining performance and usability.
