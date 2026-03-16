# FAQ

Frequently asked questions about DoneDish development, architecture, and common issues.

## Table of Contents

- [Getting Started](#getting-started)
- [Development](#development)
- [Features](#features)
- [Troubleshooting Quick Fixes](#troubleshooting-quick-fixes)
- [Architecture](#architecture)
- [Platform-Specific](#platform-specific)

---

## Getting Started

### What are the prerequisites for developing DoneDish?

**Required:**

- Node.js 18+ ([Download](https://nodejs.org/))
- npm, yarn, or pnpm
- macOS with Xcode (for iOS development) OR Android Studio (for Android)

**Recommended:**

- Physical iOS or Android device (camera/voice features don't work well in simulators)
- Expo Go app (for quick testing)

### How do I install and run the app?

```bash
# Clone the repository
git clone https://github.com/Fridgit00/fridgit.git
cd fridgit

# Install dependencies
npm install

# Start development server
npm run dev
```

Then:

- **iOS**: Run `npm run ios` (Mac only)
- **Android**: Run `npm run android`
- **Expo Go**: Scan the QR code in terminal

### Why doesn't the camera work in Expo Go?

Expo Go doesn't support all native modules. The camera (`react-native-vision-camera`), voice recognition (`expo-speech-recognition`), and ML features require a **development build**.

**Solution**: Run `npm run ios` or `npm run android` instead of using Expo Go.

See [Expo Go Limitations](#expo-go-limitations) for more details.

### What environment variables do I need?

Create a `.env` file in the project root:

```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-key
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## Development

### What is the difference between `npm run dev` and `npm run ios`?

- **`npm run dev`**: Starts the Expo development server. You can connect Expo Go or a development build.
- **`npm run ios`**: Builds and runs the app in the iOS simulator using native code (required for camera/voice features).
- **`npm run android`**: Builds and runs the app on Android emulator/device.

### How do I clear the cache?

```bash
# Clear Expo, Metro, and reinstall dependencies
npm run clean

# Or manually
rm -rf node_modules .expo
npm install
```

### Why is iOS build failing?

**Most common cause**: CocoaPods needs to be reinstalled.

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npm run ios
```

See [iOS Build Issues](./TROUBLESHOOTING.md#ios-build-issues) in the troubleshooting guide.

### What's the difference between WatermelonDB and Supabase?

- **WatermelonDB**: Local offline-first database on the device. Fast, reactive queries.
- **Supabase**: Cloud backend for sync, authentication, and cross-device data sharing.

The app uses WatermelonDB as the primary database and syncs with Supabase when online.

---

## Features

### Why isn't voice recognition working?

Voice recognition requires:

1. **Physical device** (doesn't work in most simulators)
2. **Microphone permission** granted
3. **Development build** (not Expo Go)
4. **English language** set on device

Check [Voice Features](./TROUBLESHOOTING.md#voice-features) for detailed troubleshooting.

### Can I test the app on web?

Yes, run `npm run web`. However, **camera and voice features are not available** on web due to platform limitations.

### How do recipe imports work?

The app can import recipes from:

- **YouTube videos** (via transcript parsing)
- **Recipe websites** (via HTML scraping)
- **Manual entry**

See [TECH_STACK.md](./TECH_STACK.md#backend-services) for implementation details.

### What are the voice commands?

Supported voice commands during cooking mode:

- **"next"** - Go to next step
- **"previous"** - Go to previous step
- **"repeat"** - Re-read current step
- **"stop"** - Stop cooking mode
- **"ingredients"** - Show ingredients list

See [VOICE_GUIDED_COOKING.md](./VOICE_GUIDED_COOKING.md) for details.

---

## Troubleshooting Quick Fixes

### Expo Go Limitations

| Feature           | Works in Expo Go? | Solution                               |
| ----------------- | ----------------- | -------------------------------------- |
| Camera            | ❌ No             | Use `npm run ios` or `npm run android` |
| Voice Recognition | ❌ No             | Use development build                  |
| ML Features       | ❌ No             | Use development build                  |
| Basic UI          | ✅ Yes            | Expo Go is fine                        |

### Quick Fixes for Common Issues

| Issue                          | Quick Fix                                               |
| ------------------------------ | ------------------------------------------------------- |
| Camera permission denied       | Settings > DoneDish > Enable Camera/Microphone          |
| Development server won't start | Run `npm run clean`                                     |
| iOS build fails                | Run `cd ios && pod install`                             |
| Database not syncing           | Check `.env` has valid Supabase credentials             |
| Voice commands not recognized  | Ensure device language is English                       |
| Recipes not appearing          | Check Supabase connection and use `/debug` to seed data |

For detailed solutions, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).

---

## Architecture

### Why use Expo Router instead of React Navigation?

Expo Router provides:

- **File-based routing** (no navigation config needed)
- **Type-safe navigation** with TypeScript
- **Deep linking** built-in
- **Better Expo integration**

See [TECH_STACK.md](./TECH_STACK.md#navigation) for more details.

### Why use React Query AND WatermelonDB?

- **React Query**: Server state management, caching, and invalidation for Supabase API calls
- **WatermelonDB**: Local offline-first database for reactive queries

The pattern: Query Supabase → Cache in WatermelonDB → UI reads from WatermelonDB.

### Why use MMKV instead of AsyncStorage?

MMKV is:

- **Faster** (synchronous, no async/await needed)
- **More reliable** (better thread safety)
- Used for simple key-value pairs (settings, tokens)

WatermelonDB is used for complex relational data.

### What's the difference between Context providers?

| Provider                  | Purpose                         |
| ------------------------- | ------------------------------- |
| `PantryContext`           | Pantry filter, sheet animations |
| `RecipeContext`           | Recipe list state               |
| `RecipeDetailContext`     | Single recipe detail            |
| `RecipeStepsContext`      | Cooking mode navigation         |
| `CreateIngredientContext` | Ingredient creation flow        |
| `IngredientDetailContext` | Ingredient detail state         |

---

## Platform-Specific

### Do I need a Mac for iOS development?

**Yes**, for iOS development you need:

- macOS
- Xcode from the App Store

For Android development, you can use Windows, macOS, or Linux.

### Why does the app look different on iOS vs Android?

The app uses platform-specific components and styles for a native feel. Differences include:

- Navigation bars (UINavigationBar vs Toolbar)
- Font rendering
- Animations timing
- Permission dialogs

### Does the app work on iPad?

Yes, the app supports iPad. Some layouts may adapt to larger screens.

### What are the minimum OS versions?

- **iOS**: iOS 13+ (due to Expo SDK 55 requirements)
- **Android**: Android 6.0+ (API level 23)

---

## Development Workflow

### How do I add a new screen?

1. Create a new file in `app/` (e.g., `app/new-screen.tsx`)
2. Expo Router automatically creates the route `/new-screen`
3. Navigate with `router.push('/new-screen')`

### How do I add a new database table?

1. Add table definition to `data/db/schema.ts`
2. Create model in `data/db/models/`
3. Create repository in `data/db/repositories/`
4. Increment database version

See [PANTRY_MIGRATION.md](./PANTRY_MIGRATION.md) for examples.

### How do I style components?

Use Tailwind CSS utility classes via Uniwind:

```typescript
<View className="bg-primary rounded-2xl p-4">
  <Text className="text-white font-bold">Hello</Text>
</View>
```

See [TECH_STACK.md](./TECH_STACK.md#styling--ui) for styling conventions.

---

## Common Error Messages

### "Unable to resolve module"

**Cause**: Missing dependency

**Fix**: `npm install <module-name>`

### "Network request failed"

**Cause**: API URL incorrect or CORS issue

**Fix**: Check `EXPO_PUBLIC_SUPABASE_URL` in `.env`

### "VirtualizedList should not be nested"

**Cause**: Using FlatList inside ScrollView

**Fix**: Don't nest FlatList in ScrollView, or use a different layout

### "Each child in a list should have a unique key prop"

**Cause**: Missing `key` prop on list items

**Fix**: Add `key={item.id}` to list items

---

## Still Need Help?

1. **Check the Troubleshooting Guide**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. **Read the Tech Stack Docs**: [TECH_STACK.md](./TECH_STACK.md)
3. **Search GitHub Issues**: [fridgit/issues](https://github.com/Fridgit00/fridgit/issues)
4. **Create a new issue** with:
   - Platform (iOS/Android/Web)
   - React Native & Expo versions
   - Steps to reproduce
   - Error messages/logs

---

## Useful Links

- **[Expo Documentation](https://docs.expo.dev/)**
- **[React Native Documentation](https://reactnative.dev/)**
- **[WatermelonDB Documentation](https://nozbe.github.io/WatermelonDB/)**
- **[Supabase Documentation](https://supabase.com/docs)**
- **[Expo Router Docs](https://docs.expo.dev/router/introduction/)**
