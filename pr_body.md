🎯 **What:**
Wrapped the `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` fallback logic in an `if (__DEV__)` condition in `data/storage/storage-config.ts` to ensure it is only accessible during development.

⚠️ **Risk:**
Using public environment variables (`EXPO_PUBLIC_*`) for symmetric encryption keys is dangerous because they are inlined into the client bundle at build time. If left unfixed, this could allow attackers to extract the symmetric key from production builds and decrypt sensitive local storage (MMKV) data.

🛡️ **Solution:**
The fallback is now strictly limited to development environments (`__DEV__`). Production builds will fall back to secure device-level keychain storage (e.g., `SecureStore`) as intended, preventing the encryption key from being exposed.
