🎯 **What:** Removed the insecure fallback for the `MMKV_ENCRYPTION_KEY` using `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY`.
⚠️ **Risk:** Including encryption keys via `EXPO_PUBLIC_` exposes them at build-time directly into the application bundle, allowing anyone who decompiles or unpacks the app bundle to extract the master encryption key.
🛡️ **Solution:** Removed the `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` fallback in `data/storage/storage-config.ts` and the placeholder in `.env.example`, ensuring keys are exclusively managed per-device through `SecureStore` (or `NODE_ENV === "test"` overrides for tests).
