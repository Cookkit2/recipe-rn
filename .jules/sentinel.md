## 2026-08-05 - Exposed YouTube API Key in Client Code
**Vulnerability:** The YouTube Data API key (`EXPO_PUBLIC_YOUTUBE_API_KEY`) was directly bundled in the client code and used for fetching YouTube video metadata via direct fetch in `lib/recipe-scrapper/youtube/AuthYouTubeService.ts`.
**Learning:** Hardcoded API keys and `.env` variables embedded into the client bundle (especially those exposed via Expo config) can be reverse-engineered and leaked, leading to credential theft and unauthorized API usage on behalf of the developer's quota.
**Prevention:** Always proxy sensitive API requests through a backend layer (like a Supabase Edge Function) and retrieve API keys dynamically from backend environment variables (e.g., `Deno.env.get()`), never the client.
