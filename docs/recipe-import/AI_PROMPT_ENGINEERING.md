# Recipe Import - AI Prompt Engineering

> **Purpose**: Comprehensive documentation of Gemini AI prompts, JSON schemas, temperature settings, and fallback strategies used in the DoneDish recipe import system.

---

## 📋 Overview

The DoneDish recipe import system uses **Google Gemini 2.0 Flash** for intelligent recipe extraction from multiple content sources. This document captures all prompt templates, schemas, and strategies used to ensure consistent, high-quality recipe data.

### AI Model Used

| Model | Purpose | Features |
|-------|---------|----------|
| **Gemini 2.0 Flash** | Primary recipe extraction | Fast response, structured output, native video understanding |
| **Gemini 2.0 Flash Lite** | Fallback for simple tasks | Lower cost, faster for basic text generation |

### Key Features

- **Structured JSON Output**: Uses `responseSchema` for type-safe recipe generation
- **Multi-modal Analysis**: Supports text, transcript, and video URL analysis
- **Confidence Scoring**: AI self-assesses extraction quality (0-1 scale)
- **Fallback Strategies**: Graceful degradation when data is incomplete

---

## 🎯 Temperature Settings

### Temperature Guidelines

| Temperature | Use Case | Rationale |
|-------------|----------|-----------|
| **0.0 - 0.2** | Data cleaning, normalization | Minimal variation, consistent output |
| **0.3 - 0.4** | Recipe extraction from structured content | Balanced creativity and accuracy |
| **0.4 - 0.5** | Recipe inference from sparse text | Higher creativity for missing data |

### Current Configuration

```typescript
// RecipeAnalyzer - Transcript/Video Analysis
temperature: 0.3  // Balanced accuracy for well-structured content

// SocialRecipeService - Text-only from metadata
temperature: 0.4  // Higher creativity due to sparse input data

// WebsiteRecipeService - Data cleaning
temperature: 0.2  // Minimal variation for normalization tasks
```

### Why These Values?

1. **Recipe extraction (0.3)**: Recipes have specific structures. We want consistency but need flexibility for varied formats.
2. **Social media (0.4)**: Descriptions are often incomplete. Higher creativity helps infer missing quantities.
3. **Data cleaning (0.2)**: Normalization should be deterministic. Lower temperature prevents unwanted variations.

---

## 📐 JSON Schemas

### Master Recipe Schema

Used across all services for consistent output format.

```typescript
{
  type: "object",
  properties: {
    isCookingVideo: { type: "boolean" },      // Content classification
    confidence: { type: "number" },            // 0-1 self-assessment score
    errorMessage: { type: "string" },          // Optional error description
    recipe: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        prepMinutes: { type: "integer" },
        cookMinutes: { type: "integer" },
        servings: { type: "integer" },
        difficultyStars: { type: "integer" },  // 1-5 scale
        calories: { type: "integer" },
        tags: {
          type: "array",
          items: { type: "string" }
        },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              notes: { type: "string" }
            },
            required: ["name", "quantity", "unit"]
          }
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              title: { type: "string" },
              description: { type: "string" }
            },
            required: ["step", "title", "description"]
          }
        }
      },
      required: [
        "title",
        "description",
        "prepMinutes",
        "cookMinutes",
        "servings",
        "difficultyStars",
        "ingredients",
        "steps"
      ]
    }
  },
  required: ["isCookingVideo", "confidence"]
}
```

### Cleaning Schema (WebsiteRecipeService)

Simplified schema for data normalization tasks.

```typescript
{
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    prepMinutes: { type: "integer" },
    cookMinutes: { type: "integer" },
    servings: { type: "integer" },
    difficultyStars: { type: "integer" },
    calories: { type: "integer" },
    tags: {
      type: "array",
      items: { type: "string" }
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" }
        },
        required: ["name", "quantity", "unit"]
      }
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          step: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["step", "title", "description"]
      }
    }
  },
  required: [
    "title",
    "description",
    "prepMinutes",
    "cookMinutes",
    "servings",
    "difficultyStars",
    "ingredients",
    "steps",
    "tags"
  ]
}
```

---

## 📝 Prompt Templates

### 1. YouTube Transcript Analysis

**Service**: `RecipeAnalyzer.analyzeForRecipe()`
**File**: `lib/recipe-scrapper/youtube/RecipeAnalyzer.ts`

**When Used**: When a video transcript is available (typically >100 characters)

**Prompt Template**:

```text
You are a recipe extraction assistant. Analyze the following YouTube video information and determine if it's a cooking/recipe video.

VIDEO TITLE: {videoInfo.title}

CHANNEL: {videoInfo.channelName}

{videoInfo.description ? `DESCRIPTION:\n${videoInfo.description}\n` : ""}

TRANSCRIPT:
{transcriptText}

INSTRUCTIONS:
1. First, determine if this is a cooking/recipe video (isCookingVideo: true/false)
2. Provide a confidence score (0-1) for your determination
3. If it IS a cooking video, extract the complete recipe with:
   - Title: Clean, formatted recipe name (e.g., "Homemade Chicken Tikka Masala")
   - Description: Brief 1-2 sentence summary of the dish
   - Prep time and cook time in minutes (estimate if not explicitly mentioned)
   - Number of servings (default to 4 if not mentioned)
   - Difficulty (1-5 stars based on technique complexity)
   - Complete ingredient list with quantities and units
   - Step-by-step instructions with clear titles and descriptions
   - Relevant tags (cuisine type, dietary info, meal type, etc.)
   - Estimated calories per serving if mentioned or can be reasonably estimated

IMPORTANT GUIDELINES:
- If quantities are vague (e.g., "some salt", "a pinch"), estimate reasonable amounts
- If prep/cook times aren't mentioned, estimate based on the recipe complexity
- Normalize units to standard cooking measurements (cups, tablespoons, teaspoons, grams, oz, etc.)
- Ensure ingredient names are singular and standardized (e.g., "onion" not "onions", "chicken breast" not "chicken breasts")
- For steps, create clear actionable titles (e.g., "Sauté the aromatics", "Simmer the sauce")
- Include cooking temperatures and times in step descriptions when mentioned
- If this is NOT a cooking video, set isCookingVideo to false and don't include a recipe

Return a valid JSON response matching the schema provided.
```

**Key Strategies**:
- Transcript is truncated at 15,000 characters to stay within token limits
- Explicit instruction to estimate missing values rather than leave blank
- Singular/plural normalization for ingredients
- Clear guidance on creating actionable step titles

---

### 2. YouTube Video URL Analysis (No Transcript)

**Service**: `RecipeAnalyzer.analyzeForRecipe()`
**File**: `lib/recipe-scrapper/youtube/RecipeAnalyzer.ts`

**When Used**: When no transcript is available, uses Gemini's native video understanding

**Prompt Template**:

```text
You are a recipe extraction assistant. Watch and analyze this YouTube cooking video to extract the recipe.

VIDEO TITLE: {videoInfo.title}
CHANNEL: {videoInfo.channelName}
VIDEO URL: {videoUrl}

INSTRUCTIONS:
1. Watch the video and determine if this is a cooking/recipe video (isCookingVideo: true/false)
2. Provide a confidence score (0-1) for your determination
3. If it IS a cooking video, extract the complete recipe by watching the video:
   - Title: Clean, formatted recipe name
   - Description: Brief 1-2 sentence summary of the dish
   - Prep time and cook time in minutes
   - Number of servings (default to 4 if not clear)
   - Difficulty (1-5 stars based on technique complexity)
   - Complete ingredient list with quantities and units (watch carefully for measurements)
   - Step-by-step instructions with clear titles and descriptions
   - Relevant tags (cuisine type, dietary info, meal type, etc.)
   - Estimated calories per serving if mentioned

IMPORTANT GUIDELINES:
- Pay close attention to ingredient quantities shown or mentioned in the video
- If quantities are vague, estimate reasonable amounts
- Normalize units to standard cooking measurements
- Ensure ingredient names are singular and standardized
- For steps, create clear actionable titles
- Include cooking temperatures and times from the video
- If this is NOT a cooking video, set isCookingVideo to false

Return a valid JSON response matching the schema provided.
```

**API Request Structure**:

```typescript
{
  contents: [{
    parts: [
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: videoUrl  // YouTube URL
        }
      },
      { text: prompt }
    ]
  }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: getRecipeSchema(),
    temperature: 0.3
  }
}
```

**Key Strategies**:
- Uses Gemini's multimodal capabilities to "watch" the video
- Emphasizes visual attention to measurements
- Falls back to transcript analysis when video is unavailable

---

### 3. Website Content Analysis

**Service**: `RecipeAnalyzer.analyzeWebsiteForRecipe()`
**File**: `lib/recipe-scrapper/youtube/RecipeAnalyzer.ts`

**When Used**: When website structured data is incomplete or unavailable

**Prompt Template**:

```text
You are a recipe extraction assistant. Analyze the following website content to determine if it contains a recipe.

PAGE TITLE: {websiteContent.title}

{websiteContent.description ? `PAGE DESCRIPTION: ${websiteContent.description}\n` : ""}

{structuredDataHint}

PAGE CONTENT:
{websiteContent.htmlContent}

INSTRUCTIONS:
1. Determine if this page contains a recipe (isCookingVideo: true if yes, false if no)
   Note: We use "isCookingVideo" for compatibility, but this applies to any recipe content.
2. Provide a confidence score (0-1) for your determination
3. If it IS a recipe page, extract the complete recipe with:
   - Title: Clean, formatted recipe name
   - Description: Brief 1-2 sentence summary of the dish
   - Prep time and cook time in minutes (estimate if not explicitly mentioned)
   - Number of servings (default to 4 if not mentioned)
   - Difficulty (1-5 stars based on technique complexity)
   - Complete ingredient list with quantities and units
   - Step-by-step instructions with clear titles and descriptions
   - Relevant tags (cuisine type, dietary info, meal type, etc.)
   - Estimated calories per serving if mentioned

IMPORTANT GUIDELINES:
- If quantities are vague (e.g., "some salt", "a pinch"), estimate reasonable amounts
- Normalize units to standard cooking measurements (cups, tablespoons, teaspoons, grams, oz, etc.)
- Ensure ingredient names are singular and standardized
- For steps, create clear actionable titles
- Include cooking temperatures and times in step descriptions when mentioned
- If this is NOT a recipe page, set isCookingVideo to false

Return a valid JSON response matching the schema provided.
```

**Structured Data Hint** (when available):

```text
STRUCTURED DATA FOUND:
The website contains Recipe schema data:
- Name: {structuredData.name || "N/A"}
- Description: {structuredData.description || "N/A"}
- Ingredients: {structuredData.recipeIngredient?.length || 0} items
- Instructions: {Array.isArray(structuredData.recipeInstructions) ? structuredData.recipeInstructions.length : "available"}

Use this structured data as the primary source, supplemented by the page content below.
```

**Key Strategies**:
- HTML is pre-processed to remove scripts, styles, navigation
- Content is truncated at 20,000 characters
- Structured data (JSON-LD) is highlighted when found
- Prioritizes schema.org data over AI extraction when available

---

### 4. Social Media Analysis (TikTok/Instagram)

**Service**: `SocialRecipeService.analyzeForRecipe()`
**File**: `lib/recipe-scrapper/SocialRecipeService.ts`

**When Used**: For TikTok and Instagram recipe posts

**Prompt Template**:

```text
You are a recipe extraction assistant. Analyze this {platformName} post to extract the recipe.

URL: {content.url}
PLATFORM: {platformName}
POST TITLE: {metadata.title}
POST DESCRIPTION: {metadata.description}

INSTRUCTIONS:
1. Analyze the title and description to determine if this is a cooking/recipe post (isCookingVideo: true/false).
   - NOTE: Since you cannot view the video, rely HEAVILY on the text. If it mentions food, cooking, or ingredients, assume it IS a recipe video.

2. Provide a confidence score (0-1).
   - If the description clearly contains ingredients and steps -> High confidence (0.8-1.0)
   - If the description describes a dish but lacks quantities -> Medium confidence (0.6-0.8)
   - If the description is empty or generic -> Low confidence (0.0-0.4)

3. Extract the recipe from the text context:
   - Title: Use the post title or infer a descriptive title
   - Description: Summarize the dish
   - Ingredients & Steps:
     - CAREFULLY PARSE the description for ingredients and instructions.
     - Instagram captions often put the full recipe in the caption/description.
     - If the full recipe is NOT in the text, do NOT make up "Unknown Ingredient" or generic steps.
     - You may estimate quantities if the ingredient is named (e.g. "salt" -> "1 tsp salt"), but do not invent ingredients.

4. Fills:
   - Prep/Cook time: Estimate if not found (e.g. 15m prep, 15m cook)
   - Servings: Default to 2
   - Difficulty: Estimate

IMPORTANT GUIDELINES:
- **CRITICAL**: If you cannot find any ingredients or steps in the text, return `confidence: 0`.
- DO NOT generate a "placeholder" recipe if you can't find the real one.
- If you return confidence < 0.5, the app will show an error to the user, which is BETTER than showing a fake recipe.

Return a valid JSON response matching the schema.
```

**Key Strategies**:
- Higher temperature (0.4) due to sparse input data
- Explicit instruction to return low confidence rather than fake data
- Post-processing validation filters out "Unknown ingredient"
- Relies on text-only (no video analysis for social URLs)

---

### 5. Data Cleaning Prompt

**Service**: `WebsiteRecipeService.cleanRecipeWithGemini()`
**File**: `lib/recipe-scrapper/WebsiteRecipeService.ts`

**When Used**: After extracting structured data from websites to normalize format

**Prompt Template**:

```text
You are a recipe data cleaning assistant. Clean and normalize the following recipe data.

INPUT RECIPE:
{JSON.stringify(recipe, null, 2)}

CLEANING INSTRUCTIONS:
1. **Ingredients**:
   - Normalize names to singular form (e.g., "onions" → "onion", "tomatoes" → "tomato")
   - Standardize common names (e.g., "bell pepper" not "capsicum")
   - Keep names lowercase
   - Ensure units are standardized (cup, tablespoon, teaspoon, gram, oz, pound, piece, etc.)
   - Convert fractions in quantities to decimals (e.g., 1/2 → 0.5)
   - Remove any HTML entities or special characters from names

2. **Steps**:
   - Create concise, action-oriented titles (e.g., "Sauté the aromatics", "Simmer the sauce")
   - Ensure descriptions are clear and complete
   - Remove any HTML entities or formatting artifacts
   - Include temperatures and times where mentioned

3. **Tags**:
   - Add relevant cuisine tags if missing (e.g., "italian", "asian", "mexican")
   - Add meal type tags (e.g., "dinner", "lunch", "breakfast")
   - Add dietary tags if applicable (e.g., "vegetarian", "gluten-free")
   - Keep tags lowercase
   - Remove duplicate or redundant tags

4. **Other fields**:
   - Keep title properly capitalized and without punctuation
   - Remove emotional/subjective terms from title (e.g., "Delicious", "Best Ever", "Juicy", "Authentic")
   - Ensure description is a clean 1-2 sentence summary
   - Estimate difficultyStars (1-5) based on technique complexity if it seems wrong
   - Estimate calories if not provided (based on common nutritional data)

Return the cleaned recipe as valid JSON with the exact same structure as the input.
```

**Key Strategies**:
- Lowest temperature (0.2) for deterministic normalization
- Explicit rules for removing clickbait titles
- Fallback to original recipe if cleaning produces invalid output
- Validates cleaned recipe with `isValidRecipe()` before returning

---

## 🔄 Response Parsing & Normalization

### Response Parsing Strategy

All services use a common response parsing pattern:

```typescript
private parseResponse(response: string, sourceUrl?: string): RecipeAnalysisResult {
  try {
    const parsed = JSON.parse(response);

    // Validate required fields
    if (typeof parsed.isCookingVideo !== "boolean") {
      throw new Error("Missing isCookingVideo field");
    }

    const result: RecipeAnalysisResult = {
      isCookingVideo: parsed.isCookingVideo,
      confidence: parsed.confidence ?? 0,
      errorMessage: parsed.errorMessage,
    };

    if (parsed.isCookingVideo && parsed.recipe) {
      result.recipe = {
        title: parsed.recipe.title || "Untitled Recipe",
        description: parsed.recipe.description || "",
        prepMinutes: parsed.recipe.prepMinutes || 15,
        cookMinutes: parsed.recipe.cookMinutes || 30,
        servings: parsed.recipe.servings || 4,
        difficultyStars: Math.min(5, Math.max(1, parsed.recipe.difficultyStars || 3)),
        ingredients: this.normalizeIngredients(parsed.recipe.ingredients),
        steps: this.normalizeSteps(parsed.recipe.steps),
        tags: parsed.recipe.tags || [],
        sourceUrl: sourceUrl || "",
        calories: parsed.recipe.calories,
      };
    }

    return result;
  } catch (error) {
    return {
      isCookingVideo: false,
      confidence: 0,
      errorMessage: "Failed to parse AI response",
    };
  }
}
```

### Ingredient Normalization

```typescript
private normalizeIngredients(ingredients): GeneratedRecipe["ingredients"] {
  if (!ingredients || !Array.isArray(ingredients)) {
    return [];
  }

  return ingredients.map((ing) => ({
    name: (ing.name || "Unknown ingredient").trim().toLowerCase(),
    quantity: ing.quantity ?? 1,
    unit: (ing.unit || "piece").trim().toLowerCase(),
    notes: ing.notes?.trim(),
  }));
}
```

### Step Normalization

```typescript
private normalizeSteps(steps): GeneratedRecipe["steps"] {
  if (!steps || !Array.isArray(steps)) {
    return [];
  }

  return steps.map((step, index) => ({
    step: step.step || index + 1,
    title: (step.title || `Step ${index + 1}`).trim(),
    description: (step.description || "").trim(),
  }));
}
```

---

## ✅ Validation Pipeline

### Post-AI Validation

After AI extraction, all recipes pass through validation:

```typescript
// validation-utils.ts
export function isValidRecipe(recipe: Partial<GeneratedRecipe>): boolean {
  if (!recipe) return false;

  // 1. Check title
  if (!recipe.title || recipe.title.trim().length === 0) {
    return false;
  }

  // 2. Check ingredients (exclude "Unknown ingredient")
  const validIngredients = Array.isArray(recipe.ingredients) &&
    recipe.ingredients.filter(
      (i) => i.name && i.name.trim().length > 0 &&
           i.name.toLowerCase() !== "unknown ingredient"
    );
  if (!validIngredients || validIngredients.length === 0) {
    return false;
  }

  // 3. Check steps
  const validSteps = Array.isArray(recipe.steps) &&
    recipe.steps.filter((s) => s.description && s.description.trim().length > 0);
  if (!validSteps || validSteps.length === 0) {
    return false;
  }

  // 4. Check servings
  if (recipe.servings !== undefined && recipe.servings <= 0) {
    return false;
  }

  return true;
}
```

### Validation Failure Strategy

```typescript
// SocialRecipeService example
if (!isValidRecipe(potentialRecipe)) {
  return {
    isCookingVideo: true,
    confidence: 0,  // Force error to user
    errorMessage: "Could not extract valid ingredients or steps from this post.",
  };
}
```

**Key Decision**: Return `confidence: 0` rather than partial data to prevent users from saving invalid recipes.

---

## 🛡️ Fallback Strategies

### Hierarchical Fallback

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT EXTRACTION                        │
├─────────────────────────────────────────────────────────────┤
│ WEBSITE                                                      │
│ 1. JSON-LD structured data (primary)                         │
│    ↓ incomplete                                              │
│ 2. AI analysis from HTML content                             │
│    ↓ fails                                                   │
│ 3. Return error with confidence: 0                           │
├─────────────────────────────────────────────────────────────┤
│ YOUTUBE                                                       │
│ 1. Transcript-based AI analysis (preferred)                  │
│    ↓ no transcript                                           │
│ 2. Video URL analysis with Gemini's native understanding     │
│    ↓ fails                                                   │
│ 3. Return error with confidence: 0                           │
├─────────────────────────────────────────────────────────────┤
│ SOCIAL MEDIA                                                  │
│ 1. Text-based AI analysis from metadata                      │
│    ↓ sparse description                                      │
│ 2. Return low confidence (user sees error)                   │
└─────────────────────────────────────────────────────────────┘
```

### Transcript Fetch Fallback (YouTube)

```
InnerTube API (primary)
    ↓ fails
youtube-transcript npm package
    ↓ fails
Direct page scraping (ytInitialPlayerResponse)
    ↓ fails
Use video URL for Gemini (no transcript)
```

### Cleaning Fallback (Website)

```typescript
try {
  const cleanedRecipe = await cleanRecipeWithGemini(recipe);

  if (!isValidRecipe(cleanedRecipe)) {
    log.warn("Gemini produced invalid recipe, falling back to original");
    return recipe;  // Return original structured data
  }

  return cleanedRecipe;
} catch (error) {
  log.warn("Failed to clean recipe, using original data");
  return recipe;  // Return original on error
}
```

---

## 💰 Cost Monitoring

### Token Usage Tracking

```typescript
// utils/gemini-api.ts
const PRICING = {
  prompt: 0.075,      // $0.075 per 1M tokens
  candidates: 0.30,   // $0.30 per 1M tokens
} as const;

export const calculateTokenCost = (usage): TokenUsage => {
  const promptCost = (usage.promptTokenCount / 1_000_000) * PRICING.prompt;
  const candidatesCost = (usage.candidatesTokenCount / 1_000_000) * PRICING.candidates;

  return {
    ...usage,
    totalTokenCount: usage.promptTokenCount + usage.candidatesTokenCount,
    estimatedCost: promptCost + candidatesCost,
  };
};
```

### Logged Output Example

```
Gemini API Token Usage - Prompt: 1,234, Candidates: 567, Total: 1,801, Est. Cost: $0.000198
```

---

## 📊 Example AI Responses

### Successful Recipe Extraction

**Input**: YouTube transcript for "Homemade Pizza"

```json
{
  "isCookingVideo": true,
  "confidence": 0.95,
  "recipe": {
    "title": "Homemade Pizza",
    "description": "A classic homemade pizza with crispy crust and simple toppings",
    "prepMinutes": 20,
    "cookMinutes": 15,
    "servings": 4,
    "difficultyStars": 3,
    "calories": 285,
    "tags": ["italian", "dinner", "comfort food"],
    "ingredients": [
      { "name": "flour", "quantity": 500, "unit": "grams" },
      { "name": "water", "quantity": 325, "unit": "ml" },
      { "name": "yeast", "quantity": 7, "unit": "grams" },
      { "name": "salt", "quantity": 10, "unit": "grams" },
      { "name": "olive oil", "quantity": 2, "unit": "tablespoons" }
    ],
    "steps": [
      {
        "step": 1,
        "title": "Prepare the dough",
        "description": "Mix flour, yeast, and salt. Add water and olive oil. Knead for 10 minutes until smooth."
      },
      {
        "step": 2,
        "title": "Let dough rise",
        "description": "Cover and let rise in a warm place for 1 hour until doubled in size."
      }
    ]
  }
}
```

### Non-Cooking Content Response

**Input**: YouTube video about gaming

```json
{
  "isCookingVideo": false,
  "confidence": 0.98,
  "errorMessage": "This is not a cooking video"
}
```

### Low Confidence Response

**Input**: Instagram post with minimal description

```json
{
  "isCookingVideo": true,
  "confidence": 0.3,
  "errorMessage": "Insufficient recipe information in post description"
}
```

---

## 🔧 Best Practices

### When Modifying Prompts

1. **Test incrementally**: Change one instruction at a time and evaluate results
2. **Monitor confidence scores**: Track average confidence across test cases
3. **Validate edge cases**: Test with short descriptions, no transcript, etc.
4. **Check token usage**: Longer prompts = higher costs

### Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| AI invents ingredients | Add explicit instruction to return `confidence: 0` when data is missing |
| Title includes clickbait | Add cleaning step to remove emotional words |
| Ingredients pluralized | Post-process to singular form |
| Units inconsistent | Normalize in cleaning step |
| Steps too vague | Add instruction to create actionable titles |

### Prompt Optimization Checklist

- [ ] Temperature set appropriately for task
- [ ] Schema matches expected output structure
- [ ] Fallback instructions for missing data
- [ ] Clear examples of expected format
- [ ] Explicit guidance on quantities/units
- [ ] Instruction to estimate vs. omit values
- [ ] Confidence scoring criteria defined

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| [RECIPE_IMPORT_ARCHITECTURE.md](./RECIPE_IMPORT_ARCHITECTURE.md) | System architecture overview |
| [../AI_CONTEXT.md](../AI_CONTEXT.md) | General project context for AI |
| [lib/recipe-scrapper/youtube/RecipeAnalyzer.ts](../../lib/recipe-scrapper/youtube/RecipeAnalyzer.ts) | Source: YouTube prompts |
| [lib/recipe-scrapper/SocialRecipeService.ts](../../lib/recipe-scrapper/SocialRecipeService.ts) | Source: Social media prompts |
| [lib/recipe-scrapper/WebsiteRecipeService.ts](../../lib/recipe-scrapper/WebsiteRecipeService.ts) | Source: Website prompts |
| [lib/recipe-scrapper/validation-utils.ts](../../lib/recipe-scrapper/validation-utils.ts) | Source: Validation logic |
| [utils/gemini-api.ts](../../utils/gemini-api.ts) | Source: API wrapper and pricing |

---

## 📝 Changelog

### February 2026
- Initial documentation of all prompt templates
- Documented JSON schemas for each service
- Added temperature setting guidelines
- Documented fallback strategies

---

*Created: February 2026*
*Last Updated: February 2026*
