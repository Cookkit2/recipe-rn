# YouTube Gemini fallback implementation plan

**Goal:** Restore URL-only YouTube imports from PR #46 through the authenticated server proxy.

**Architecture:** Keep Nebius text extraction first. If text is absent or yields no usable recipe, submit a canonical YouTube watch URL to the existing authenticated/quota-limited proxy. A server-only Gemini adapter uses video input, validates JSON against the extraction schema, and acknowledges the video URL so older proxies cannot silently ignore it. Keep credentials and model selection on the server. Both UI entry points already share this pipeline.

**Tech stack:** TypeScript, Jest, Supabase Edge Functions, Gemini REST generateContent, AJV.

- [x] Establish baseline for the handler, AI client and recipe analyser tests.
- [x] Add failing tests for missing/insufficient text fallback, adequate text bypass, invalid video URL rejection, auth/quota enforcement, provider failure/schema rejection and old-proxy acknowledgement.
- [x] Add `youtubeVideoUrl` to the AI request and `inputVideoUrl` to the response contract. Validate canonical HTTPS watch URLs and reject mixed image/video requests.
- [x] Implement server-only Gemini adapter with fixed endpoint, server-configured model, bounded timeout/output, safe failures and AJV validation. Route validated video requests after authentication/quota checks.
- [x] Wire optional server secrets into Supabase and the local development proxy; update deployment/environment documentation.
- [x] Update RecipeAnalyzer to preserve Nebius-first behavior and fall back when no usable recipe is extracted. Preserve final normalization and save paths.
- [x] Run affected tests, typecheck, lint, broader tests; inspect the diff, commit, push and create a PR against master.

Tests: `bun run test -- --runInBand --watchman=false server/__tests__ lib/ai/__tests__ lib/recipe-scrapper/youtube/__tests__ data/api/__tests__/recipeImportApi-social.test.ts components/Pantry/__tests__/ImportRecipeDialog.test.tsx components/Recipe/__tests__/SharedRecipeImport.test.tsx`.

Live verification requires a configured server-only GEMINI_API_KEY and deployed updated proxy; do not expose or copy provider credentials into the app.

## Verification results

Bun 1.4.3: 173 Jest suites and 1403 tests passed. `bun run typecheck`, `bun run lint`, and `git diff --check` passed. Independent code review found no actionable issues. Live Gemini extraction was not run because no server-only Gemini key is configured locally.
