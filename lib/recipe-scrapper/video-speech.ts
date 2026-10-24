import type { RecipeVideoOptions } from "~/types/RecipeVideo";
import { acquireSpeechSession, releaseSpeechSession } from "~/lib/speech-session";

/** Use only the installed on-device recognizer; never silently upload audio to a speech provider. */
export async function transcribeVideoAudio(
  chunks: { uri: string; start: number }[],
  language: string,
  platform: string,
  options: RecipeVideoOptions = {}
): Promise<{ transcript: string; warnings: string[] }> {
  if (!chunks.length) return { transcript: "", warnings: [] };
  const unavailable = {
    transcript: "",
    warnings: ["Speech wasn't available. Check the video instructions or add its caption."],
  };
  const session = acquireSpeechSession("recipe-video");
  if (!session) return unavailable;
  try {
    const { ExpoSpeechRecognitionModule: speech } = await import("expo-speech-recognition");
    options.signal?.throwIfAborted();
    if (!speech.supportsOnDeviceRecognition() || (await speech.getStateAsync()) !== "inactive")
      return unavailable;
    if (platform === "android") {
      const { installedLocales } = await speech.getSupportedLocales({});
      if (
        !installedLocales.some(
          (locale) => locale.toLowerCase().replaceAll("_", "-") === language.toLowerCase()
        )
      )
        return unavailable;
    }
    let permission = await speech.getMicrophonePermissionsAsync();
    // The installed speech module requires this permission even when audioSource is a file.
    if (!permission.granted && permission.canAskAgain)
      permission = await speech.requestMicrophonePermissionsAsync();
    if (!permission.granted) return unavailable;
    options.onPhase?.("transcribing-video");
    const transcripts: string[] = [];
    for (const chunk of chunks) {
      options.signal?.throwIfAborted();
      const text = await new Promise<string>((resolve, reject) => {
        let finished = false;
        let partial = "";
        const final: string[] = [];
        let failure = false;
        const listeners: { remove(): void }[] = [];
        const finish = (error?: Error) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          listeners.forEach((listener) => listener.remove());
          options.signal?.removeEventListener("abort", cancel);
          if (error) {
            speech.abort();
            reject(error);
          } else resolve(final.length ? final.join(" ") : partial);
        };
        const cancel = () => finish(new Error("Video import cancelled."));
        const timeout = setTimeout(
          () => finish(new Error("Reading the speech took too long.")),
          60_000
        );
        listeners.push(
          speech.addListener("result", (event) => {
            const text = event.results[0]?.transcript?.trim() ?? "";
            if (event.isFinal && text) {
              final.push(text);
              partial = "";
            } else if (text) partial = text;
          })
        );
        listeners.push(
          speech.addListener("error", (event) => {
            if (event.error !== "no-speech") failure = true;
          })
        );
        listeners.push(
          speech.addListener("end", () =>
            finish(failure ? new Error("Speech wasn't available.") : undefined)
          )
        );
        options.signal?.addEventListener("abort", cancel, { once: true });
        try {
          options.signal?.throwIfAborted();
          speech.start({
            lang: language,
            requiresOnDeviceRecognition: true,
            interimResults: true,
            continuous: true,
            audioSource: { uri: chunk.uri, audioChannels: 1, sampleRate: 16000, audioEncoding: 2 },
            addsPunctuation: true,
          });
        } catch (error) {
          finish(error instanceof Error ? error : new Error("Speech wasn't available."));
        }
      });
      if (text.trim()) transcripts.push(`[${chunk.start}s] ${text.trim()}`);
    }
    return { transcript: transcripts.join("\n").slice(0, 24_000), warnings: [] };
  } catch (error) {
    options.signal?.throwIfAborted();
    return unavailable;
  } finally {
    releaseSpeechSession(session);
  }
}
