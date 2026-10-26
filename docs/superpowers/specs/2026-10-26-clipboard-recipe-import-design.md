# Clipboard recipe import

Date: 2026-10-26

## Goal and selected behavior

Automatically read the clipboard when Cookkit launches or returns to the foreground. Offer to import supported YouTube and TikTok video links without requiring the pantry import dialog. The user selected automatic reads, accepting that iOS can show its system paste permission prompt.

Keep the existing manual import dialog as a fallback for captions, local videos, unsupported clipboard access, and intentional retries. Native share imports continue to work.

## Lifecycle and prompt

- Mount a native clipboard coordinator alongside the existing share handler. Read once after startup is ready, then once per transition from background/inactive to active. Do not poll or read while the app is in the background. Serialize reads and ignore results after unmount or a newer lifecycle request.
- Wait for completed onboarding and ready navigation. Defer while a native share is pending, an import is running, or another import prompt is visible. Recheck when these conditions clear; native shares take priority.
- Use the existing clipboard dependency. Missing native support, denied access, and empty clipboard values fail silently. Web retains manual import.
- Extract an HTTP(S) URL from copied text, including TikTok share text. Validate the parsed hostname and video path; regex extraction is not a trust boundary. Accept YouTube watch, Shorts, live, and youtu.be video links, and supported TikTok video/short-link forms. Reject lookalike hosts, credentials, nonstandard ports, channel/profile links, and non-video URLs. Do not resolve redirects before consent.
- Prompt: “Import recipe from copied link?” with the detected platform, Import and Dismiss. Do not claim the video is a recipe before analysis. No metadata fetch, transcription, AI call, or save occurs before Import.
- Normalize YouTube links to video identity and TikTok full links to post identity. Strip tracking from short links while preserving their token. Different short and full links cannot be deduplicated by video identity until resolved.
- Persist a bounded list of the most recent 100 handled canonical link identities, recording a link when prompted so dismissal or accepting an import does not cause repeated prompts after resume/relaunch. Do not persist raw clipboard text or captions, log clipboard contents, or clear the clipboard. Manual import remains available to retry handled links. Use a stable digest of each canonical identity for persistence, following available project hashing utilities.
- Import routes through the existing pending-share/import infrastructure with a fresh request ID and the supported URL, retaining a supplied caption when present. Dismiss performs no network work. Successful import opens recipe details and invalidates recipe queries through the existing hook.

## Stricter video acceptance

Apply the same video acceptance policy to YouTube and TikTok through clipboard, manual, and native-share imports. Include Instagram where it shares the social extraction path. Leave website-specific extraction policy unchanged.

- Require an actual recipe result, an explicit cooking/recipe classification, and finite confidence in the range 0–1 with a minimum of 0.8. A model score alone is insufficient.
- Require valid named ingredients and nonempty actionable preparation steps supported by supplied captions, transcripts, descriptions, or observed video evidence. Titles, hashtags, dish names, and channel identity alone do not establish a recipe.
- Reject restaurant reviews, eating/mukbang clips, food advertising, and finished-dish showcases without supported preparation instructions. A cooking tutorial that actually includes ingredients and preparation remains eligible regardless of presentation style.
- Reuse and strengthen the existing instruction-evidence checks for social extraction; bring equivalent source-quotation validation to YouTube extraction. Validate quotations against the source text used for extraction. Reject absent or unsupported quotations rather than falling back to trusting generated instructions. Preserve multilingual source quotations while allowing translated English instructions.
- Do not fabricate ingredients or preparation actions to complete a partial recipe. Preserve the existing explicitly disclosed amount/serving estimates; this change does not redesign amount estimation. Apply existing structural validation before saving, and do not silently discard invalid ingredients or steps to make a recipe pass.
- When a supplied caption is insufficient, retain existing metadata/transcript/video fallback attempts before rejecting. A rejected early attempt must not prevent a later evidence source from passing.
- If extraction cannot establish a recipe, save nothing and show a concise explanation with the existing retry/manual fallback. Shared YouTube titles or generic share text must not bypass video evidence checks via the generic text-only extraction route.

## Structure

Keep URL recognition/canonicalization and the acceptance policy as pure helpers with focused tests. The coordinator owns lifecycle, prompt deduplication, and user actions; existing import hooks own extraction, saving, and query invalidation. Reuse current storage, dialog primitives, onboarding flags, and navigation patterns. No database migration or new dependency is intended.

## Verification

Add Jest coverage for supported URL variants, copied share text, deceptive URLs, canonical deduplication, bounded persisted history, cold start, resume, rapid repeated lifecycle events, dismissal, clipboard failures, onboarding/navigation gating, native-share priority, and deferred prompts. Verify no network/extraction work before confirmation and exactly one import after confirmation.

Add acceptance tests for both platforms covering valid recipe evidence, missing instructions, food-only content, low/nonfinite/out-of-range confidence, fabricated quotations, multilingual supported instructions, insufficient shared captions with successful fallback, and no save on rejection. Check the shared/manual paths use the same gate.

Run affected Jest suites with `bun run test -- …`, then `bun run typecheck` and `bun run lint`. Validate iOS cold launch/resume and system paste permission behavior on a device or simulator when available; report any unavailable native verification explicitly.

## Alternatives considered

Tap-to-read avoids unsolicited clipboard reads but cannot identify the platform before reading; the user chose automatic reads. Background preclassification before asking could reduce irrelevant import prompts but would fetch copied links without import consent, so classification occurs only after confirmation.
