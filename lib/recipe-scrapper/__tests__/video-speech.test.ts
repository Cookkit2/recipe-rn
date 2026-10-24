import { transcribeVideoAudio } from "../video-speech";
import { acquireSpeechSession, releaseSpeechSession } from "~/lib/speech-session";

const listeners = new Map<string, (event?: any) => void>();
const mockRemove = jest.fn();
const mockSpeech = {
  supportsOnDeviceRecognition: jest.fn(),
  getStateAsync: jest.fn(),
  getSupportedLocales: jest.fn(),
  getMicrophonePermissionsAsync: jest.fn(),
  requestMicrophonePermissionsAsync: jest.fn(),
  start: jest.fn(),
  abort: jest.fn(),
  addListener: jest.fn((name: string, callback: (event?: any) => void) => {
    listeners.set(name, callback);
    return {
      remove: () => {
        listeners.delete(name);
        mockRemove();
      },
    };
  }),
};
jest.mock("expo-speech-recognition", () => ({ ExpoSpeechRecognitionModule: mockSpeech }));
beforeEach(() => {
  jest.clearAllMocks();
  listeners.clear();
  mockSpeech.supportsOnDeviceRecognition.mockReturnValue(true);
  mockSpeech.getStateAsync.mockResolvedValue("inactive");
  mockSpeech.getSupportedLocales.mockResolvedValue({ installedLocales: ["en-US"] });
  mockSpeech.getMicrophonePermissionsAsync.mockResolvedValue({ granted: true });
  mockSpeech.start.mockImplementation(() =>
    queueMicrotask(() => {
      listeners.get("result")?.({
        isFinal: true,
        results: [{ transcript: "Steam for fifteen minutes." }],
      });
      listeners.get("end")?.();
    })
  );
});
const chunks = [{ uri: "file:///audio.wav", start: 0 }];

it("transcribes a prepared local file with offline recognition and removes all listeners", async () => {
  const evidence = await transcribeVideoAudio(chunks, "en-US", "ios");
  expect(evidence.transcript).toContain("Steam for fifteen minutes");
  expect(mockSpeech.start).toHaveBeenCalledWith(
    expect.objectContaining({
      requiresOnDeviceRecognition: true,
      audioSource: expect.objectContaining({ uri: chunks[0]?.uri, sampleRate: 16000 }),
    })
  );
  expect(mockRemove).toHaveBeenCalledTimes(3);
  expect(listeners.size).toBe(0);
});

it("continues without speech when permission is denied", async () => {
  mockSpeech.getMicrophonePermissionsAsync.mockResolvedValueOnce({
    granted: false,
    canAskAgain: false,
  });
  const evidence = await transcribeVideoAudio(chunks, "en-US", "ios");
  expect(evidence.transcript).toBe("");
  expect(evidence.warnings).toHaveLength(1);
  expect(mockSpeech.start).not.toHaveBeenCalled();
});

it("never falls back to cloud recognition when an Android language model is missing", async () => {
  const evidence = await transcribeVideoAudio(chunks, "zh-CN", "android");
  expect(evidence.warnings).toHaveLength(1);
  expect(mockSpeech.start).not.toHaveBeenCalled();
});

it("leaves an enabled cooking voice session alone, including a pause for spoken feedback", async () => {
  const voice = acquireSpeechSession("voice");
  try {
    const evidence = await transcribeVideoAudio(chunks, "en-US", "ios");
    expect(evidence.warnings).toHaveLength(1);
    expect(mockSpeech.start).not.toHaveBeenCalled();
    expect(mockSpeech.abort).not.toHaveBeenCalled();
  } finally {
    releaseSpeechSession(voice);
  }
});

it("cancels its own recognizer and removes listeners when the import is closed", async () => {
  const controller = new AbortController();
  mockSpeech.start.mockImplementationOnce(() => controller.abort());
  await expect(
    transcribeVideoAudio(chunks, "en-US", "ios", { signal: controller.signal })
  ).rejects.toThrow();
  expect(mockSpeech.abort).toHaveBeenCalledTimes(1);
  expect(listeners.size).toBe(0);
});
