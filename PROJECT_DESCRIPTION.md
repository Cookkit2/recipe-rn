# Cookkit - Smart Cooking Companion App

**Cookkit** is a comprehensive, cross-platform mobile application built with React Native and Expo that serves as a smart cooking companion. It helps users manage their pantry inventory, discover personalized recipes based on what they have, and cook hands-free with voice-guided instructions.

## 🌟 Core Features

### 1. Smart Pantry Management

- **Visual Inventory Tracking:** Users can track ingredients with photos, quantities, and expiration dates.
- **Smart Organization:** Ingredients are categorized by storage location (fridge, cabinet, freezer).
- **Expiration System:** A color-coded system shows days until expiry, automatically sorting items by the earliest expiration date.
- **Camera Integration:** Add ingredients quickly by snapping photos using the device camera (`react-native-vision-camera`) and local ML processing (`react-native-fast-tflite`).

### 2. AI-Powered Recipe Discovery

- **Personalized Recommendations:** Suggests recipes based strictly on the ingredients the user actually has in their pantry.
- **Ingredient Matching:** Intelligently matches pantry items to recipe requirements using synonym mapping and categorization.
- **Recipe Details:** Comprehensive instructions, prep/cook times, difficulty ratings (1-5 stars), nutritional info (calories, serving sizes), and dietary tagging (e.g., vegetarian, gluten-free).

### 3. Voice-Guided Cooking Experience

- **Hands-Free Navigation:** Users can navigate cooking steps using voice commands like "next", "previous", or "repeat" (`expo-speech-recognition`).
- **Auto-Read Steps:** The app automatically reads recipe steps aloud using Text-to-Speech (`expo-speech`).
- **Smart Audio Control:** Automatically pauses voice recognition during TTS playback to prevent the app from triggering its own commands.

### 4. Interactive & Accessible UI

- **Modern Design System:** Inspired by Material 3, featuring fluid, physics-based spring animations (`react-native-reanimated`) and an elegant UI styled with Tailwind CSS (`uniwind`).
- **Typography:** Uses Urbanist for UI elements and Bowlby One for branding.
- **Responsive & Accessible:** Built-in dark mode support, screen reader compatibility (VoiceOver/TalkBack), and large touch targets designed for accessibility.

### 5. Robust Offline-First Architecture

- **Local First Data:** Uses WatermelonDB (SQLite) for fast, reactive, offline data access.
- **Cloud Syncing:** Integrates with Supabase (PostgreSQL, Auth, Storage) for robust cross-device synchronization and backend services.
- **Data Fetching:** Utilizes React Query for efficient server state management and caching.

### 6. Design Tokens & Theming System

The app uses a robust design token system managed via `uniwind` (Tailwind CSS v4 variant) and global CSS variables mapped to the `oklch` color space.

- **Typography Tokens:**
  - `font-urbanist-regular`, `font-urbanist-light`, `font-urbanist-medium`, `font-urbanist-semibold`, `font-urbanist-bold`, `font-urbanist-extrabold`, `font-urbanist-black`
  - `font-bowlby-one` for branding
- **Radii:** Base radius is `10px` with scale adjustments (`sm`, `md`, `lg`, `xl`).
- **Color Palettes (OKLCH):**
  - Configures full variants for `light` and `dark` modes.
  - Colors include primary, secondary, card, popover, muted, accent, destructive, border, input, ring, and specific shades for charting and sidebars.
  - Example Base App Colors (Light Mode): `background: oklch(0.92 0 20)`, `primary: oklch(0.637 0.257 29.23)`
  - Example Base App Colors (Dark Mode): `background: oklch(0.15 0 20)`, `primary: oklch(0.637 0.257 29.23)`

## 🏗️ Technical Stack & Architecture

- **Framework:** React Native (0.83+) with Expo (SDK 55 Preview), utilizing Expo Router for file-based navigation.
- **Programming Language:** TypeScript with strict mode enabled.
- **Local Database:** WatermelonDB (SQLite) acting as the primary source of truth for complex relational data.
- **Cloud Backend:** Supabase for PostgreSQL, Authentication (Email/Password, Social Login, Anonymous Mode), and remote storage.
- **State Management:**
  - _Server/Async State:_ React Query (`@tanstack/react-query`)
  - _UI State:_ React Context API
  - _Key-Value Persistence:_ MMKV (primary) / AsyncStorage (fallback)
- **Styling:** Tailwind CSS v4 via `uniwind`.
- **Animations:** React Native Reanimated 4 and React Native Gesture Handler.
- **UI Components:** Built on `@rn-primitives` (a shadcn-style component library).
- **Device Capabilities:**
  - Camera & ML: `react-native-vision-camera`, `react-native-fast-tflite`
  - Audio/Voice: `expo-speech`, `expo-speech-recognition`
- **Monetization:** RevenueCat (`react-native-purchases`) for managing subscriptions and in-app purchases.

## 📁 Project Structure highlights

- `app/`: Expo Router screens representing the main views (Pantry, Recipes, Profile, Grocery List).
- `components/`: Reusable React components grouped by feature (Pantry, Recipe, Camera, VoiceCooking).
- `data/`: The robust data layer containing WatermelonDB schemas (`db/`), API facades, and Supabase integrations.
- `hooks/`: Custom React hooks, notably housing React Query logic (`queries/`) and voice cooking logic.
- `store/`: React Context providers for managing global UI state.
- `assets/fonts/`: Custom fonts including Urbanist and BowlbyOne.

## 🎯 Target Audience & Value Proposition

Designed for home cooks, meal planners, and environmentally conscious users aiming to reduce food waste. Cookkit's visual pantry management combined with AI recipe matching saves time, inspires culinary creativity, and ensures ingredients are utilized before they expire.
