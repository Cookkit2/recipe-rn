# Troubleshooting Guide

This document provides solutions to common issues encountered when developing and running DoneDish. If you encounter a problem not covered here, please check the [GitHub Issues](https://github.com/Fridgit00/fridgit/issues) or create a new issue.

## Table of Contents

- [Common Issues](#common-issues)
- [Getting Started Issues](#getting-started-issues)
- [iOS Build Issues](#ios-build-issues)
- [Android Build Issues](#android-build-issues)
- [Expo Go Limitations](#expo-go-limitations)
- [Camera & ML Features](#camera--ml-features)
- [Voice Features](#voice-features)
- [Database Issues](#database-issues)
- [Supabase Issues](#supabase-issues)
- [State Management Issues](#state-management-issues)
- [Performance Issues](#performance-issues)

---

## Common Issues

### Quick Reference

The most frequently encountered issues and their quick fixes:

| Issue                          | Quick Fix                                        |
| ------------------------------ | ------------------------------------------------ |
| Camera doesn't work in Expo Go | Use `npx expo run:ios` or `npx expo run:android` |
| iOS build fails                | Run `cd ios && pod install`                      |
| Database not syncing           | Check Supabase credentials in `.env`             |
| Voice recognition not working  | Requires physical device, not simulator          |
| Recipes not appearing          | Run database seed from `/debug` screen           |
| Development server won't start | Run `npm run clean` and restart                  |

---

## Getting Started Issues

### `npm install` fails with peer dependency errors

**Problem**: Installation fails with `ERESOLVE unable to resolve dependency tree`

**Solutions**:

1. Use `--legacy-peer-deps` flag:

   ```bash
   npm install --legacy-peer-deps
   ```

2. Clear npm cache and try again:

   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Ensure you're using Node.js 18+:
   ```bash
   node --version  # Should be 18.x or higher
   ```

### Development server won't start

**Problem**: Running `npm run dev` hangs or shows errors

**Solutions**:

1. Clear Expo and Metro cache:

   ```bash
   npm run clean
   rm -rf .expo
   ```

2. Kill existing Metro bundler:

   ```bash
   # macOS/Linux
   pkill -f "metro"
   pkill -f "expo"

   # Windows
   taskkill /F /IM node.exe
   ```

3. Check port 8081 is available:

   ```bash
   # macOS/Linux
   lsof -i :8081

   # Kill process if needed
   kill -9 <PID>
   ```

### Cannot connect to development server

**Problem**: Device shows "Cannot connect to development server"

**Solutions**:

1. Ensure device and computer are on same network
2. Check firewall settings allow port 8081
3. Try using tunnel mode:

   ```bash
   npx expo start --tunnel
   ```

4. For Android, use `adb reverse`:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

---

## iOS Build Issues

### iOS build fails with "Command PhaseScriptExecution failed"

**Problem**: Build fails during Xcode build with CocoaPods or script phase errors

**Solutions**:

1. Reinstall CocoaPods:

   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install --repo-update
   cd ..
   ```

2. Clean Xcode build folder:
   - Open `ios/fridgit.xcworkspace` in Xcode
   - Product > Clean Build Folder (Cmd+Shift+K)
   - Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`

3. Ensure Xcode command line tools are set:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

### `npm run ios` shows "No iOS simulator available"

**Problem**: Cannot find iOS simulator to run

**Solutions**:

1. List available simulators:

   ```bash
   xcrun simctl list devices
   ```

2. Open Xcode and install iOS simulators:
   - Xcode > Preferences > Components
   - Download desired iOS versions

3. Specify simulator explicitly:
   ```bash
   npm run ios -- --simulator="iPhone 15"
   ```

### New Architecture (Fabric/Hermes) errors

**Problem**: Build fails with architecture-related errors

**Solutions**:

1. Ensure `newArchEnabled: true` in `app.json`
2. Clean and rebuild:

   ```bash
   npm run clean
   npm run ios
   ```

3. Check that all dependencies support New Architecture:
   ```bash
   npx expo install --fix
   ```

---

## Android Build Issues

### Android build fails with "SDK location not found"

**Problem**: Gradle cannot find Android SDK

**Solutions**:

1. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable:

   ```bash
   # macOS (add to ~/.zshrc or ~/.bash_profile)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools

   # Linux (add to ~/.bashrc or ~/.zshrc)
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

2. In `android/local.properties`, set:
   ```properties
   sdk.dir=/path/to/your/Android/Sdk
   ```

### Gradle build fails with "Out of memory"

**Problem**: Build fails with Java heap space error

**Solutions**:

1. Increase Gradle memory in `android/gradle.properties`:

   ```properties
   org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
   ```

2. Clean Gradle cache:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

### "Failed to install app" error

**Problem**: APK fails to install on emulator/device

**Solutions**:

1. Uninstall existing app:

   ```bash
   adb uninstall com.fridgit.app
   ```

2. Check device has sufficient storage:

   ```bash
   adb shell df
   ```

3. Try release build:
   ```bash
   npm run android -- --variant release
   ```

---

## Expo Go Limitations

### Camera doesn't work in Expo Go

**Problem**: Camera feature shows errors or blank screen in Expo Go

**Explanation**: `react-native-vision-camera` requires native code compilation and **does not work** in Expo Go.

**Solution**: Use development build instead:

```bash
# Create development build
npx expo run:ios
# or
npx expo run:android
```

### Voice recognition not working in Expo Go

**Problem**: Speech recognition features fail in Expo Go

**Explanation**: `expo-speech-recognition` requires native modules not available in Expo Go.

**Solution**: Use development build:

```bash
npx expo run:ios
npx expo run:android
```

### "Module not found" errors in Expo Go

**Problem**: Various modules fail to load

**Common modules that don't work in Expo Go**:

- `react-native-vision-camera`
- `expo-speech-recognition`
- `react-native-fast-tflite`
- `@sentry/react-native` (certain features)

**Solution**: Use development build for full feature testing:

```bash
# iOS
npm run ios

# Android
npm run android
```

---

## Camera & ML Features

### Camera permission denied

**Problem**: App shows "Camera permission not granted"

**Solutions**:

1. **iOS** - Check `ios/fridgit/Info.plist` has:

   ```xml
   <key>NSCameraUsageDescription</key>
   <string>DoneDish needs camera access to scan ingredients</string>
   ```

2. **Android** - Check `android/app/src/main/AndroidManifest.xml` has:

   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   ```

3. Clear app permissions and re-grant:
   - iOS: Settings > DoneDish > Camera > Toggle off/on
   - Android: Settings > Apps > DoneDish > Permissions > Camera

### ML model not loading

**Problem**: Ingredient recognition fails or model doesn't load

**Solutions**:

1. Ensure model files exist in `assets/models/`:

   ```bash
   ls assets/models/
   # Should see .tflite files
   ```

2. Check `app.json` bundles assets:

   ```json
   {
     "expo": {
       "assetBundlePatterns": ["assets/**"]
     }
   }
   ```

3. Verify CoreML delegate is available on iOS:
   ```bash
   # Check device supports CoreML
   # Most iPhone X and newer support it
   ```

### Camera shows black screen

**Problem**: Camera view is black on physical device

**Solutions**:

1. Check device has multiple cameras:

   ```typescript
   const devices = cameraState.devices;
   // Ensure you're using 'back' camera
   ```

2. Ensure camera permission is granted before mounting:

   ```typescript
   const { cameraPermission } = useCameraPermissions();
   if (!cameraPermission) return <PermissionRequestScreen />;
   ```

3. Try switching camera position:
   ```typescript
   const device = cameras.find((d) => d.position === "back");
   ```

---

## Voice Features

### Voice not speaking

**Problem**: Text-to-speech doesn't produce audio

**Solutions**:

1. Check device volume is not muted
2. Check voice settings in app:

   ```typescript
   // Settings > Voice Cooking
   // Ensure voice is enabled
   ```

3. Test with simple TTS call:

   ```typescript
   import * as Speech from "expo-speech";

   Speech.speak("Hello world", { start: true });
   ```

4. On iOS, check VoiceOver isn't interfering:
   - Settings > Accessibility > VoiceOver > Off

### Speech recognition not working

**Problem**: App doesn't respond to voice commands

**Solutions**:

1. Check microphone permission:
   - iOS: Settings > DoneDish > Microphone
   - Android: Settings > Apps > DoneDish > Permissions

2. Verify device supports speech recognition:

   ```typescript
   import { isRecognitionAvailable } from "expo-speech-recognition";

   const available = await isRecognitionAvailable();
   if (!available) {
     // Show error: device doesn't support speech recognition
   }
   ```

3. Check language matches system language:
   ```typescript
   // Voice commands only work in English
   // System language must be set to English region
   ```

### Voice commands not recognized

**Problem**: Commands like "next" or "previous" not detected

**Solutions**:

1. Speak clearly and wait for prompt
2. Check supported commands in code:

   ```typescript
   // hooks/useSpeechRecognition.ts
   // Valid: next, previous, repeat, stop, ingredients
   ```

3. Test with exact command phrases:
   - "next" ✓
   - "go to next step" ✓
   - "continue" ✓

---

## Database Issues

### WatermelonDB not syncing

**Problem**: Changes not persisting or not updating UI

**Solutions**:

1. Check database is initialized:

   ```typescript
   import { database } from "~/data/db/database";

   // Should be called on app start
   database.get("pantry_items").query().fetch();
   ```

2. Verify collections are observed:

   ```typescript
   // Use @Nozbe/watermelondb/react
   import { useDatabase } from "@Nozbe/watermelondb/react";

   const database = useDatabase();
   // Components should be wrapped in DatabaseProvider
   ```

3. Check for batch commit:
   ```typescript
   await database
     .batch
     // Always use database.batch() for multiple writes
     ();
   ```

### Database schema version mismatch

**Problem**: `Database version mismatch` error

**Solutions**:

1. Increment schema version in `data/db/schema.ts`:

   ```typescript
   export default new Database({
     version: 8, // Increment this
   });
   ```

2. Provide migration for version change:

   ```typescript
   // See docs/PANTRY_MIGRATION.md for examples
   ```

3. For development, clear app data:
   ```bash
   # Use debug screen: /debug
   # Or uninstall/reinstall app
   ```

### "Table not found" errors

**Problem**: Querying a table that doesn't exist

**Solutions**:

1. Ensure table is defined in schema:

   ```typescript
   // data/db/schema.ts
   export const myTable = app.table("my_table", {
     // columns
   });
   ```

2. Re-run database setup:

   ```typescript
   // Uninstall app or clear data
   // Database will be recreated on next launch
   ```

3. Check for typos in table names:
   ```typescript
   // 'pantry_items' not 'pantryItems'
   ```

### "Migration failed" or "[SQLite] Migration failed"

**Problem**: WatermelonDB fails to load with migration error on app launch

**Solutions**:

1. **Clear app data (development)**: Delete the app from simulator/device and reinstall. This resets the database to a fresh state.

   ```bash
   # iOS Simulator: long-press app icon → Delete App
   # Then: bun ios  (or npm run ios)
   ```

2. **Rebuild native app**: After schema/migration changes, rebuild:

   ```bash
   bun ios  # or: npx expo run ios
   ```

3. **Check migration order**: Migrations in `data/db/migrations.ts` must form a continuous path. Schema version in `data/db/schema.ts` must match the highest migration.

4. **If persistent**: Check `onSetUpError` logs in `data/db/database.ts` for the actual SQL error. The underlying error may indicate a specific migration step that failed.

---

## Supabase Issues

### Supabase connection refused

**Problem**: `Failed to fetch` or network errors when calling Supabase

**Solutions**:

1. Verify environment variables are set:

   ```bash
   # .env
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Test Supabase connection:

   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

3. Check Supabase project is not paused:
   - Log in to Supabase dashboard
   - Check project status (not paused)

4. Verify network policies allow access:
   - Supabase Dashboard > Authentication > URL Configuration
   - Check redirect URLs include your app

### Authentication errors

**Problem**: `Invalid API key` or auth failures

**Solutions**:

1. Check `anon` key (not `service_role`):

   ```typescript
   // lib/supabase/client.ts
   // Should use EXPO_PUBLIC_SUPABASE_ANON_KEY
   ```

2. Verify Row Level Security (RLS) policies:

   ```sql
   -- In Supabase SQL Editor
   select * from pg_policies where tablename = 'recipes';
   ```

3. Test auth manually:
   ```typescript
   const { data, error } = await supabase.auth.signInAnonymously();
   console.log(error);
   ```

### Recipes not syncing from Supabase

**Problem**: Local database doesn't show recipes from cloud

**Solutions**:

1. Check sync is triggered:

   ```typescript
   // hooks/queries/useRecipeSync.ts
   // Sync should run on app launch and periodically
   ```

2. Verify Supabase has recipes:

   ```sql
   select count(*) from recipes;
   ```

3. Check API call succeeds:

   ```typescript
   const { data, error } = await recipeApi.getAll();
   console.log("Recipes:", data?.length, "Error:", error);
   ```

4. Use debug screen to inspect database:
   - Navigate to `/debug`
   - Check "Database Stats" section

---

## State Management Issues

### React Query data not updating

**Problem**: UI shows stale data after mutations

**Solutions**:

1. Invalidate queries after mutations:

   ```typescript
   const mutation = useMutation({
     mutationFn: (item) => pantryApi.create(item),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pantry"] });
     },
   });
   ```

2. Check query keys match:

   ```typescript
   // Both must use same key
   useQuery({ queryKey: ["pantry"] });
   invalidateQueries({ queryKey: ["pantry"] });
   ```

3. Verify QueryClient is properly configured:
   ```typescript
   // store/QueryProvider.tsx
   // Ensure defaultOptions are set correctly
   ```

### Context not updating across screens

**Problem**: Context state changes not reflected in other components

**Solutions**:

1. Ensure context wraps all screens:

   ```typescript
   // app/_layout.tsx
   <PantryProvider>
     <RecipeProvider>
       {/* All screens here */}
     </RecipeProvider>
   </PantryProvider>
   ```

2. Check for multiple context instances:

   ```typescript
   // Only create one provider at root level
   // Don't wrap individual screens in providers
   ```

3. Use context hook correctly:
   ```typescript
   // Must be called within provider tree
   const { itemTypeFilter } = usePantry();
   ```

### UI not refreshing after database changes

**Problem**: WatermelonDB changes not triggering UI updates

**Solutions**:

1. Use `withObservables` HOC or `useDatabase` hook:

   ```typescript
   import { useDatabase } from "@nozbe/watermelondb/react";

   const database = useDatabase();
   // Components will re-render on database changes
   ```

2. Ensure queries are observed:

   ```typescript
   import { observe } from "@nozbe/watermelondb";

   const items = observe(pantryQuery);
   // This creates an observable that triggers updates
   ```

3. Check you're not mutating state directly:

   ```typescript
   // ❌ Wrong
   items.push(newItem);

   // ✅ Correct
   await database.write(async () => {
     await collection.create((record) => {
       // create record
     });
   });
   ```

---

## Performance Issues

### App is slow/laggy

**Problem**: UI stutters or animations are choppy

**Solutions**:

1. Check for expensive operations in render:

   ```typescript
   // ❌ Don't do this in render
   const expensive = heavyComputation(data);

   // ✅ Use useMemo
   const expensive = useMemo(() => heavyComputation(data), [data]);
   ```

2. Optimize Reanimated worklets:

   ```typescript
   "worklet";
   // All animation code should be in worklets
   ```

3. Use React.memo for expensive components:

   ```typescript
   export const ExpensiveComponent = React.memo(({ data }) => {
     // component
   });
   ```

4. Check for unnecessary re-renders:
   ```bash
   # Add React DevTools
   npm install --save-dev @react-native/dev-memo
   ```

### Memory leaks

**Problem**: App crashes or slows down over time

**Solutions**:

1. Clean up subscriptions:

   ```typescript
   useEffect(() => {
     const subscription = observable.subscribe();

     return () => {
       subscription.unsubscribe(); // Clean up
     };
   }, []);
   ```

2. Remove listeners on unmount:

   ```typescript
   useEffect(() => {
     const subscription = Keyboard.addListener("keyboardDidShow", handler);

     return () => subscription.remove();
   }, []);
   ```

3. Check for growing arrays:
   ```typescript
   // Avoid unbounded growth
   const [items, setItems] = useState([]);
   // Instead, paginate or limit size
   ```

### Large bundle size

**Problem**: App takes long to load or install

**Solutions**:

1. Analyze bundle:

   ```bash
   npx expo bundle-size
   ```

2. Remove unused dependencies:

   ```bash
   npx depcheck
   ```

3. Use lazy loading for large features:

   ```typescript
   const VoiceSettings = lazy(() => import("./VoiceSettings"));
   ```

4. Enable Hermes for Android:
   ```json
   // app.json
   {
     "expo": {
       "jsEngine": "hermes"
     }
   }
   ```

---

## Debug Tools

### Debug Screen

Navigate to `/debug` in the app for:

- Database statistics
- Health checks
- Data seeding
- Data clearing
- Local storage inspection

### React DevTools

```bash
# Install DevTools
npm install --save-dev @react-native/dev-memo

# Start DevTools
npx react-devtools
```

### Flipper (Advanced)

For iOS/Android native debugging:

```bash
# Install Flipper
brew install flipper

# Add Flipper plugins
# See: https://fb.flipper.com/docs/getting-started/
```

### Sentry Error Tracking

The app integrates Sentry for error tracking. Check your Sentry dashboard for:

- Crash reports
- Performance metrics
- Release health

---

## Still Having Issues?

1. **Check logs**:

   ```bash
   # iOS Simulator
   Cmd+D > Debug

   # Android
   Cmd+M > Debug

   # Or use Expo CLI
   npx expo start --dev-client
   ```

2. **Search existing issues**:
   - [GitHub Issues](https://github.com/Fridgit00/fridgit/issues)

3. **Create detailed bug report**:
   - Platform (iOS/Android/Web)
   - React Native & Expo versions
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages/logs

4. **Check documentation**:
   - [Expo Docs](https://docs.expo.dev/)
   - [React Native Docs](https://reactnative.dev/)
   - [WatermelonDB Docs](https://nozbe.github.io/WatermelonDB/)
   - [Supabase Docs](https://supabase.com/docs)

---

## Common Error Messages

| Error                                                | Cause                      | Solution                                    |
| ---------------------------------------------------- | -------------------------- | ------------------------------------------- |
| `Unable to resolve module`                           | Missing dependency         | `npm install <package>`                     |
| `Network request failed`                             | Network/CORS issue         | Check API URL, CORS settings                |
| `undefined is not an object`                         | Null/undefined access      | Add optional chaining `?.`                  |
| `VirtualizedList should not be nested`               | FlatList inside ScrollView | Use FlatList only or change structure       |
| `Each child in a list should have a unique key prop` | Missing keys               | Add `key={item.id}` to list items           |
| `SyntaxError: Unexpected token`                      | Syntax error               | Check for missing brackets, quotes          |
| `TypeError: null is not an object`                   | Null reference             | Add null checks before accessing properties |
