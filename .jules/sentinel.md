## 2024-08-05 - Insecure Local Storage Encryption Key Fallback
**Vulnerability:** The application used `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` as a fallback encryption key if generating/retrieving a key from SecureStore failed.
**Learning:** `EXPO_PUBLIC_` variables are inlined at build time, meaning the encryption key was hardcoded into the application bundle. This defeats the purpose of local encryption as anyone with the app bundle could decompile it and read the key.
**Prevention:** Never use public build-time environment variables for sensitive cryptographic keys. Keys should always be dynamically generated and stored in a secure enclave (like iOS Keychain / Android Keystore via SecureStore) or fetched securely at runtime over an encrypted channel.
