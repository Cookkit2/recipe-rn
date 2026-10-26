# Cookkit AI on Nebius

All cloud AI now runs through Nebius Token Factory. There is no Gemini fallback.

The legacy `utils/gemini-api.ts` implementation is retained for future reference. Its `GEMINI_ENABLED` flag is fixed to `false`; generation and model-list calls fail before reading credentials or making network requests. Current app features use `lib/ai/client.ts`. Re-enabling Gemini later requires a server proxy for its credentials.

| Task | Model |
| --- | --- |
| Recipe captions, transcripts, website extraction/cleanup and pantry recipe tailoring | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| Ingredient photos | `nvidia/Nemotron-3.5-Super-VL` |

The app calls the `nebius-ai` Supabase Edge Function with a user session. The function verifies the session with Supabase Auth, applies a persistent daily request quota, and chooses the model based on whether an image is present. The app cannot override the model or provider endpoint.

The Nebius key for recipe extraction is server-only `NEBIUS_API_KEY`. The extraction client must not read `EXPO_PUBLIC_NEBIUS_API_KEY`. The existing Supabase URL and public anon key remain app configuration.

## Prototype in-app cooking assistant

`lib/agent` is a separate prototype. It runs the Vercel AI SDK `streamText` loop inside the app and calls Nebius with `@ai-sdk/openai-compatible`. That path reads:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_NEBIUS_API_KEY` | Prototype bearer token. Empty in git. It is embedded in the binary. |
| `EXPO_PUBLIC_NEBIUS_BASE_URL` | Defaults to `https://api.tokenfactory.nebius.com/v1`. |
| `EXPO_PUBLIC_NEBIUS_MODEL` | Chat model. The Nebius function-calling guide uses `meta-llama/Meta-Llama-3.1-8B-Instruct-fast`. |

Do not ship a store build with a real `EXPO_PUBLIC_NEBIUS_API_KEY`. Move the agent loop and the key to a backend before any real release. `bun run agent:smoke` exercises `streamText` and tools against a local mock of the OpenAI-compatible stream. It does not call Nebius.

The app's assistant reads and changes pantry items through the same local `pantryApi` as the pantry screen, including when Supabase is unavailable. Mutations invalidate pantry and recipe queries. Diet preferences merge device values with cloud values when available; recipe suggestions read a bounded cloud catalog with complete, paginated ingredient lists.

## Local simulator testing

1. Put `NEBIUS_API_KEY` in ignored `.env.local`.
2. Add `EXPO_PUBLIC_AI_PROXY_URL=http://127.0.0.1:8787/ai` to `.env.local` for the iOS simulator.
3. Run `bun run ai:dev` in one terminal and `bun run dev` in another. Restart Metro after changing environment variables.
4. Run `bun run ai:smoke` for one small live caption extraction. This makes a paid Nebius request. Normal Jest tests mock all inference calls.

The development proxy binds only to loopback and bypasses Supabase authentication for local testing. It is not a production server. Android emulators can use `http://10.0.2.2:8787/ai`. A physical phone needs the deployed Supabase function.

## Supabase deployment

1. Sign in with `bunx supabase login` and identify the existing Cookkit project.
2. Apply `supabase/migrations/202610170001_ai_request_quota.sql` to that project. Review pending migrations before using `db push`; do not apply unrelated historical migrations blindly. The quota table has RLS enabled and is accessible only through the service-role function.
3. In the Supabase dashboard, add `NEBIUS_API_KEY` under Edge Function secrets. Do not paste it into a command, PR, source file or chat. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by the Edge Functions runtime.
4. Enable **Authentication → Sign In / Providers → Anonymous Sign-Ins** to preserve guest AI access. Signed-in users reuse their existing session. The app creates a persisted guest session only when its first AI request needs one; offline pantry use does not depend on authentication.
5. Run `bunx supabase functions deploy nebius-ai --project-ref <cookkit-project-ref>`. The function's `deno.json` maps AJV to its pinned npm version.
6. Remove the local `EXPO_PUBLIC_AI_PROXY_URL` override and restart/rebuild the app. It defaults to `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/nebius-ai`.

Gateway JWT verification stays enabled in `supabase/config.toml`, and the handler also verifies the user through Auth. Requests without a valid user session are rejected before any provider call. A public project key alone does not grant AI access.

The default quota is 200 requests per user per UTC database day, including attempted requests; set the server secret `AI_REQUESTS_PER_DAY` to a value from 1 to 1000 to change it. Model output budgets, prompt/image size limits, bounded provider retries and one JSON repair attempt also bound individual requests. Anonymous-account creation still needs the project's normal signup abuse controls.

## Response and import behavior

These Nemotron endpoints do not advertise schema-constrained generation. Cookkit places the JSON schema in the prompt, validates output with AJV, and permits one repair attempt for malformed, truncated or schema-invalid answers. Reasoning is disabled for extraction. Usage estimates include tokens from repair attempts and are diagnostics, not invoices.

YouTube extraction first uses available captions/transcripts or recipe text in the description through Nebius. When text is absent or does not yield a complete recipe with confidence at least 0.6, the app sends a canonical YouTube watch URL to the same proxy, which routes it to Gemini video understanding. Both manual imports and native shares use this fallback. Other requests continue using Nebius.

To enable the fallback, add **server-only** `GEMINI_API_KEY` to the `nebius-ai` Edge Function secrets and redeploy that function before releasing the updated app. Optionally set `GEMINI_YOUTUBE_MODEL` (default `gemini-3.8-flash`). For simulator testing, put these in ignored `.env.local` and restart `bun run ai:dev`. Never use an `EXPO_PUBLIC_` prefix for the provider key.

Gemini video requests use the existing verified user session, daily quota, 75-second handler deadline and 8192-token output limit. Each text/video request consumes its own quota unit. Only canonical HTTPS YouTube watch URLs are accepted; image/video mixtures and arbitrary media hosts are rejected. Gemini output is checked against the full recipe JSON schema locally, then recipe completeness/confidence are checked before saving. Missing configuration, blocked/private videos, provider errors, truncated answers and invalid JSON fail without saving. The app verifies that the proxy acknowledged the video URL, so an older deployment cannot silently ignore video input.

Manual smoke test after deployment: import a public cooking YouTube link without pasted text from the Pantry Import dialog, then share the same link into Cookkit. Confirm both reach a saved recipe; repeat with a non-recipe video and confirm no recipe is saved. Test the YouTube short link reported in the regression as well. Jest uses mock provider responses and does not establish live video availability or extraction quality.

API references: [YouTube video input](https://ai.google.dev/gemini-api/docs/generate-content/video-understanding) and [structured JSON output](https://ai.google.dev/gemini-api/docs/structured-output).

For the hackathon, demonstrate actual Nemotron inference through Token Factory and document the changes made to the existing app during the submission period. Whole-app hosting on Nebius is not required for the Best Apps and Agents track.

## Checks

```sh
bun run typecheck
bun run lint
bun run test -- --runInBand --watchman=false
```

Reference: [Nebius inference](https://docs.tokenfactory.nebius.com/ai-models-inference/overview), [NVIDIA Nemotron models](https://nebius.com/services/token-factory/models/nvidia-nemotron-models-inference), and [hackathon rules](https://nebiusglobalaihackathon.devpost.com/rules).
