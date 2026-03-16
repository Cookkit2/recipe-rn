# Recipe Import - Validation and Error Handling

> **Purpose**: Document validation rules, error handling strategies, and fallback mechanisms for the recipe import system across all sources (websites, YouTube, TikTok, Instagram).

---

## 📋 Overview

The recipe import system uses a multi-layered validation and error handling approach:

1. **URL Validation** - Ensures the input URL is valid and supported
2. **Content Fetching** - Handles network errors, rate limiting, and blocked content
3. **Data Extraction** - Validates structured data and falls back to AI analysis
4. **AI Analysis** - Validates AI responses and handles parsing errors
5. **Recipe Validation** - Ensures extracted recipes meet minimum quality standards

---

## ✅ Validation Rules

### Recipe Validation (`isValidRecipe`)

**File:** `lib/recipe-scrapper/validation-utils.ts`

The `isValidRecipe()` function performs four critical validation checks:

```typescript
export function isValidRecipe(recipe: Partial<GeneratedRecipe> | undefined): boolean
```

#### 1. Title Validation
- **Required:** Yes
- **Rules:**
  - Must exist
  - Must not be empty after trimming whitespace
  - **Failure message:** `"Recipe validation failed: Missing title"`

#### 2. Ingredients Validation
- **Required:** Yes
- **Rules:**
  - Must be an array
  - Must have at least one valid ingredient
  - Valid ingredient must have:
    - `name` property that is not empty
    - `name` must not be "unknown ingredient" (case-insensitive)
  - **Failure message:** `"Recipe validation failed: valid_ingredients=0"`

#### 3. Steps Validation
- **Required:** Yes
- **Rules:**
  - Must be an array
  - Must have at least one valid step
  - Valid step must have:
    - `description` property that is not empty after trimming
  - **Failure message:** `"Recipe validation failed: valid_steps=0"`

#### 4. Servings Validation
- **Required:** No (optional but recommended)
- **Rules:**
  - If provided, must be greater than 0
  - **Failure message:** `"Recipe validation failed: Invalid servings X"`

### URL Validation

#### YouTube URLs

**File:** `utils/youtube-utils.ts`

```typescript
// Supported YouTube URL formats:
- https://www.youtube.com/watch?v=VIDEO_ID
- https://youtu.be/VIDEO_ID
- https://www.youtube.com/embed/VIDEO_ID
- https://www.youtube.com/v/VIDEO_ID
- https://www.youtube.com/shorts/VIDEO_ID
```

Extracts 11-character video ID using regex patterns.

#### Website URLs

No strict URL validation - any URL is accepted and fetched. Content type is determined after fetching.

#### Social Media URLs

**Supported:**
- TikTok: `tiktok.com` URLs
- Instagram: `instagram.com` URLs

---

## 🛡️ Error Handling Strategies

### Error Types and Codes

#### YouTube Service Errors

**File:** `lib/recipe-scrapper/youtube/types.ts`

```typescript
export class YouTubeServiceError extends Error {
  code:
    | "VIDEO_NOT_FOUND"    // Video doesn't exist or is private
    | "NO_CAPTIONS"        // No transcript available
    | "NETWORK_ERROR"      // Network request failed
    | "RATE_LIMITED"       // Rate limited by YouTube
    | "API_ERROR"          // Generic API error
    | "PARSE_ERROR"        // Failed to parse response
}
```

#### Recipe Analysis Result

**File:** `types/ScrappedRecipe.ts`

```typescript
export interface RecipeAnalysisResult {
  isCookingVideo: boolean;  // Whether content is a recipe
  confidence: number;       // 0-1 confidence score
  recipe?: GeneratedRecipe; // Extracted recipe if valid
  errorMessage?: string;    // Error message if failed
}
```

### Per-Service Error Handling

#### 1. WebsiteRecipeService

**File:** `lib/recipe-scrapper/WebsiteRecipeService.ts`

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| HTTP error response | Throws `Error` with status code and status text |
| HTML fetch timeout | Propagates network error |
| JSON-LD parse error | Returns `undefined` structured data, falls back to AI |
| No structured data found | Uses AI analysis on HTML content |
| Gemini cleaning failure | Returns original uncleaned recipe data |
| Invalid cleaned recipe | Logs warning, returns original recipe |

**Key Pattern:**
```typescript
try {
  const cleanedRecipe = JSON.parse(response);
  if (!isValidRecipe(cleanedRecipe)) {
    log.warn("Gemini produced invalid recipe, falling back to original");
    return recipe; // Fallback to original
  }
  return cleanedRecipe;
} catch (error) {
  log.warn("Failed to clean recipe, using original data", error);
  return recipe; // Fallback to original
}
```

#### 2. NoAuthYouTubeService

**File:** `lib/recipe-scrapper/youtube/NoAuthYouTubeService.ts`

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| noembed.com HTTP error | Throws `YouTubeServiceError` with `NETWORK_ERROR` |
| Video not found | Throws `YouTubeServiceError` with `VIDEO_NOT_FOUND` |
| Transcript fetch failed (all methods) | Throws `YouTubeServiceError` with `NO_CAPTIONS` |
| InnerTube API error | Returns `null`, tries next method |
| Caption URL not found | Returns `null`, tries next method |
| Caption parse failed | Throws `YouTubeServiceError` with `PARSE_ERROR` |

**Multi-Method Transcript Fetching:**

The service uses a **fallback chain** for transcript fetching:

```
1. InnerTube API (Android) ──┐
                             ├──▶ Try each method until success
2. youtube-transcript package─┤   or all exhausted
                             │
3. Proxy API ─────────────────┤
                             │
4. Direct scraping ───────────┘
```

Each method that fails returns `null` and logs, allowing the next method to be tried.

**Partial Failure Handling:**

```typescript
async getVideoData(videoId: string): Promise<YouTubeDataResult> {
  const [videoInfoResult, transcriptResult] = await Promise.allSettled([
    this.getVideoInfo(videoId),
    this.getTranscript(videoId),
  ]);

  // Video info REQUIRED - throw if failed
  if (videoInfoResult.status === "rejected") {
    throw new YouTubeServiceError(
      `Failed to fetch video: ${videoInfoResult.reason}`,
      "VIDEO_NOT_FOUND"
    );
  }

  // Transcript OPTIONAL - log warning if failed
  const transcript = transcriptResult.status === "fulfilled"
    ? transcriptResult.value
    : undefined;

  if (transcriptResult.status === "rejected") {
    log.warn(`Could not fetch transcript: ${transcriptResult.reason}`);
  }

  return { videoInfo: videoInfoResult.value, transcript, hasFullMetadata: false };
}
```

#### 3. SocialRecipeService

**File:** `lib/recipe-scrapper/SocialRecipeService.ts`

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Page fetch error | Returns empty metadata, continues to AI |
| Metadata extraction failed | Returns empty strings for title/description |
| Recipe validation failed | Returns `confidence: 0` with error message |
| JSON parse error | Returns error result with `confidence: 0` |

**Validation-First Approach:**

```typescript
private parseResponse(response: string, sourceUrl: string): RecipeAnalysisResult {
  const parsed = JSON.parse(response);

  if (parsed.isCookingVideo && parsed.recipe) {
    const potentialRecipe = { ...parsed.recipe, ingredients, steps };

    // Validate BEFORE returning
    if (!isValidRecipe(potentialRecipe)) {
      log.warn("Recipe rejected due to validation failure");
      return {
        isCookingVideo: true,
        confidence: 0, // Force confidence to 0 to trigger error toast
        errorMessage: "Could not extract valid ingredients or steps from this post.",
      };
    }
  }

  return result;
}
```

#### 4. RecipeAnalyzer

**File:** `lib/recipe-scrapper/youtube/RecipeAnalyzer.ts`

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Gemini API error | Returns error result with `confidence: 0` |
| Missing `isCookingVideo` field | Throws error, caught and returns error result |
| JSON parse error | Returns error result with `confidence: 0` |
| No transcript available | Uses Gemini video understanding (direct URL) |

**Normalization as Error Recovery:**

```typescript
private normalizeIngredients(ingredients): GeneratedRecipe["ingredients"] {
  if (!ingredients || !Array.isArray(ingredients)) {
    return []; // Graceful degradation
  }

  return ingredients.map((ing) => ({
    name: (ing.name || "Unknown ingredient").trim().toLowerCase(),
    quantity: ing.quantity ?? 1, // Default if missing
    unit: (ing.unit || "piece").trim().toLowerCase(), // Default if missing
    notes: ing.notes?.trim(),
  }));
}
```

---

## 🔄 Fallback Mechanisms

### 1. Transcript Fetching Fallback Chain

**Priority Order:**
1. **InnerTube API** - Most reliable, mimics Android app
2. **youtube-transcript package** - Community-maintained library
3. **Proxy API** - Public transcript APIs
4. **Direct scraping** - Last resort, parsing YouTube HTML

If all methods fail:
- YouTube analysis proceeds without transcript
- Uses Gemini's video understanding capabilities instead

### 2. Structured Data → AI Fallback

**For Websites:**

```
1. Try JSON-LD schema.org data
   ├── Success: Parse and use structured data
   └── Failure: Fall through to step 2

2. Try AI analysis on HTML content
   └── Always succeeds (but may have lower confidence)
```

### 3. Gemini Cleaning Fallback

**In WebsiteRecipeService:**

```typescript
// Try to clean with Gemini
try {
  const cleanedRecipe = await this.cleanRecipeWithGemini(recipe);

  // Validate cleaned recipe
  if (isValidRecipe(cleanedRecipe)) {
    return cleanedRecipe;
  }
} catch (error) {
  log.warn("Gemini cleaning failed, using original");
}

// Fallback: Return original uncleaned recipe
return recipe;
```

### 4. Transcript → Video Understanding Fallback

**In RecipeAnalyzer for YouTube:**

```typescript
if (transcript?.text && transcript.text.length > 100) {
  // Use transcript-based analysis (most accurate)
  return this.buildAnalysisPrompt(videoInfo, transcript);
} else {
  // No transcript - use Gemini's video understanding
  return this.buildVideoAnalysisPrompt(videoInfo, sourceUrl);
}
```

---

## 🚨 Error Messages

### User-Facing Error Messages

| Error Type | Message | Context |
|------------|---------|---------|
| Invalid URL | `"Invalid YouTube URL"` | URL format check failed |
| Video not found | `"Video not found or is private"` | noembed returned error |
| Not a cooking video | `"This video does not appear to be a cooking/recipe video. Confidence: X%"` | AI analysis |
| No recipe extracted | `"Could not extract recipe from video"` | AI returned no recipe |
| Low confidence | `"Could not extract valid ingredients or steps from this post"` | Social media with validation failure |
| Network error | `"Failed to fetch URL: HTTP XXX"` | HTTP error |
| Parse error | `"Failed to parse AI response"` | JSON parse failed |
| No captions | `"Could not fetch transcript using any method"` | All transcript methods failed |

### Debug/Log Messages

- `"WebsiteRecipeService: Found structured recipe data"` - Structured data detected
- `"WebsiteRecipeService: Recipe cleaned successfully"` - Gemini cleaning succeeded
- `"WebsiteRecipeService: Gemini produced invalid recipe, falling back to original"` - Cleaning validation failed
- `"Transcript: Successfully fetched via InnerTube API"` - Transcript method success
- `"Transcript: Trying youtube-transcript package..."` - Trying next method
- `"RecipeAnalyzer: Using transcript-based analysis"` - Analysis mode
- `"Recipe validation failed: valid_ingredients=0"` - Validation failure reason

---

## 🧪 Testing Validation

### Unit Testing Validation Function

```typescript
import { isValidRecipe } from '~/lib/recipe-scrapper/validation-utils';

describe('isValidRecipe', () => {
  it('rejects recipe with no title', () => {
    const recipe = { ingredients: [{name: 'egg', quantity: 1, unit: 'piece'}], steps: [{step: 1, title: 'Cook', description: 'Cook it'}] };
    expect(isValidRecipe(recipe)).toBe(false);
  });

  it('rejects recipe with "unknown ingredient"', () => {
    const recipe = {
      title: 'Test',
      ingredients: [{name: 'Unknown ingredient', quantity: 1, unit: 'piece'}],
      steps: [{step: 1, title: 'Cook', description: 'Cook it'}]
    };
    expect(isValidRecipe(recipe)).toBe(false);
  });

  it('rejects recipe with empty steps', () => {
    const recipe = {
      title: 'Test',
      ingredients: [{name: 'egg', quantity: 1, unit: 'piece'}],
      steps: [{step: 1, title: 'Step', description: '   '}]
    };
    expect(isValidRecipe(recipe)).toBe(false);
  });

  it('accepts valid recipe', () => {
    const recipe = {
      title: 'Scrambled Eggs',
      ingredients: [{name: 'egg', quantity: 2, unit: 'piece'}],
      steps: [{step: 1, title: 'Beat eggs', description: 'Beat the eggs in a bowl'}],
      servings: 2
    };
    expect(isValidRecipe(recipe)).toBe(true);
  });
});
```

---

## 📊 Error Recovery Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER PASTES URL                              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        URL VALIDATION                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  YouTube    │    │  Website    │    │   Social    │             │
│  │  Regex      │    │  Accept     │    │  Accept     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
              ┌─────────────┐             ┌─────────────┐
              │    VALID    │             │   INVALID   │
              └─────────────┘             └─────────────┘
                    │                             │
                    ▼                             ▼
          ┌─────────────────┐           ┌──────────────┐
          │ FETCH CONTENT   │           │ RETURN ERROR │
          └─────────────────┘           └──────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │ PARSE STRUCTURED│◀───────┐
          │     DATA        │        │
          └─────────────────┘        │
                    │                 │
          ┌─────────┴─────────┐       │
          │                   │       │
          ▼                   ▼       │
    ┌──────────┐        ┌──────────┐  │
    │  FOUND   │        │ NOT FOUND│  │
    └──────────┘        └──────────┘  │
          │                   │       │
          ▼                   ▼       │
    ┌──────────┐        ┌──────────┐  │
    │ CONVERT  │        │   AI     │  │
    │ TO RECIPE│        │ANALYSIS  │  │
    └──────────┘        └──────────┘  │
          │                   │       │
          └─────────┬─────────┘       │
                    │                 │
                    ▼                 │
          ┌─────────────────┐         │
          │   GEMINI CLEAN  │         │
          │   (Optional)    │         │
          └─────────────────┘         │
                    │                 │
          ┌─────────┴─────────┐       │
          │                   │       │
          ▼                   ▼       │
    ┌──────────┐        ┌──────────┐  │
    │ CLEANED  │        │ ORIGINAL │  │
    │ VALID?   │        │ FALLBACK │  │
    └──────────┘        └──────────┘  │
          │                   │       │
          └─────────┬─────────┘       │
                    │                 │
                    ▼                 │
          ┌─────────────────┐         │
          │  isValidRecipe() │◄────────┘
          └─────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
    ┌──────────┐        ┌──────────┐
    │   VALID  │        │ INVALID  │
    │ RETURN   │        │  ERROR   │
    └──────────┘        └──────────┘
```

---

## 🔧 Best Practices

### 1. Always Validate Before Saving

```typescript
// BAD: Save without validation
const recipe = await generateRecipe(url);
await database.save(recipe);

// GOOD: Validate before saving
const recipe = await generateRecipe(url);
if (!isValidRecipe(recipe)) {
  throw new Error("Generated recipe is invalid");
}
await database.save(recipe);
```

### 2. Use Promise.allSettled for Independent Operations

```typescript
// GOOD: Transcript fetch failure doesn't block video info
const [videoInfoResult, transcriptResult] = await Promise.allSettled([
  this.getVideoInfo(videoId),
  this.getTranscript(videoId),
]);
```

### 3. Provide Graceful Degradation

```typescript
// GOOD: Default values instead of undefined
return {
  title: parsed.title || "Untitled Recipe",
  ingredients: this.normalizeIngredients(parsed.ingredients) || [],
  servings: parsed.servings || 4,
  difficultyStars: Math.min(5, Math.max(1, parsed.difficultyStars || 3)),
};
```

### 4. Log Warnings for Non-Critical Failures

```typescript
// GOOD: Informative logging for debugging
if (!hasStructuredData) {
  log.info("WebsiteRecipeService: No structured data found, using AI analysis");
}

if (transcriptResult.status === "rejected") {
  log.warn(`Could not fetch transcript: ${transcriptResult.reason}`);
}
```

### 5. Use Specific Error Codes

```typescript
// GOOD: Error codes enable programmatic handling
throw new YouTubeServiceError(
  "Could not fetch transcript using any method",
  "NO_CAPTIONS" // Specific code
);

// Caller can handle differently based on code
if (error.code === "NO_CAPTIONS") {
  // Proceed without transcript
} else if (error.code === "VIDEO_NOT_FOUND") {
  // Fatal error - cannot proceed
}
```

---

## 📝 Summary

| Component | Validation | Error Handling | Fallback |
|-----------|------------|----------------|----------|
| **URL Input** | Regex pattern check | Return error immediately | None |
| **Content Fetch** | HTTP status codes | Throw with context | None |
| **Structured Data** | JSON parse, schema check | Return undefined | AI analysis |
| **AI Analysis** | Schema validation, response parse | Return error result | Confidence = 0 |
| **Recipe Output** | `isValidRecipe()` | Return error message | None (critical) |
| **Transcript** | Parse multiple formats | Try next method | Video understanding |
| **Gemini Cleaning** | `isValidRecipe()` | Log and use original | Original recipe |

---

*Created: February 2026*
*Last Updated: February 2026*
