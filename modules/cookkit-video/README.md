# Cookkit video imports

This local Expo module uses system media APIs; it adds no downloader executable or provider key to the app.

## Flow

1. A complete shared caption uses the existing Nano text extraction path.
2. When the caption is incomplete, a temporary platform WebView tries to resolve public TikTok/Instagram media. Access is best effort: private posts, login walls and changes to the platform can require a saved file instead. It uses post metadata or the page's video element, never guesses from arbitrary network/ad requests.
3. The recovery dialog retains the original link/caption and offers **Choose video**. Files must be under 40 MB and no longer than 3 minutes.
4. The phone extracts eight JPEG frames and 16 kHz mono WAV segments. The installed on-device speech recognizer reads the selected language. Speech permission, language models and OS support are optional; unavailable speech leaves frames/caption available for review. Android file transcription requires Android 13 or later. Speech-session ownership prevents video transcription from triggering cooking voice commands or interrupting an enabled voice session.
5. Only selected frames and text go through the authenticated Supabase proxy. Super VL reads frames; Nano structures the combined evidence. Whole videos and audio are not uploaded. Temporary media copies are deleted when processing finishes; the original selected file is retained.
6. Social/video recipes open an editable preview. No recipe or shopping-list write occurs until **Save recipe**. Missing amounts and units remain blank, and must be supplied or the ingredient removed. Extracted step descriptions must match preparation text in the caption, transcript or frame observations; unsupported model-generated instructions trigger the video/recovery path. Existing website/YouTube URL imports retain their prior behavior.

## Build and rollout

- Expo autolinks `modules/cookkit-video` on iOS and Android. A **new native build** is required; an OTA update cannot add this module. Older builds can still import full captions.
- Deploy the updated `nebius-ai` Supabase function **before** shipping the app. The proxy accepts up to eight images with a combined 1.5 MB base64 limit, and reports `inputImageCount`. The client refuses a frame response from an older proxy rather than accepting a text model's answer without images.
- Keep provider credentials only in the existing server environment. Gemini remains disabled and its retained files are unchanged.

## Validation boundary

Unit tests cover caption/video fallback, offline speech availability, preview/save separation, stale shares, file limits, cleanup and proxy frame routing. The full iOS simulator app builds successfully and launches on iPhone 17 Pro / iOS 27 with local ad hoc signing. Safari successfully hands the supplied TikTok URL/caption to Cookkit. A controlled 18-second saved video was selected through Photos, decoded by the native module, and processed through real Super VL and Nano requests. The preview showed the exact on-screen instructions, blocked saving with a missing ingredient unit, accepted corrections, and saved successfully to the recipe page. The simulator reported speech unavailable, so that run verified the frame fallback, not successful on-device transcription. The supplied public TikTok post reached recovery because its media download failed; transient provider 503 responses were also observed during retries. Android has source API checks with minimal Expo interface stubs, not a full native build or runtime test.

Before release, test real Instagram/TikTok videos and successful on-device speech transcription on physical devices, plus permission denial, cancellation and correcting an unknown ingredient amount. Compare the resulting recipe with the actual video. Sampling frames and speech recognition cannot guarantee every instruction or quantity is recovered.
