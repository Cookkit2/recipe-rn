# YouTube Recipe Import Feature - Implementation Plan

> **Purpose**: Plan the implementation of a feature that allows users to import recipes from YouTube cooking videos, automatically analyze them using AI, and store them locally in WatermelonDB.

---

## 📋 Feature Overview

### User Story
As a user, I want to paste a YouTube link and have the app:
1. **Validate** that the video is cooking-related
2. **Analyze** the video content to extract recipe information
3. **Generate** a complete recipe with ingredients and steps
4. **Store** the recipe in my local database
5. **Compare** required ingredients with my pantry
6. **Generate** a shopping/to-buy list for missing items

---

## 🏗️ Chosen Architecture

> **Decision**: Hybrid Approach with abstracted YouTube service layer
> 
> See [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) for options considered and rationale.

**Implementation Strategy:**
- MVP uses NoAuth (noembed) + transcript scraping
- Future upgrade path to YouTube Data API v3

**Flow:**
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User pastes    │ ──▶ │  YouTube Service │ ──▶ │  Fetch metadata │ ──▶ │  Fetch transcript│
│  YouTube URL    │     │  (abstracted)    │     │  + transcript   │     │  (if available) │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
                                                                                   │
                                                                                   ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Generate       │ ◀── │  Compare with    │ ◀── │  Store recipe   │ ◀── │  Gemini analysis│
│  shopping list  │     │  pantry items    │     │  in WatermelonDB│     │  + extraction   │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🗂️ File Structure

```
data/
├── api/
│   └── youtubeRecipeApi.ts          # Main YouTube recipe API entry point
│
├── youtube/
│   ├── types.ts                     # Interface definitions (IYouTubeService, etc.)
│   ├── YouTubeServiceFactory.ts     # Factory to create service instances
│   ├── NoAuthYouTubeService.ts      # noembed/oEmbed implementation (MVP)
│   ├── AuthYouTubeService.ts        # YouTube Data API v3 (future)
│   └── RecipeAnalyzer.ts            # Gemini-based recipe analysis
│
hooks/queries/
└── useYouTubeRecipeQueries.ts       # React Query hooks for YouTube import

utils/
└── youtube-utils.ts                 # URL parsing, validation utilities

types/
└── YouTubeRecipe.ts                 # Type definitions
```

---

## 📝 Type Definitions

### `types/YouTubeRecipe.ts`

```typescript
export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  thumbnailUrl: string;
  duration: string; // ISO 8601 duration
  publishedAt: string;
}

export interface YouTubeTranscript {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  language: string;
}

export interface RecipeAnalysisResult {
  isCookingVideo: boolean;
  confidence: number; // 0-1
  recipe?: GeneratedRecipe;
  errorMessage?: string;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficultyStars: number; // 1-5
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  steps: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  tags: string[];
  sourceUrl: string; // Original YouTube URL
  calories?: number;
}

export type YouTubeImportStatus = 
  | 'idle'
  | 'validating-url'
  | 'fetching-metadata'
  | 'fetching-transcript'
  | 'analyzing'
  | 'generating-recipe'
  | 'comparing-pantry'
  | 'complete'
  | 'error';

export interface YouTubeImportState {
  status: YouTubeImportStatus;
  videoInfo?: YouTubeVideoInfo;
  analysisResult?: RecipeAnalysisResult;
  shoppingList?: ShoppingListResult;
  error?: string;
}
```

---

## 🔧 Implementation Details

### 1. YouTube URL Parsing & Validation

**File:** `utils/youtube-utils.ts`

```typescript
/**
 * Extract video ID from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}
```

---

### 2. YouTube Service Abstraction Layer

#### Service Interface

**File:** `data/youtube/types.ts`

```typescript
/**
 * Core video information
 */
export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  description?: string;  // Only available with auth
  duration?: string;     // Only available with auth
}

/**
 * Transcript data
 */
export interface YouTubeTranscript {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  language: string;
}

/**
 * Combined result from YouTube service
 */
export interface YouTubeDataResult {
  videoInfo: YouTubeVideoInfo;
  transcript?: YouTubeTranscript;
  hasFullMetadata: boolean;
}

/**
 * Abstract interface - both NoAuth and Auth services implement this
 */
export interface IYouTubeService {
  getVideoInfo(videoId: string): Promise<YouTubeVideoInfo>;
  getTranscript(videoId: string): Promise<YouTubeTranscript>;
  getVideoData(videoId: string): Promise<YouTubeDataResult>;
  hasFullMetadata(): boolean;
}
```

#### Factory Pattern

**File:** `data/youtube/YouTubeServiceFactory.ts`

```typescript
import type { IYouTubeService } from './types';
import { NoAuthYouTubeService } from './NoAuthYouTubeService';
// import { AuthYouTubeService } from './AuthYouTubeService'; // Future

export type YouTubeServiceType = 'noauth' | 'auth';

export function createYouTubeService(type: YouTubeServiceType = 'noauth'): IYouTubeService {
  switch (type) {
    case 'noauth':
      return new NoAuthYouTubeService();
    case 'auth':
      throw new Error('AuthYouTubeService not yet implemented');
    default:
      return new NoAuthYouTubeService();
  }
}

export function getDefaultYouTubeService(): IYouTubeService {
  const hasApiKey = !!process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  // For MVP, always use noauth
  return createYouTubeService('noauth');
}
```

#### NoAuth Implementation (MVP)

**File:** `data/youtube/NoAuthYouTubeService.ts`

```typescript
import type { IYouTubeService, YouTubeVideoInfo, YouTubeTranscript, YouTubeDataResult } from './types';
import { log } from '~/utils/logger';

export class NoAuthYouTubeService implements IYouTubeService {
  private readonly NOEMBED_URL = 'https://noembed.com/embed';
  
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    const url = `${this.NOEMBED_URL}?url=https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch video info: ${response.status}`);
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    return {
      videoId,
      title: data.title || 'Untitled Video',
      channelName: data.author_name || 'Unknown Channel',
      thumbnailUrl: data.thumbnail_url || '',
      // description, duration NOT available in noembed
    };
  }
  
  async getTranscript(videoId: string): Promise<YouTubeTranscript> {
    return await this.scrapeTranscript(videoId);
  }
  
  async getVideoData(videoId: string): Promise<YouTubeDataResult> {
    const [videoInfo, transcript] = await Promise.allSettled([
      this.getVideoInfo(videoId),
      this.getTranscript(videoId),
    ]);
    
    if (videoInfo.status === 'rejected') {
      throw new Error(`Failed to fetch video: ${videoInfo.reason}`);
    }
    
    return {
      videoInfo: videoInfo.value,
      transcript: transcript.status === 'fulfilled' ? transcript.value : undefined,
      hasFullMetadata: false,
    };
  }
  
  hasFullMetadata(): boolean {
    return false;
  }
  
  /**
   * Scrape transcript from YouTube
   */
  private async scrapeTranscript(videoId: string): Promise<YouTubeTranscript> {
    // 1. Fetch video page
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(pageUrl);
    const pageHtml = await pageResponse.text();
    
    // 2. Extract caption URL from ytInitialPlayerResponse
    const captionUrl = this.extractCaptionUrl(pageHtml);
    if (!captionUrl) throw new Error('No captions available');
    
    // 3. Fetch and parse XML transcript
    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();
    
    return this.parseTranscriptXml(captionXml);
  }
  
  private extractCaptionUrl(html: string): string | null {
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (!match) return null;
    
    try {
      const playerResponse = JSON.parse(match[1]);
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!captions?.length) return null;
      
      // Prefer English
      const englishTrack = captions.find((t: { languageCode: string }) => 
        t.languageCode === 'en' || t.languageCode?.startsWith('en')
      );
      return (englishTrack || captions[0])?.baseUrl || null;
    } catch {
      return null;
    }
  }
  
  private parseTranscriptXml(xml: string): YouTubeTranscript {
    const segments: YouTubeTranscript['segments'] = [];
    const matches = xml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g);
    
    for (const match of matches) {
      segments.push({
        start: parseFloat(match[1]),
        duration: parseFloat(match[2]),
        text: this.decodeHtmlEntities(match[3]),
      });
    }
    
    return {
      text: segments.map(s => s.text).join(' '),
      segments,
      language: 'en',
    };
  }
  
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();
  }
}
```

#### Auth Implementation (Future)

**File:** `data/youtube/AuthYouTubeService.ts`

```typescript
import type { IYouTubeService, YouTubeVideoInfo, YouTubeTranscript, YouTubeDataResult } from './types';

/**
 * YouTube Data API v3 implementation (requires API key)
 * TODO: Implement when upgrading from MVP
 */
export class AuthYouTubeService implements IYouTubeService {
  private readonly API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  private readonly BASE_URL = 'https://www.googleapis.com/youtube/v3';
  
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    const response = await fetch(
      `${this.BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${this.API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch video info');
    
    const data = await response.json();
    if (!data.items?.length) throw new Error('Video not found');
    
    const video = data.items[0];
    return {
      videoId,
      title: video.snippet.title,
      channelName: video.snippet.channelTitle,
      thumbnailUrl: video.snippet.thumbnails.high?.url,
      description: video.snippet.description,
      duration: video.contentDetails.duration,
    };
  }
  
  async getTranscript(videoId: string): Promise<YouTubeTranscript> {
    // Transcript still needs scraping - YouTube API doesn't provide it
    // Reuse NoAuthYouTubeService scraping logic
    throw new Error('Not implemented - use NoAuth scraping');
  }
  
  async getVideoData(videoId: string): Promise<YouTubeDataResult> {
    throw new Error('Not implemented');
  }
  
  hasFullMetadata(): boolean {
    return true;
  }
}
```

---

### 3. Recipe Analyzer (Gemini Integration)

**File:** `data/youtube/RecipeAnalyzer.ts`

```typescript
import { GeminiAPI } from '~/utils/gemini-api';

export class RecipeAnalyzer {
  private gemini = new GeminiAPI();
  
  /**
   * Analyze video content to determine if it's cooking-related
   * and extract recipe information
   */
  async analyzeForRecipe(
    videoInfo: YouTubeVideoInfo,
    transcript?: YouTubeTranscript
  ): Promise<RecipeAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(videoInfo, transcript);
    
    const response = await this.gemini.generateContent(
      'gemini-2.0-flash',
      JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: this.getRecipeSchema(),
        }
      })
    );
    
    return this.parseResponse(response);
  }
  
  private buildAnalysisPrompt(
    videoInfo: YouTubeVideoInfo,
    transcript?: YouTubeTranscript
  ): string {
    return `
You are a recipe extraction assistant. Analyze the following YouTube video information and determine if it's a cooking/recipe video.

VIDEO TITLE: ${videoInfo.title}

CHANNEL: ${videoInfo.channelName}

DESCRIPTION:
${videoInfo.description}

${transcript ? `TRANSCRIPT:\n${transcript.text}` : 'No transcript available.'}

INSTRUCTIONS:
1. First, determine if this is a cooking/recipe video (isCookingVideo: true/false)
2. Provide a confidence score (0-1) for your determination
3. If it IS a cooking video, extract the complete recipe with:
   - Title (clean, formatted recipe name)
   - Description (brief summary of the dish)
   - Prep time and cook time in minutes
   - Number of servings
   - Difficulty (1-5 stars)
   - Complete ingredient list with quantities and units
   - Step-by-step instructions
   - Relevant tags (cuisine type, dietary info, etc.)
   - Estimated calories if mentioned

If quantities are vague (e.g., "some salt"), estimate reasonable amounts.
If prep/cook times aren't mentioned, estimate based on the recipe.
Normalize units to standard cooking measurements.

Return a valid JSON response matching the schema.
    `;
  }
  
  private getRecipeSchema() {
    return {
      type: 'object',
      properties: {
        isCookingVideo: { type: 'boolean' },
        confidence: { type: 'number' },
        errorMessage: { type: 'string' },
        recipe: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            prepMinutes: { type: 'integer' },
            cookMinutes: { type: 'integer' },
            servings: { type: 'integer' },
            difficultyStars: { type: 'integer' },
            calories: { type: 'integer' },
            tags: { type: 'array', items: { type: 'string' } },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' },
                  notes: { type: 'string' },
                },
                required: ['name', 'quantity', 'unit'],
              },
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'integer' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                },
                required: ['step', 'title', 'description'],
              },
            },
          },
        },
      },
      required: ['isCookingVideo', 'confidence'],
    };
  }
}
```

---

### 4. YouTube Recipe API

**File:** `data/api/youtubeRecipeApi.ts`

```typescript
import { getDefaultYouTubeService } from '~/data/youtube/YouTubeServiceFactory';
import { RecipeAnalyzer } from '~/data/youtube/RecipeAnalyzer';
import { databaseFacade } from '~/data/db/DatabaseFacade';
import { extractYouTubeVideoId, isValidYouTubeUrl } from '~/utils/youtube-utils';
import type { Recipe } from '~/types/Recipe';
import type { YouTubeImportStatus, GeneratedRecipe } from '~/types/YouTubeRecipe';
import type { ShoppingListResult } from '~/data/db/DatabaseFacade';

const recipeAnalyzer = new RecipeAnalyzer();

export const youtubeRecipeApi = {
  /**
   * Main entry point: Import a recipe from a YouTube URL
   */
  async importRecipeFromYouTube(
    url: string,
    onStatusChange?: (status: YouTubeImportStatus) => void
  ): Promise<{
    success: boolean;
    recipe?: Recipe;
    shoppingList?: ShoppingListResult;
    error?: string;
  }> {
    try {
      // Step 1: Validate URL
      onStatusChange?.('validating-url');
      if (!isValidYouTubeUrl(url)) {
        throw new Error('Invalid YouTube URL');
      }
      
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) throw new Error('Could not extract video ID');
      
      // Step 2: Get YouTube service (uses factory pattern)
      const youtubeService = getDefaultYouTubeService();
      
      // Step 3: Fetch video data (metadata + transcript)
      onStatusChange?.('fetching-metadata');
      const { videoInfo, transcript, hasFullMetadata } = await youtubeService.getVideoData(videoId);
      
      if (!hasFullMetadata) {
        console.log('Using limited metadata (noembed) - transcript will be primary source');
      }
      
      // Step 4: Analyze with Gemini
      onStatusChange?.('analyzing');
      const analysisResult = await recipeAnalyzer.analyzeForRecipe(videoInfo, transcript);
      
      if (!analysisResult.isCookingVideo) {
        throw new Error(
          `This video does not appear to be a cooking/recipe video. ` +
          `Confidence: ${(analysisResult.confidence * 100).toFixed(0)}%`
        );
      }
      
      if (!analysisResult.recipe) {
        throw new Error('Could not extract recipe from video');
      }
      
      // Step 5: Store recipe in database
      onStatusChange?.('generating-recipe');
      const recipe = await this.saveRecipeToDatabase(
        analysisResult.recipe,
        url,
        videoInfo.thumbnailUrl
      );
      
      // Step 6: Compare with pantry and generate shopping list
      onStatusChange?.('comparing-pantry');
      const shoppingList = await databaseFacade.getShoppingListForRecipe(recipe.id);
      
      onStatusChange?.('complete');
      return { success: true, recipe, shoppingList };
      
    } catch (error) {
      onStatusChange?.('error');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
  
  /**
   * Save generated recipe to WatermelonDB
   */
  async saveRecipeToDatabase(
    generatedRecipe: GeneratedRecipe,
    sourceUrl: string,
    thumbnailUrl?: string
  ): Promise<Recipe> {
    const recipeData = {
      title: generatedRecipe.title,
      description: generatedRecipe.description,
      imageUrl: thumbnailUrl,
      prepMinutes: generatedRecipe.prepMinutes,
      cookMinutes: generatedRecipe.cookMinutes,
      difficultyStars: generatedRecipe.difficultyStars,
      servings: generatedRecipe.servings,
      sourceUrl,
      calories: generatedRecipe.calories,
      tags: generatedRecipe.tags,
      steps: generatedRecipe.steps,
      ingredients: generatedRecipe.ingredients,
    };
    
    return await databaseFacade.createRecipeWithDetails(recipeData);
  },
  
  /**
   * Quick validation check (lightweight)
   */
  async validateCookingVideo(url: string): Promise<{
    isValid: boolean;
    isCooking: boolean;
    confidence: number;
    title?: string;
    thumbnailUrl?: string;
  }> {
    if (!isValidYouTubeUrl(url)) {
      return { isValid: false, isCooking: false, confidence: 0 };
    }
    
    const videoId = extractYouTubeVideoId(url)!;
    const youtubeService = getDefaultYouTubeService();
    const videoInfo = await youtubeService.getVideoInfo(videoId);
    
    // Quick keyword-based validation
    const cookingKeywords = [
      'recipe', 'cook', 'cooking', 'bake', 'baking', 'chef', 
      'kitchen', 'food', 'meal', 'dish', 'ingredient', 'how to make'
    ];
    
    const text = videoInfo.title.toLowerCase();
    const matches = cookingKeywords.filter(kw => text.includes(kw));
    const confidence = Math.min(matches.length / 3, 1);
    
    return {
      isValid: true,
      isCooking: confidence > 0.3,
      confidence,
      title: videoInfo.title,
      thumbnailUrl: videoInfo.thumbnailUrl,
    };
  },
};
```

---

### 5. React Query Hooks

**File:** `hooks/queries/useYouTubeRecipeQueries.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { youtubeRecipeApi } from '~/data/api/youtubeRecipeApi';
import { recipeQueryKeys } from './recipeQueryKeys';

export const youtubeQueryKeys = {
  all: ['youtube'] as const,
  validate: (url: string) => [...youtubeQueryKeys.all, 'validate', url] as const,
} as const;

/**
 * Validate a YouTube URL for cooking content
 */
export function useValidateYouTubeUrl(url: string) {
  return useQuery({
    queryKey: youtubeQueryKeys.validate(url),
    queryFn: () => youtubeRecipeApi.validateCookingVideo(url),
    enabled: !!url && url.length > 10,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Import a recipe from YouTube
 */
export function useImportYouTubeRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      url, 
      onStatusChange 
    }: { 
      url: string; 
      onStatusChange?: (status: string) => void;
    }) => youtubeRecipeApi.importRecipeFromYouTube(url, onStatusChange),
    
    onSuccess: (result) => {
      if (result.success && result.recipe) {
        // Invalidate recipe queries to include new recipe
        queryClient.invalidateQueries({ 
          queryKey: recipeQueryKeys.recipes() 
        });
        queryClient.invalidateQueries({ 
          queryKey: recipeQueryKeys.available() 
        });
      }
    },
  });
}
```

---

## 📊 Shopping List / To-Buy List

The shopping list functionality is **already implemented** in `DatabaseFacade.getShoppingListForRecipe()`. The YouTube import will use this existing method.

### How It Works:

```typescript
// From DatabaseFacade.ts
async getShoppingListForRecipe(recipeId: string): Promise<ShoppingListResult> {
  const recipeDetails = await this.recipes.getRecipeWithDetails(recipeId);
  
  for (const ingredient of recipeDetails.ingredients) {
    // Use findByNameOrSynonym for smart matching
    const stockItems = await this.stocks.findByNameOrSynonym(ingredient.name);
    const totalStock = stockItems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalStock === 0) {
      missingIngredients.push(ingredient);
    } else {
      availableIngredients.push({ ...ingredient, stockQuantity: totalStock });
    }
  }
  
  return { missingIngredients, availableIngredients };
}
```

### Enhanced Shopping List with Quantity Comparison

For more accurate shopping lists, we can enhance to compare quantities:

```typescript
// Enhancement for quantity-aware shopping list
async getDetailedShoppingList(recipeId: string): Promise<DetailedShoppingList> {
  const recipeDetails = await this.recipes.getRecipeWithDetails(recipeId);
  
  const result = {
    fullyAvailable: [],    // Have enough
    partiallyAvailable: [], // Have some, need more
    missing: [],            // Don't have at all
  };
  
  for (const ingredient of recipeDetails.ingredients) {
    const stockItems = await this.stocks.findByNameOrSynonym(ingredient.name);
    const totalStock = stockItems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalStock === 0) {
      result.missing.push({
        name: ingredient.name,
        needed: ingredient.quantity,
        unit: ingredient.unit,
      });
    } else if (totalStock >= ingredient.quantity) {
      result.fullyAvailable.push({
        name: ingredient.name,
        needed: ingredient.quantity,
        have: totalStock,
        unit: ingredient.unit,
      });
    } else {
      result.partiallyAvailable.push({
        name: ingredient.name,
        needed: ingredient.quantity,
        have: totalStock,
        toBuy: ingredient.quantity - totalStock,
        unit: ingredient.unit,
      });
    }
  }
  
  return result;
}
```

---

## 🛡️ Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid YouTube URL | Return error immediately with helpful message |
| Video not found | Display "Video not found or is private" |
| No transcript available | Proceed with metadata-only analysis (lower accuracy) |
| Not a cooking video | Show confidence score, suggest trying different video |
| Gemini API error | Retry with exponential backoff, then show error |
| Recipe extraction fails | Show partial data if available, allow manual edit |
| Network error | Show offline message, suggest retry |
| Rate limiting (YouTube/Gemini) | Queue requests, show wait time |

---

## 🔐 API Keys Required

1. **Gemini API Key** (already configured in `.env`)
   - `EXPO_PUBLIC_GEMINI_API_KEY`

2. **YouTube Data API Key** (new)
   - `EXPO_PUBLIC_YOUTUBE_API_KEY`
   - Enable YouTube Data API v3 in Google Cloud Console
   - Free tier: 10,000 quota units/day (~100-200 video info requests)

---

## 🎯 Implementation Priority

### Phase 1: Core Functionality (MVP)
1. ✅ YouTube URL validation (`youtube-utils.ts`)
2. ✅ Video metadata fetching (`YouTubeService.ts`)
3. ✅ Gemini recipe analysis (`RecipeAnalyzer.ts`)
4. ✅ Database storage (use existing `databaseFacade.createRecipeWithDetails`)
5. ✅ Shopping list (use existing `databaseFacade.getShoppingListForRecipe`)

### Phase 2: Enhanced Features
1. Transcript fetching for better accuracy
2. Progress status callbacks
3. Recipe preview before saving
4. Edit generated recipe before save

### Phase 3: Polish
1. Offline support (queue imports for later)
2. Batch import (multiple URLs)
3. Import history
4. Share imported recipes

---

## 📱 Future UI Integration Points

When implementing UI, consider these screens/components:

1. **YouTube Import Modal/Screen**
   - URL input field with paste button
   - Video preview (thumbnail, title)
   - Cooking video validation indicator
   - Import progress indicator

2. **Recipe Preview Sheet**
   - Show extracted recipe before saving
   - Allow editing ingredients/steps
   - Confirm or cancel import

3. **Shopping List View**
   - Show ingredients grouped by availability
   - Direct add-to-pantry for items purchased
   - Share shopping list

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// __tests__/youtube/youtube-utils.test.ts
describe('extractYouTubeVideoId', () => {
  it('extracts ID from standard URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });
  
  it('extracts ID from short URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });
  
  // ... more URL format tests
});

// __tests__/youtube/RecipeAnalyzer.test.ts
describe('RecipeAnalyzer', () => {
  it('identifies cooking videos correctly', async () => {
    // Mock Gemini response
    // Test analysis logic
  });
});
```

### Integration Tests
```typescript
// __tests__/youtube/youtubeRecipeApi.test.ts
describe('youtubeRecipeApi', () => {
  it('imports recipe from valid cooking video', async () => {
    const result = await youtubeRecipeApi.importRecipeFromYouTube(
      'https://www.youtube.com/watch?v=COOKING_VIDEO_ID'
    );
    
    expect(result.success).toBe(true);
    expect(result.recipe).toBeDefined();
    expect(result.recipe.ingredients.length).toBeGreaterThan(0);
  });
});
```

---

## 📋 Implementation Checklist

- [ ] Create `utils/youtube-utils.ts` with URL parsing functions
- [ ] Create `types/YouTubeRecipe.ts` with type definitions
- [ ] Create `data/youtube/YouTubeService.ts` for metadata fetching
- [ ] Create `data/youtube/YouTubeTranscriptService.ts` for transcript fetching
- [ ] Create `data/youtube/RecipeAnalyzer.ts` for Gemini analysis
- [ ] Create `data/api/youtubeRecipeApi.ts` as main entry point
- [ ] Create `hooks/queries/useYouTubeRecipeQueries.ts` for React Query hooks
- [ ] Add YouTube API key to `.env.example`
- [ ] Add unit tests for URL parsing
- [ ] Add integration tests for recipe import flow
- [ ] (Future) Create UI components for import flow

---

*Created: January 2026*
*Last Updated: January 2026*
