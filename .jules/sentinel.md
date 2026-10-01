## 2025-02-26 - Secure MMKV Encryption Key Generation
**Learning:** `Crypto.randomUUID()` generates a UUIDv4 which relies on PRNGs that are not cryptographically secure and should not be used for encryption keys. Furthermore, test environment fallback keys should be strictly guarded.
**Action:** Always use `Crypto.getRandomBytes()` or a proper CSPRNG for generating encryption keys, convert the output to a safe format like base64, and wrap test fallbacks in `__DEV__` or `NODE_ENV === 'test'` checks so they are stripped from production builds.
## 2026-08-05 - Exposed YouTube API Key in Client Code
**Vulnerability:** The YouTube Data API key (`EXPO_PUBLIC_YOUTUBE_API_KEY`) was directly bundled in the client code and used for fetching YouTube video metadata via direct fetch in `lib/recipe-scrapper/youtube/AuthYouTubeService.ts`.
**Learning:** Hardcoded API keys and `.env` variables embedded into the client bundle (especially those exposed via Expo config) can be reverse-engineered and leaked, leading to credential theft and unauthorized API usage on behalf of the developer's quota.
**Prevention:** Always proxy sensitive API requests through a backend layer (like a Supabase Edge Function) and retrieve API keys dynamically from backend environment variables (e.g., `Deno.env.get()`), never the client.
