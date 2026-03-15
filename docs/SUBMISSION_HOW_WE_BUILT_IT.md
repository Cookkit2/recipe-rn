# 🚀 How We Built DoneDish: From Pantry Chaos to AI Chef

> **Hackathon Submission: Technical Deep Dive**

## 💡 The Inspiration

We've all been there: staring into a full fridge but feeling like there's "nothing to eat." The disconnect between **having ingredients** and **knowing what to cook** leads to decision fatigue, wasted food, and unnecessary takeout.

We built **DoneDish** to close this loop. It’s not just a recipe app; it’s an intelligent kitchen OS that connects **Inventory** → **Discovery** → **Cooking**.

---

## 🏗️ The Architecture: Local-First & AI-Powered

To ensure a snappy, reliable experience in the kitchen (where wifi can be spotty), we chose a **Local-First Architecture**:

- **Framework**: React Native (Expo SDK 54) for cross-platform performance.
- **Database**: **WatermelonDB** (SQLite) for instant, offline-capable data access.
- **Sync Engine**: **Supabase** for cloud backup and authentication.
- **AI Brain**: **Google Gemini 2.0 Flash** for multimodal analysis (Vision, Text, Logic).

---

## 🛠️ Feature Breakdown: Under the Hood

### 1. 📸 Visual Pantry: Seeing What You Have

_The Problem: Manual entry is tedious. Users won't type in "1 onion, 2 tomatoes."_

**How We Built It:**
We integrated **React Native Vision Camera** to capture high-res images of the fridge/pantry. This image is sent to **Gemini 1.5 Flash (Vision)**, which identifies multiple ingredients in a single pass.

- **The Tech**: The AI returns a JSON array of detected items (`name`, `quantity`, `expiry_estimate`).
- **The UX**: We map these directly to our `Stock` database model, automatically assigning storage categories (Fridge vs. Cabinet) based on food safety data.

### 2. 🧠 Recommendation Engine: The "Readiness Score"

_The Problem: Recommendations often ignore what you actually have._

**How We Built It:**
We implemented a **hybrid ranking algorithm** that runs locally on the device:

1.  **Readiness Score**: Calculates the percentage of ingredients you currently own for a recipe (e.g., "90% Ready").
2.  **Context Matching**: Filters by dietary prefs (from user profile) and appliances (air fryer, blender).
3.  **Result**: A sorted list of "High Viability" meals that minimizes grocery runs.

### 3. 🪄 Generative Adaptation: Real-Time Recipe Tailoring

_The Problem: Missing one ingredient usually stops a cook in their tracks._

**How We Built It:**
Instead of static database entries, our recipes are **dynamic**.

- **The Prompt**: When a user is missing an item (e.g., "No heavy cream"), we construct a prompt sending the _Base Recipe_ + _User's Pantry_ to Gemini.
- **The Output**: The LLM acts as a chef, suggesting a substitute (e.g., "Use Greek Yogurt + Milk") and **rewriting the cooking steps** to accommodate the change (e.g., "Add yogurt at the end to prevent curdling").
- **State Management**: We swap the static recipe view with this new "Tailored Recipe" seamlessly in the UI.

### 4. 📺 YouTube Import: From Video to Data

_The Problem: Cooking videos are great for inspiration but terrible for shopping._

**How We Built It:**
We built a pipeline to structure unstructured video content:

1.  **Extraction**: We extract the video transcript and metadata (NoAuth/oEmbed).
2.  **Analysis**: Gemini processes the transcript to extract structured data: `Ingredients` (with quantity/units) and `Steps`.
3.  **Smart Comparison**: The app cross-references this new list against the user's local `WatermelonDB` pantry.
4.  **Shopping List**: It generates a "Diff" list—only showing the items the user _actually_ needs to buy.

### 5. 🗣️ Hands-Free Voice Cooking

_The Problem: Touching a phone with dough-covered hands is gross._

**How We Built It:**
We utilized `expo-speech` and `expo-haptics` to build a voice-guided interface.

- **Step-by-Step State**: The app tracks the current step index.
- **Voice Commands**: We implemented a listen-loop (planned) and simple tap gestures to advance steps.
- **TTS (Text-to-Speech)**: The app reads instructions aloud, intelligently pausing for commas/periods to sound natural.

---

## 🏆 Challenges & Wins

- **Offline AI**: We optimized the app to cache AI responses. Once a recipe is tailored or imported, it's saved locally. You can cook in a basement with no signal.
- **Performance**: Using **FlashList** and **WatermelonDB**, our pantry list scrolls at 60fps even with hundreds of items, and search is instant ( < 16ms).

---

## 🔮 What's Next?

We are moving towards **fully autonomous kitchen management**—integrating grocery APIs for one-tap ordering and expanding our "Vision" capabilities to track consumption automatically.

**DoneDish** isn't just an app; it's the smart kitchen brain we've always wanted.
