# Web recipe search

The shared Search input filters saved recipes and pantry items as you type. Submitting Search (or tapping **Search the web**) calls the authenticated `recipe-search` Supabase Edge Function. Tavily searches for recipe pages and returns up to eight results with the source hostname and source-specific image, when available. Search snippets are previews only and are never saved as recipes.

Saved recipe matches initially show two rows under **Recipes**. **See all** expands them in place; changing the search resets the preview. A small centered **Search the web** action sits below local results. Submitting it shows two recipe skeleton rows under **From the web**, then replaces them with the returned previews. On iOS, the result viewport follows the root keyboard provider's current height, including when the list first mounts after the keyboard is already open.

Search has a separate round glass mode button to the left of the search pill and a matching X on the right. **Sparkles** opens Cookkit AI in place, and **magnifying glass** returns to search. Both modes keep the same native text input and preserve its draft when toggled. The placeholder changes between **Search ingredients and recipes…** and **Ask Cookkit…**. Submitting in search mode queries Tavily; submitting in AI mode sends a cooking-assistant message. Changing modes alone does not send a request or navigate to another screen. The shared row uses Expo's native glass views with the app's active color scheme and follows the keyboard animation. Android uses its resized window instead of applying the keyboard offset twice.

Tapping a result opens `/recipes/web-import` in the existing recipe skeleton. Cookkit first checks saved recipes by normalized source URL, ignoring common tracking parameters and fragments. Existing recipes open directly. New URLs use the same complete-page extraction and recipe-save flow as incoming shares. The transient web route never writes or clears the native share inbox. Failed extraction retains the existing retry/original-page actions.

The empty Search helper is centered and has no preset prompts or **Ask Cookkit** result card. The mode circle switches to AI. **Ask Cookkit AI** uses the same larger text style and centered alignment and stays visible while drafting the first message. Wrapping preset prompts sit in a fixed footer immediately above the shared input; typing hides the presets, and clearing an unsent draft restores them. Sending the first message hides both the helper and presets. Space for the input remains reserved so the last message can scroll fully above it.

## Deployment

1. Add `TAVILY_API_KEY` to the existing Cookkit project's **Edge Functions → Secrets**. Never put the key in app config or an `EXPO_PUBLIC_*` variable.
2. Deploy `bunx supabase functions deploy recipe-search --project-ref <cookkit-project-ref>`.
3. Keep gateway JWT verification enabled. The handler also checks the user JWT with Supabase Auth; guests reuse the existing anonymous session support.

Search uses the existing `consume_ai_request` daily quota (`AI_REQUESTS_PER_DAY`, default 200), so web search and AI requests share that budget. Provider URL, search depth, and result count are fixed server-side. Basic search costs one Tavily credit; generated answers and full-page extraction are disabled during discovery. The app caches equivalent submitted queries for five minutes, disables automatic retries/refetches, and cancels requests when their observers unmount. Typing never starts a web request.

Web results are filtered for recipe evidence, but some pages may still be blocked, removed, or lack a complete recipe. Only the complete-page importer determines whether a recipe can be saved. Dietary/time filters currently apply to local recipes; web previews do not claim verified dietary/time metadata.

Reference: [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search).
