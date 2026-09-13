🚨 **Severity:** HIGH
💡 **Vulnerability:** The application used `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` as a fallback encryption key. Because `EXPO_PUBLIC_` variables are inlined at build time, the master encryption key was hardcoded directly into the application bundle, allowing anyone to extract it by decompiling the app.
🎯 **Impact:** Exposes all locally encrypted sensitive data.
🔧 **Fix:** Removed the insecure `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` fallback from `data/storage/storage-config.ts` and `.env.example`, ensuring keys are exclusively managed per-device through `SecureStore`.
✅ **Verification:** Verified tests pass and keys are no longer exposed in the bundle.
