# Cookkit

> Track your ingredients. Discover tailored recipes.

Cookkit is a smart cooking companion app that helps you manage your pantry, discover recipes based on what you have, and cook hands-free with voice guidance.

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

- Node.js 18+
- npm/yarn/pnpm
- iOS: macOS with Xcode (for iOS development)
- Android: Android Studio with SDK (for Android development)
- Expo Go app (for quick device testing)

### Installation

```bash
# Clone repository
git clone https://github.com/Fridgit00/fridgit.git
cd fridgit

# Install dependencies
npm install

# Copy environment template and fill in values (see docs/DEPLOYMENT.md)
cp .env.example .env

# Start development server
npm run dev
```

### Running the App

**Development Server**

```bash
npm run dev
```

**iOS Simulator** (Mac only)

```bash
npm run ios
```

**Android Emulator**

```bash
npm run android
```

**Web Browser**

```bash
npm run web
```

**Expo Go** (Quick device testing)

1. Run `npm run dev`
2. Download [Expo Go](https://expo.dev/go) on your phone
3. Scan QR code

> **Note**: Camera and voice features require physical device testing. Expo Go has limited support for some native features.

Required environment variables are listed in [.env.example](.env.example). For build and deployment (EAS, secrets), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🏗️ Tech Stack

| Layer                 | Technology                                    |
| --------------------- | --------------------------------------------- |
| **Framework**         | React Native 0.83+ with Expo SDK 55 (preview) |
| **Navigation**        | Expo Router (file-based routing)              |
| **State Management**  | React Query + React Context                   |
| **Local Database**    | WatermelonDB (SQLite)                         |
| **Cloud Backend**     | Supabase (PostgreSQL + Auth + Storage)        |
| **Key-Value Storage** | MMKV (primary) / AsyncStorage (fallback)      |
| **Styling**           | Tailwind CSS v4 via Uniwind                   |
| **Animations**        | React Native Reanimated 4                     |
| **UI Components**     | @rn-primitives (shadcn-style)                 |
| **Voice Recognition** | expo-speech-recognition                       |
| **Text-to-Speech**    | expo-speech                                   |
| **Camera**            | react-native-vision-camera                    |
| **ML**                | react-native-fast-tflite                      |
| **Payments**          | RevenueCat                                    |

## 📁 Project Structure

```
fridgit/
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

- Requires native build (`npm run ios`)
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
pnpm test

# Type-check TypeScript
pnpm typecheck

# Run linter + typecheck
pnpm lint
```

## 📦 Building for Production

Using [EAS Build](https://expo.dev/eas):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🤝 Contributing

Contributions are welcome! Please read the documentation in `/docs` for context on the codebase.

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Write tests (if applicable)
4. Ensure Prettier formatting
5. Submit a pull request

## 📄 Documentation

- **[AI Context](docs/AI_CONTEXT.md)** - Comprehensive architecture guide for AI assistants
- **[App Documentation](docs/COOKKIT_APP_DOCUMENTATION.md)** - Feature details and design system
- **[Changelog](CHANGELOG.md)** - Version history and notable changes
- **[ADRs](docs/adr/)** - Architecture decision records (facade-only data access, notification handler registry, three-tier storage)
- **[Voice Cooking](docs/VOICE_GUIDED_COOKING.md)** - Voice features documentation
- **[Security](docs/SECURITY_IMPROVEMENTS.md)** - Security best practices
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[FAQ](docs/FAQ.md)** - Frequently asked questions

## 📝 License

This project is proprietary. All rights reserved.

## 🙏 Acknowledgments

Built with:

- [Expo](https://expo.dev/) - React Native platform
- [WatermelonDB](https://nozbe.github.io/WatermelonDB/) - Reactive database
- [Supabase](https://supabase.com/) - Backend as a service
- [RevenueCat](https://www.revenuecat.com/) - In-app purchases
- [Lucide](https://lucide.dev/) - Icon library
- [Uniwind](https://uniwind.dev/) - Tailwind styling

---

Made with ❤️ for home cooks everywhere
