# Web recipe search

The existing native Search bar still filters saved recipes and pantry items as you type. Submitting Search (or tapping **Search the web**) calls the authenticated `recipe-search` Supabase Edge Function. Tavily searches for recipe pages and returns up to eight results with the source hostname and source-specific image, when available. Search snippets are previews only and are never saved as recipes.

Tapping a result opens `/recipes/web-import` in the existing recipe skeleton. Cookkit first checks saved recipes by normalized source URL, ignoring common tracking parameters and fragments. Existing recipes open directly. New URLs use the same complete-page extraction and recipe-save flow as incoming shares. The transient web route never writes or clears the native share inbox. Failed extraction retains the existing retry/original-page actions.

## Deployment

1. Add `TAVILY_API_KEY` to the existing Cookkit project's **Edge Functions → Secrets**. Never put the key in app config or an `EXPO_PUBLIC_*` variable.
2. Deploy `bunx supabase functions deploy recipe-search --project-ref <cookkit-project-ref>`.
3. Keep gateway JWT verification enabled. The handler also checks the user JWT with Supabase Auth; guests reuse the existing anonymous session support.

Search uses the existing `consume_ai_request` daily quota (`AI_REQUESTS_PER_DAY`, default 200), so web search and AI requests share that budget. Provider URL, search depth, and result count are fixed server-side. Basic search costs one Tavily credit; generated answers and full-page extraction are disabled during discovery. The app caches equivalent submitted queries for five minutes, disables automatic retries/refetches, and cancels requests when their observers unmount. Typing never starts a web request.

Web results are filtered for recipe evidence, but some pages may still be blocked, removed, or lack a complete recipe. Only the complete-page importer determines whether a recipe can be saved. Dietary/time filters currently apply to local recipes; web previews do not claim verified dietary/time metadata.

Reference: [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search).
