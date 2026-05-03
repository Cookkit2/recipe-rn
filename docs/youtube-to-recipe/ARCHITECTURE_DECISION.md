# Architecture Decision: YouTube Recipe Import

> **Purpose**: Document the architecture options considered and the rationale for choosing the Hybrid approach.

---

## 📋 Problem Statement

We need to extract recipe information from YouTube cooking videos. The key challenges are:

1. Accessing video content/metadata
2. Determining if a video is cooking-related
3. Extracting structured recipe data (ingredients, steps, times)

---

## 🏗️ Options Considered

### Option A: YouTube Transcript + Gemini Analysis

**Flow:**

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User pastes    │ ──▶ │  Extract video   │ ──▶ │  Fetch YouTube  │ ──▶ │  Send to Gemini │
│  YouTube URL    │     │  ID from URL     │     │  transcript     │     │  for analysis   │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
                                                                                   │
                                                                                   ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Generate       │ ◀── │  Compare with    │ ◀── │  Store recipe   │ ◀── │  Parse & validate│
│  shopping list  │     │  pantry items    │     │  in WatermelonDB│     │  recipe JSON    │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
```

**Pros:**

- Uses existing Gemini API infrastructure
- Cost-effective (transcript is text-based)
- Fast processing (no video streaming required)
- Works with `gemini-2.0-flash-lite` model

**Cons:**

- Relies on YouTube having captions/transcripts
- May miss visual-only instructions

---

### Option B: YouTube API + Video Frame Analysis

**Flow:**

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User pastes    │ ──▶ │  Fetch video     │ ──▶ │  Extract key    │ ──▶ │  Send frames +  │
│  YouTube URL    │     │  metadata        │     │  frames         │     │  audio to Gemini│
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
```

**Pros:**

- Can analyze visual content
- Works with videos without captions

**Cons:**

- More expensive (multimodal API calls)
- Slower processing
- Complex video frame extraction
- Higher bandwidth usage

---

### Option C: Hybrid Approach ✅ CHOSEN

**Strategy:**

1. **Primary**: Try transcript-based analysis first (Option A)
2. **Fallback**: If no transcript, use video metadata + description analysis
3. **Future**: Add video frame analysis as premium feature (Option B)

**Why Hybrid?**

- Most cooking videos have transcripts (auto-generated or manual)
- Transcript provides the most accurate recipe text
- Graceful degradation when transcript unavailable
- Can upgrade to premium features later

---

## 📊 Data Source Comparison

### With YouTube API Key vs Without

| Data Field     | With API Key        | Without (noembed) | Impact on Recipe Extraction |
| -------------- | ------------------- | ----------------- | --------------------------- |
| `title`        | ✅                  | ✅                | Used for recipe name        |
| `channelName`  | ✅                  | ✅                | Low impact                  |
| `thumbnailUrl` | ✅ (multiple sizes) | ⚠️ (single size)  | Used for recipe image       |
| `description`  | ✅                  | ❌                | **~30-40% accuracy loss**   |
| `duration`     | ✅                  | ❌                | Filter shorts vs tutorials  |
| `tags`         | ✅                  | ❌                | Quick cooking validation    |
| `transcript`   | ✅ (scraped)        | ✅ (scraped)      | **Primary data source**     |

### Key Insight

**Transcript is the most valuable data source** for recipe extraction. Since transcript scraping works without an API key, we can build a functional MVP without YouTube Data API.

---

## 🎯 Implementation Phases

| Phase   | Metadata           | Transcript     | Recipe Analysis   |
| ------- | ------------------ | -------------- | ----------------- |
| **MVP** | noembed (limited)  | Scraped        | Gemini            |
| **v2**  | YouTube API (full) | Scraped        | Gemini            |
| **v3**  | YouTube API        | + Video frames | Gemini multimodal |

---

## 📝 Decision Summary

**Chosen: Option C (Hybrid) with MVP using NoAuth**

| Aspect             | Decision                                        |
| ------------------ | ----------------------------------------------- |
| Architecture       | Hybrid (transcript-first, fallback to metadata) |
| MVP Metadata       | noembed/oEmbed (no API key required)            |
| Transcript         | Direct scraping from YouTube                    |
| Recipe Analysis    | Gemini API (existing infrastructure)            |
| Future Enhancement | YouTube Data API v3 for full metadata           |

---

_Created: January 2026_
