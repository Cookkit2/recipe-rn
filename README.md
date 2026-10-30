# Cookkit

> Track your ingredients. Discover tailored recipes.

Cookkit is a smart cooking companion app that helps you manage your pantry, discover recipes based on what you have, and cook hands-free with voice guidance.

Cloud AI uses NVIDIA Nemotron on Nebius Token Factory: Lightning for recipe text and Super VL for ingredient photos, through an authenticated Supabase Edge Function. See [AI setup and deployment](docs/NEBIUS.md).

## NVIDIA Nemotron and Nebius Token Factory

Cookkit uses NVIDIA Nemotron models through [Nebius Token Factory](https://docs.tokenfactory.nebius.com/ai-models-inference/overview) to turn recipe text and ingredient photos into structured cooking data, tailor recipes to the pantry, and power the Search cooking assistant.

### Models and their roles

| Model                                                           | How Cookkit uses it                                                                                                                                                      | Implementation                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| NVIDIA Nemotron 3.5 Lightning — `nvidia/Nemotron-3_5-Lightning` | Extract ingredients, quantities and steps from captions, transcripts and recipe pages; clean up recipe data; tailor recipes to available ingredients.                    | [Text and vision provider](server/nebius.ts)                                                            |
| NVIDIA Nemotron 3.5 Lightning — `nvidia/Nemotron-3_5-Lightning` | Interpret cooking requests and stream assistant responses and tool calls for pantry management, dietary analysis, recipe suggestions and meal planning.                  | [Assistant gateway](server/chat-handler.ts), [agent and tools](lib/agent/)                              |
| NVIDIA Nemotron 3.5 Super VL — `nvidia/Nemotron-3.5-Super-VL`   | Identify ingredients from photos, interpret sampled recipe-video frames, and select a cover frame showing the complete finished dish when a suitable frame is available. | [Vision provider](server/nebius.ts), [video-cover selection](lib/recipe-scrapper/shared/video-cover.ts) |

The table reflects the current server defaults. The assistant model can also be set with the server-only `NEBIUS_AGENT_MODEL` secret. These are hosted inference calls; Cookkit does not bundle the model weights in the app.

### How inference fits into the app

```text
Recipe text / ingredient photo / sampled video frames
  → Cookkit app → authenticated Supabase nebius-ai function
  → Nebius Token Factory → NVIDIA Nemotron
  → JSON validation → recipe or ingredient data

Search cooking assistant
  → authenticated Supabase nebius-chat function
  → Nebius Token Factory → NVIDIA Nemotron Lightning
  → streamed response / tool call → tool execution in the app
```

The server selects the provider and model, keeps `NEBIUS_API_KEY` private, verifies user or guest sessions, and applies a persistent daily request quota. Recipe output is validated against JSON schemas with AJV, with one repair attempt for invalid output. Assistant tools execute through Cookkit's data layer so pantry edits update the same local inventory shown on screen.

YouTube imports first send usable captions, transcripts or description text to Nemotron. A server-side Gemini video fallback is used only when that text is missing or cannot produce a complete recipe. The retained legacy Gemini client is disabled. See [routing and fallback details](docs/NEBIUS.md#response-and-import-behavior).

### Where Token Factory accelerated our workflow

- **Managed model serving:** Hosted inference let us build the cooking flows without downloading model weights, provisioning GPUs or maintaining an inference server.
- **A shared API integration:** Token Factory's [OpenAI-compatible API](https://api.tokenfactory.nebius.com/docs) works with our TypeScript provider adapter and the Vercel AI SDK assistant. Moving text requests from Nemotron Nano to Lightning reused the existing request, streaming and tool interfaces.
- **Text and vision through one provider:** Routing text to Lightning and photos or sampled frames to Super VL kept recipe extraction, ingredient recognition and cover selection behind the same authenticated proxy.
- **Repeatable iteration:** A loopback development proxy and a small live recipe-extraction smoke test let us check actual Token Factory responses separately from the mocked Jest suite. The extraction adapter records token usage and an estimated inference cost to help inspect request budgets.

### Nebius tools and services used

**Nebius Token Factory managed inference** is the Nebius service used by Cookkit. The current integration uses its chat-completions API for text, vision, streaming and assistant tool calls. No additional Nebius services are configured in this repository.

The surrounding backend runs on **Supabase Auth, PostgreSQL, Storage and Edge Functions**. Expo/EAS handles native builds and distribution. Optional recipe web search uses Tavily. These services are separate from Nebius Token Factory.

### Quick demo for reviewers

1. Add pantry ingredients manually or identify an ingredient from a photo.
2. Import a public recipe link or paste a recipe caption, then view its structured ingredients and cooking steps.
3. Tailor a recipe to the ingredients in the pantry.
4. Open Search and ask a pantry question or request an ingredient change, such as “add 2 broccoli.”

For a small reproducible text-inference check without navigating the app, use `bun run ai:smoke` with the local proxy described below. It extracts a garlic-rice caption and prints the selected model, ingredient/step counts and token usage. Live inference requires a Token Factory key and incurs provider charges.

## ✨ Features

### 🥬 Smart Pantry Management

- **Visual Inventory**: Track ingredients with photos, quantities, and expiration dates
- **Storage Organization**: Organize by fridge, cabinet, or freezer
- **Expiration Tracking**: Color-coded system showing days until expiry
- **Smart Sorting**: Automatic sorting by expiration date (earliest first)
- **Camera Integration**: Add ingredients by snapping photos

### 🍳 AI-Powered Recipe Discovery

- **Personalized Recommendations**: Get recipes based on ingredients you actually have
- **Ingredient Matching**: Intelligent matching of pantry items to recipe requirements
- **Recipe Library**: Browse and save your favorite recipes
- **Cooking Mode**: Step-by-step guidance with integrated ingredient tracking

### 🎤 Voice-Guided Cooking

- **Hands-Free Commands**: Navigate steps using voice ("next", "previous", "repeat")
- **Auto-Read Steps**: Hear recipe steps read aloud automatically
- **Adjustable Settings**: Customize speech rate and voice preferences
- **Smart Recognition**: Pauses recognition during TTS playback to avoid self-triggering

### 💾 Offline-First Architecture

- **Local Database**: WatermelonDB for fast, reactive offline data
- **Cloud Sync**: Supabase integration for cross-device sync
- **Reactive Queries**: React Query for efficient data fetching and caching

### 🎨 Modern Design

- **Beautiful UI**: Material 3-inspired design system
- **Fluid Animations**: Physics-based spring animations throughout
- **Dark Mode**: Automatic theme switching
- **Typography**: Urbanist for UI, Bowlby One for branding

## 🚀 Getting Started

### Prerequisites

- Node.js 22.13+ (see `engines` in `package.json`)
- Bun 1.4.3 (matches CI and the binary lockfile version)
- iOS: macOS with an Xcode version and simulator runtime compatible with Expo SDK 58
- Android: Android Studio, an Android SDK and a configured emulator or connected device
- A Supabase project for cloud data, authentication and the deployed AI functions
- A Nebius Token Factory API key for live AI inference

Use a native development build. Cookkit includes WatermelonDB, MMKV, camera and other native modules that are not included in Expo Go.

### Installation

```bash
# Clone repository
git clone https://github.com/Cookkit2/recipe-rn.git
cd recipe-rn

# Install dependencies
bun install --frozen-lockfile

# Copy the environment template; replace placeholders before starting the app
cp .env.example .env.local
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to your project's public values, and configure `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` as described in [.env.example](.env.example). Provider keys and the Supabase service-role key are server-only: never prefix them with `EXPO_PUBLIC_` or commit them. RevenueCat billing is currently paused; its keys are not needed to unlock app features. Sentry reporting is optional for local development.

Project typechecking uses the native TypeScript 7 `tsc`. Jest uses the TypeScript 6
compiler API through the `typescript` compatibility alias, following the
[upstream side-by-side setup](https://kulshekhar.github.io/ts-jest/docs/next/guides/typescript-7).
Keep both compiler packages when updating dependencies.

### Running the App

**iOS Simulator** (first native build, macOS only)

```bash
bun run ios
```

**Android Emulator** (first native build)

```bash
bunx expo run:android
```

**Development Server** (after installing the native app)

```bash
bun run dev
```

**Web Browser** (limited native-feature support)

```bash
bun run web
```

Camera and voice flows also need testing on physical devices. Restart Metro after changing environment variables.

### Configure the AI backend

For the full app experience, deploy the authenticated Supabase functions:

1. Set up your Supabase database using the [deployment guide](docs/DEPLOYMENT.md). Apply the [AI quota migration](supabase/migrations/202610170001_ai_request_quota.sql) after reviewing the project's migration state.
2. Enable **Authentication → Sign In / Providers → Anonymous Sign-Ins** for guest AI access.
3. Add `NEBIUS_API_KEY` as a Supabase Edge Function secret. Optionally set `NEBIUS_AGENT_MODEL=nvidia/Nemotron-3_5-Lightning`; this is already the default. Supabase supplies its runtime URL, anon key and service-role key.
4. Deploy the functions to your project:

   ```bash
   bunx supabase login
   bunx supabase functions deploy nebius-ai nebius-chat --project-ref YOUR_PROJECT_REF
   ```

5. Leave `EXPO_PUBLIC_AI_PROXY_URL` unset so the app uses the deployed `nebius-ai` function. The assistant uses `nebius-chat` on the same Supabase project. Keep JWT verification enabled.

For optional YouTube video fallback, configure the server-only `GEMINI_API_KEY`. For recipe web search, configure `TAVILY_API_KEY` and deploy the `recipe-search` function. See [AI setup and deployment](docs/NEBIUS.md) for quota settings, model routing, security boundaries and fallback behavior.

### Local AI smoke test

For an iOS simulator extraction test, add these values to ignored `.env.local`:

```dotenv
NEBIUS_API_KEY=your_token_factory_key
EXPO_PUBLIC_AI_PROXY_URL=http://127.0.0.1:8787/ai
```

Run the proxy in one terminal and the live check in another:

```bash
bun run ai:dev
```

```bash
bun run ai:smoke
```

The smoke test makes a paid Token Factory request. The loopback proxy is for local extraction testing only; the Search assistant and physical devices require the deployed authenticated backend. Remove the proxy override before testing the deployed recipe function. `bun run agent:smoke` checks assistant streaming and tools against a local mock without calling Nebius.

Required environment variables are listed in [.env.example](.env.example). For EAS builds and secrets, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🏗️ Tech Stack

| Layer                 | Technology                                                           |
| --------------------- | -------------------------------------------------------------------- |
| **Framework**         | React Native 0.88 with Expo SDK 58                                   |
| **Navigation**        | Expo Router (file-based routing)                                     |
| **State Management**  | React Query + React Context                                          |
| **Local Database**    | WatermelonDB (SQLite)                                                |
| **Cloud Backend**     | Supabase (PostgreSQL + Auth + Storage)                               |
| **AI Inference**      | NVIDIA Nemotron via Nebius Token Factory and Supabase Edge Functions |
| **Assistant**         | Vercel AI SDK with streaming and on-device tools                     |
| **Key-Value Storage** | MMKV (primary) / AsyncStorage (fallback)                             |
| **Styling**           | Tailwind CSS v4 via Uniwind                                          |
| **Animations**        | React Native Reanimated 4                                            |
| **UI Components**     | @rn-primitives (shadcn-style)                                        |
| **Voice Recognition** | expo-speech-recognition                                              |
| **Text-to-Speech**    | expo-speech                                                          |
| **Camera**            | react-native-vision-camera                                           |
| **ML**                | react-native-fast-tflite                                             |
| **Payments**          | RevenueCat integration (billing currently paused)                    |

## 📁 Project Structure

```
recipe-rn/
├── app/                      # Expo Router screens (file-based routing)
│   ├── (auth)/               # Authentication screens
│   ├── ingredient/           # Ingredient CRUD
│   ├── recipes/              # Recipe screens
│   ├── profile/              # User profile, preferences
│   ├── grocery-list/         # Shopping list
│   └── onboarding/          # First-run experience
│
├── components/               # React components
│   ├── ui/                  # Primitive UI components
│   ├── Pantry/              # Pantry feature components
│   ├── Recipe/              # Recipe feature components
│   ├── Ingredient/          # Ingredient components
│   ├── Camera/              # Camera capture
│   └── VoiceCooking/       # Voice guidance
│
├── data/                    # Data layer
│   ├── db/                 # WatermelonDB (schema, models, repositories)
│   ├── supabase-api/       # Supabase integration
│   └── storage/            # MMKV storage wrapper
│
├── hooks/                   # Custom React hooks
│   ├── useVoiceCooking.ts   # Voice cooking logic
│   ├── useSpeechRecognition.ts # Speech recognition
│   └── ...
│
├── store/                   # React Context providers
│   ├── PantryContext.tsx
│   ├── RecipeContext.tsx
│   └── ...
│
├── utils/                   # Utility functions
│   ├── voice-cooking.ts      # TTS and command parsing
│   ├── subscription-utils.ts # RevenueCat integration
│   └── ...
│
├── types/                   # TypeScript definitions
├── constants/               # App constants
├── server/                  # Server-only AI provider adapters and handlers
├── supabase/                # Edge Functions and database migrations
├── scripts/                 # Local AI proxy, smoke checks and build helpers
└── docs/                    # Documentation
```

## 🔧 Development

### Code Style

- **TypeScript**: Strict mode enabled
- **Prettier**: Code formatting with Tailwind plugin
- **Tailwind CSS**: v4 with custom utility classes
- **Component Style**: Functional components with hooks

### Key Architectural Patterns

**Offline-First Data Flow**

```
UI Components → React Query Hooks → API Layer → WatermelonDB (local) / Supabase (cloud)
```

**Voice Cooking Flow**

```
Speech Recognition → Command Parsing → Action → TTS Feedback
```

**Storage Strategy**

- Complex relational data: WatermelonDB
- Simple key-value pairs: MMKV
- Cloud sync: Supabase

## 📱 Platform-Specific Notes

### iOS

- Requires native build (`bun run ios`)
- New Architecture enabled (Hermes v1)
- Camera/Mic permissions in `Info.plist`

### Android

- Edge-to-edge enabled
- Camera/Mic permissions in `AndroidManifest.xml`
- Build with `reactNativeReleaseLevel: experimental`

### Web

- Metro bundler with static output
- Limited native feature support (no camera, voice)

## 🧪 Testing

```bash
# Run tests
bun run test -- --runInBand --watchman=false

# Type-check TypeScript
bun run typecheck

# Run linter + typecheck
bun run lint
```

Use the package script for Jest; plain `bun test` invokes Bun's test runner. Normal Jest tests mock provider inference and do not incur Token Factory charges.

## 📦 Building for Production

Using [EAS Build](https://expo.dev/eas):

```bash
# Login to Expo
bunx eas-cli login

# Configure build
bunx eas-cli build:configure

# Build for iOS
bunx eas-cli build --platform ios

# Build for Android
bunx eas-cli build --platform android
```

## 🤝 Contributing

Contributions are welcome! Please read the documentation in `/docs` for context on the codebase.

### Development Workflow

1. Create a feature branch from `master`
2. Make your changes
3. Write tests (if applicable)
4. Ensure Prettier formatting
5. Submit a pull request

## 📄 Documentation

- **[Nebius / NVIDIA AI Integration](docs/NEBIUS.md)** - Model routing, local testing, Supabase deployment and YouTube fallback
- **[AI Context](docs/AI_CONTEXT.md)** - Comprehensive architecture guide for AI assistants
- **[App Documentation](docs/COOKKIT_APP_DOCUMENTATION.md)** - Feature details and design system
- **[Changelog](CHANGELOG.md)** - Version history and notable changes
- **[ADRs](docs/adr/)** - Architecture decision records (facade-only data access, notification handler registry, three-tier storage)
- **[Voice Cooking](docs/VOICE_GUIDED_COOKING.md)** - Voice features documentation
- **[Security](docs/SECURITY_IMPROVEMENTS.md)** - Security best practices
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[FAQ](docs/FAQ.md)** - Frequently asked questions

## 📝 License

Cookkit's original source code is licensed under the **MIT License**, an [OSI-approved open-source license](https://opensource.org/license/mit). See [LICENSE](LICENSE) for the full terms.

Third-party code, assets and model weights remain subject to their respective licenses. Hosted AI services are also governed by their providers' terms; Cookkit's MIT license does not relicense NVIDIA models or those services.

## 🙏 Acknowledgments

Built with:

- [NVIDIA Nemotron](https://www.nvidia.com/en-us/ai/) - Models for recipe text, assistant requests and vision
- [Nebius Token Factory](https://docs.tokenfactory.nebius.com/ai-models-inference/overview) - Managed model inference
- [Expo](https://expo.dev/) - React Native platform
- [WatermelonDB](https://nozbe.github.io/WatermelonDB/) - Reactive database
- [Supabase](https://supabase.com/) - Backend as a service
- [RevenueCat](https://www.revenuecat.com/) - In-app purchases
- [Lucide](https://lucide.dev/) - Icon library
- [Uniwind](https://uniwind.dev/) - Tailwind styling

---

Made with ❤️ for home cooks everywhere
