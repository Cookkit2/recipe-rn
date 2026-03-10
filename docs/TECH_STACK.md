# Tech Stack Documentation

This document provides detailed technical documentation for the technologies used in DoneDish, including configuration, usage patterns, and integration points.

## Table of Contents

- [Core Framework](#core-framework)
- [Navigation](#navigation)
- [State Management](#state-management)
- [Database & Storage](#database--storage)
- [Backend Services](#backend-services)
- [AI & Machine Learning](#ai--machine-learning)
- [Styling & UI](#styling--ui)
- [Animations](#animations)
- [Native Modules](#native-modules)
- [Authentication & Payments](#authentication--payments)
- [Testing & Quality](#testing--quality)
- [Development Tools](#development-tools)

---

## Core Framework

### React Native 0.83+
**Why React Native?**
- Cross-platform development with native performance
- Large ecosystem and community support
- Hot reload for fast development

**Expo SDK 55 (Preview)**
- Managed workflow with ability to use native modules
- Over-the-air updates via EAS
- Consistent API across iOS, Android, Web

**Configuration**
```json
{
  "expo": {
    "newArchEnabled": true,
    "userInterfaceStyle": "automatic"
  }
}
```

**New Architecture (Hermes & Fabric)**
- Hermes V1 JavaScript engine for better performance
- Fabric renderer for improved UI rendering
- Enabled via `reanimated.staticFeatureFlags` and build properties

---

## Navigation

### Expo Router (File-based Routing)

**Why Expo Router?**
- Type-safe navigation with TypeScript
- File-based routing (no configuration needed)
- Deep linking and web URL handling built-in
- Seamless integration with Expo ecosystem

**Route Structure**
```
app/
├── (auth)/              # Authenticated routes group
├── index.tsx            # Root (pantry) screen
├── ingredient/          # Nested ingredient routes
│   ├── (create)/
│   └── [ingredientId]/
├── recipes/
│   └── [recipeId]/
├── profile/
├── grocery-list/
└── onboarding/
```

**Key Patterns**
- Route groups `(auth)` - shared layouts without affecting URL
- Dynamic routes `[id]` - typed parameters
- Stack navigation - default for nested routes
- Tab navigation - for profile/preferences sections

**Navigation Hooks**
```typescript
import { useRouter, useLocalSearchParams } from 'expo-router';

// Navigate
const router = useRouter();
router.push('/ingredient/create');
router.back();
router.replace('/recipes/123');

// Get params
const { id } = useLocalSearchParams<{ id: string }>();
```

---

## State Management

### React Query (TanStack Query)

**Why React Query?**
- Server state management with caching
- Automatic refetching and stale data handling
- Optimistic updates
- DevTools for debugging

**Configuration**
```typescript
// store/QueryProvider.tsx
<QueryClientProvider client={queryClient}>
  {children}
</QueryClientProvider>
```

**Query Defaults**
- `staleTime: 5 * 60 * 1000` - 5 minutes
- `cacheTime: 10 * 60 * 1000` - 10 minutes
- `networkMode: 'offlineFirst'` - Prefer cache over network
- `retry: 1` - Retry failed requests once

**Example Query**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['pantry'],
  queryFn: () => pantryRepository.getAll(),
});
```

**Example Mutation**
```typescript
const mutation = useMutation({
  mutationFn: (item: PantryItem) => pantryRepository.create(item),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pantry'] });
  },
});
```

### React Context

**Why Context?**
- Prop drilling for shared state
- Simple state that doesn't need complex management
- UI state (not server state)

**Contexts in DoneDish**
- `PantryContext` - Pantry filter, sheet animations
- `RecipeContext` - Recipe list state
- `RecipeDetailContext` - Single recipe detail
- `RecipeStepsContext` - Cooking mode navigation
- `CreateIngredientContext` - Ingredient creation flow
- `IngredientDetailContext` - Ingredient detail state

**Pattern Example**
```typescript
// store/PantryContext.tsx
export const PantryProvider = ({ children }: { children: ReactNode }) => {
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'fridge' | 'cabinet' | 'freezer'>('all');

  return (
    <PantryContext.Provider value={{ itemTypeFilter, setItemTypeFilter }}>
      {children}
    </PantryContext.Provider>
  );
};

export const usePantry = () => useContext(PantryContext);
```

---

## Database & Storage

### WatermelonDB (Local Database)

**Why WatermelonDB?**
- Reactive queries (auto-update UI when data changes)
- Offline-first architecture
- Fast SQLite database
- Supports relationships and aggregations

**Schema Definition**
```typescript
// data/db/schema.ts
import { app } from '@nozbe/watermelondb';

export default new Database({
  name: 'DoneDishDB',
  version: 5,
  adapter: new SQLiteAdapter(),
});

export const pantryItem = app.table('pantry_items', {
  name: t.string,
  quantity: t.number,
  unit: t.string,
  expiry_date: t.date,
  category: t.string,
  type: t.string as SchemaType<'fridge' | 'cabinet' | 'freezer'>,
  image_url: t.string,
  steps_to_store: t.json, // Array stored as JSON
});
```

**Repository Pattern**
```typescript
// data/db/repositories/PantryRepository.ts
class PantryRepository {
  async getAll() {
    return this.collection(PantryItem).query().fetch();
  }

  async create(item: PantryItem) {
    return this.batch.create(item);
  }
}
```

**Reactive Queries**
```typescript
// UI automatically updates when data changes
const items = useCollection(PantryItem, collection =>
  collection.query(Q.where('expiry_date', Q.gt(new Date()))).fetch()
);
```

### MMKV (Key-Value Storage)

**Why MMKV?**
- Very fast read/write performance
- Synchronous API (no async/await needed)
- Better than AsyncStorage for many small reads

**Usage Pattern**
```typescript
import { storage } from '~/data';

// Get value
const token = storage.get('auth_token');

// Set value
storage.set('auth_token', 'abc123');

// Remove value
storage.delete('auth_token');
```

**Storage Keys**
```typescript
// constants/storage-keys.ts
export const ONBOARDING_COMPLETED_KEY = "onboarding:completed";
export const VOICE_COOKING_SETTINGS_KEY = "voice:cooking_settings";
// ... more keys
```

---

## Backend Services

### Supabase

**Why Supabase?**
- Full-stack backend in minutes
- PostgreSQL database
- Real-time subscriptions
- Built-in authentication
- File storage for images

**Configuration**
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Auth Integration**
```typescript
import { supabase } from '~/lib/supabase/client';
import { AuthStrategy } from '~/auth/AuthStrategy';

export class SupabaseAuthStrategy implements AuthStrategy {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return data.session;
  }

  async signOut() {
    await supabase.auth.signOut();
  }
}
```

**Data Sync**
- WatermelonDB is primary (offline-first)
- Supabase syncs on app launch and network changes
- Recipes are cached locally for offline cooking

---

## AI & Machine Learning

### Google AI (Gemini)

**Purpose**: AI-powered recipe recommendations and intelligent features

**Features**
- **Recipe Recommendations**: Suggest recipes based on available ingredients
- **Ingredient Classification**: Identify ingredients from camera photos
- **Smart Matching**: Match pantry items to recipe requirements
- **Personalized Suggestions**: Tailor recipes based on user preferences

**Configuration**
```typescript
// lib/google-ai/client.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

**Recipe Recommendation Flow**
```typescript
// 1. Get pantry ingredients
const pantryItems = await pantryRepository.getAll();

// 2. Build context
const context = `
  Available ingredients: ${pantryItems.map(i => i.name).join(', ')}
  Dietary preferences: ${userPreferences.diet}
  Allergens to avoid: ${userPreferences.allergies.join(', ')}
`;

// 3. Request recommendations
const response = await model.generateContent(`
  Given these ingredients and preferences, suggest 5 recipes.
  ${context}
`);
```

**Ingredient Classification**
```typescript
// Camera capture → ML inference → ingredient name
import { classifyIngredient } from '~/hooks/model/classifyModel';

const predictedIngredient = await classifyIngredient(imageUri);
// Returns: { name: 'tomato', confidence: 0.92 }
```

### TensorFlow Lite

**Purpose**: On-device machine learning inference

**Why TensorFlow Lite?**
- Runs locally (no network needed)
- Fast inference for camera features
- Privacy-focused (data stays on device)
- Small model size

**Configuration**
```json
[
  "react-native-fast-tflite",
  {
    "enableCoreMLDelegate": true
  }
]
```

**Usage**
```typescript
import Tflite from 'react-native-fast-tflite';

// Load model
const tflite = new Tflite();
await tflite.loadModel({
  model: require('./assets/models/ingredient_classifier.tflite'),
});

// Run inference
const result = await tflite.runModel({
  input: imageTensor,
  output: ['prediction'],
});
```

### AI Integration Patterns

**Offline-First AI**
- Primary ML (TF Lite) works offline
- Fallback to cloud AI (Gemini) for complex tasks
- Cache AI responses in local database

**Optimistic UI**
- Show loading state while AI processes
- Display results incrementally as they arrive
- Provide manual override for critical features

**Error Handling**
```typescript
try {
  const recommendations = await getRecommendations(pantryItems);
} catch (error) {
  // Fallback to cached recommendations
  const cached = storage.get('cached_recommendations');
  if (cached) return JSON.parse(cached);

  // Show default popular recipes
  return getPopularRecipes();
}
```

---

## Styling & UI

### Tailwind CSS v4 (Uniwind)

**Why Tailwind?**
- Utility-first CSS
- Consistent design tokens
- Easy theming with CSS variables
- No style prop spaghetti

**Configuration**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(12 100% 50%)',
        // ... more colors
      },
      fontFamily: {
        urbanist: ['Urbanist', 'sans-serif'],
        display: ['Bowlby One', 'cursive'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

**Theme System**
- Light and dark mode via CSS variables
- Automatic theme switching based on system preference
- Consistent color tokens across components

### @rn-primitives (shadcn-style Components)

**Why @rn-primitives?**
- Accessible UI primitives
- Consistent design language
- Composition API for custom components
- Cross-platform behavior

**Available Components**
- `Button`, `Card`, `Input`, `Text`, `Switch`
- `Dialog`, `AlertDialog`, `DropdownMenu`
- `Tabs`, `Collapsible`, `Select`
- `Progress`, `Slider`, `Avatar`

**Usage Example**
```typescript
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

<Card className="bg-muted/50 rounded-3xl">
  <CardContent className="py-6">
    <Button onPress={handlePress} className="bg-primary">
      Press Me
    </Button>
  </CardContent>
</Card>
```

---

## Animations

### React Native Reanimated 4

**Why Reanimated?**
- 60fps animations on the UI thread
- Shared values for smooth gestures
- Complex animations made simple

**Configuration**
```json
{
  "reanimated": {
    "staticFeatureFlags": {
      "DISABLE_COMMIT_PAUSING_MECHANISM": true,
      "ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS": true,
      "IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS": true,
      "USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS": true
    }
  }
}
```

**Animation Patterns**

**Spring Animation**
```typescript
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(0);
scale.value = withSpring(1, { damping: 15, stiffness: 150 });
```

**Gesture Animation**
```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

const translateX = useSharedValue(0);
const gesture = Gesture.Pan()
  .onUpdate((event) => {
    translateX.value = event.translationX;
  })
  .onEnd(() => {
    translateX.value = withSpring(0);
  });

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }],
}));
```

---

## Native Modules

### expo-speech-recognition

**Purpose**: Hands-free voice commands during cooking

**Configuration**
```json
[
  "expo-speech-recognition",
  {
    "microphonePermission": "Allow $(PRODUCT_NAME) to use microphone for voice commands while cooking.",
    "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to use speech recognition for hands-free cooking."
  }
]
```

**Usage Pattern**
```typescript
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';

useSpeechRecognitionEvent('result', (event) => {
  const transcript = event.results[0]?.transcript;
  // Process command
});
```

### expo-speech

**Purpose**: Text-to-speech for reading recipe steps

**Usage Pattern**
```typescript
import * as Speech from 'expo-speech';

Speech.speak('Step 1. Heat the pan.', {
  language: 'en-US',
  rate: 0.9,
  onDone: () => console.log('Finished speaking'),
});
```

### react-native-vision-camera

**Purpose**: Camera capture for ingredient photos

**Configuration**
```json
[
  "react-native-vision-camera",
  {
    "cameraPermission": "Allow DoneDish to use your camera to take photos of ingredients"
  }
]
```

**Usage Pattern**
```typescript
import { Camera, useCameraDevice } from 'react-native-vision-camera';

const device = useCameraDevice('back');
<Camera device={device} />
```

### react-native-fast-tflite

**Purpose**: Machine learning inference on device (ingredient classification)

**Configuration**
```json
[
  "react-native-fast-tflite",
  {
    "enableCoreMLDelegate": true
  }
]
```

**Usage Pattern**
```typescript
import Tflite from 'react-native-fast-tflite';

const tflite = new Tflite();
await tflite.loadModel({
  model: require('./assets/model.tflite'),
});
const result = await tflite.runModel(input);
```

---

## Authentication & Payments

### RevenueCat

**Purpose**: In-app purchases and subscription management

**Configuration**
```json
{
  "dependencies": {
    "react-native-purchases": "^9.7.1",
    "react-native-purchases-ui": "^9.7.1"
  }
}
```

**Usage Pattern**
```typescript
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

// Check entitlements
const customerInfo = await Purchases.getCustomerInfo();
const hasPro = customerInfo.entitlements.active['DoneDish Pro'];

// Show paywall
const result = await RevenueCatUI.presentPaywallIfNeeded({
  requiredEntitlementIdentifier: 'DoneDish Pro',
});
```

### Supabase Auth

**Purpose**: User authentication

**Features**
- Email/password authentication
- OAuth providers (Google, etc.)
- Session management
- Row-level security (RLS)

---

## Testing & Quality

### Prettier

**Configuration**
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### TypeScript

**Configuration**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "~/*": ["./app/*"],
      "@/components/*": ["./components/*"]
    }
  }
}
```

---

## Development Tools

### Expo DevTools

**Features**
- Component inspector
- Network inspector
- Logs viewer
- Performance monitor

### Sentry

**Purpose**: Error tracking and performance monitoring

**Configuration**
```json
[
  "@sentry/react-native/expo",
  {
    "url": "https://sentry.io/",
    "project": "react-native",
    "organization": "donedish"
  }
]
```

**Usage Pattern**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-dsn',
  environment: __DEV__ ? 'development' : 'production',
});

// Capture errors
try {
  dangerousOperation();
} catch (error) {
  Sentry.captureException(error);
}
```

---

## Environment Variables

Required environment variables (create `.env` file):

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# RevenueCat
EXPO_PUBLIC_REVENUECAT_API_KEY=your-api-key

# Sentry (optional)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## Version Management

**Current Versions**
- React Native: 0.83.1
- Expo SDK: 55.0.0-preview.9
- React: 19.2.0
- WatermelonDB: 0.28.0
- Supabase: 2.57.0
- Reanimated: 4.2.1

**Upgrade Strategy**
- Follow Expo SDK release notes
- Test iOS/Android after upgrades
- Use EAS Build for production builds
- Monitor Sentry for regressions

---

## Performance Optimizations

### WatermelonDB
- Use `observe()` for reactive queries instead of polling
- Batch operations with `db.batch()`
- Lazy load large datasets

### React Query
- Set appropriate `staleTime` for each query
- Use `queryClient.setQueryData` for optimistic updates
- Prefetch data likely to be needed

### Reanimated
- Use `useDerivedValue` for computed animations
- Avoid worklet closures when possible
- Use `runOnJS` sparingly (expensive bridge crossing)

### Images
- Use `expo-image` for better memory management
- Optimize images with proper dimensions
- Cache network images

---

## Security Considerations

### API Keys
- Never commit `.env` files
- Use Expo's environment variables system
- Rotate keys regularly

### Authentication
- Secure tokens with MMKV
- Implement session timeouts
- Use Supabase Row-Level Security (RLS)

### Payments
- Validate receipts with RevenueCat
- Use server-side verification for production
- Store entitlement state locally for offline check

---

## Troubleshooting

For comprehensive troubleshooting guides, FAQs, and solutions to common issues, please refer to **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**.

### Quick Reference

**Camera not working**
- Check permissions in Info.plist / AndroidManifest.xml
- Ensure physical device (not simulator)
- Restart app after permissions grant
- See TROUBLESHOOTING.md for detailed camera troubleshooting

**WatermelonDB not updating**
- Check database schema version mismatch
- Ensure collection is observed for changes
- Clear app data and reinstall
- See TROUBLESHOOTING.md for database issues

**Reanimated errors**
- Check staticFeatureFlags configuration
- Ensure Hermes V1 is enabled
- Rebuild native app
- See TROUBLESHOOTING.md for animation troubleshooting

**Supabase sync failing**
- Check network connectivity
- Verify API keys are correct
- Check RLS policies in Supabase dashboard
- See TROUBLESHOOTING.md for backend issues

---

## Resources

### Official Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [WatermelonDB](https://nozbe.github.io/WatermelonDB/)
- [Supabase](https://supabase.com/docs)
- [Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Tailwind](https://tailwindcss.com/)

### Community
- [Expo Discord](https://discord.com/invite/expo)
- [React Native Reddit](https://www.reddit.com/r/reactnative/)
- [WatermelonDB Discord](https://discord.gg/NWpSjC)
