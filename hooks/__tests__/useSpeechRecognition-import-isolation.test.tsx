import { act, renderHook } from "@testing-library/react-native";
import { useSpeechRecognition } from "../useSpeechRecognition";
import {
  acquireSpeechSession,
  ownsSpeechSession,
  releaseSpeechSession,
} from "~/lib/speech-session";

const mockEvents = new Map<string, (event?: any) => void>();
const mockSpeech = {
  start: jest.fn(),
  abort: jest.fn(),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
};
jest.mock("expo-speech-recognition", () => ({
  get ExpoSpeechRecognitionModule() {
    return mockSpeech;
  },
  useSpeechRecognitionEvent: (name: string, callback: (event?: any) => void) =>
    mockEvents.set(name, callback),
}));
jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: { addEventListener: () => ({ remove() {} }) },
}));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));
jest.mock("~/utils/voice-cooking", () => ({
  voiceCookingService: {
    onSpeakingStart: () => () => {},
    onSpeakingFinish: () => () => {},
    getIsSpeaking: () => false,
    parseCommand: () => "next",
  },
}));
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockEvents.clear();
});
afterEach(() => jest.useRealTimers());

it("ignores video recognition events when cooking voice controls are switched off", async () => {
  const onCommand = jest.fn();
  const screen = await renderHook(() => useSpeechRecognition({ onCommand }));
  await act(async () => {
    mockEvents.get("start")?.();
    mockEvents.get("result")?.({
      results: [{ transcript: "Next add five eggs", confidence: 0.99 }],
    });
    jest.advanceTimersByTime(500);
  });
  expect(onCommand).not.toHaveBeenCalled();
  expect(screen.result.current.isListening).toBe(false);
  expect(screen.result.current.transcript).toBe("");
});

it("still accepts commands from its own voice session", async () => {
  const onCommand = jest.fn();
  const screen = await renderHook(() => useSpeechRecognition({ onCommand }));
  await act(async () => screen.result.current.startListening());
  await act(async () => {
    mockEvents.get("start")?.();
    mockEvents.get("result")?.({ results: [{ transcript: "next step", confidence: 0.99 }] });
    jest.advanceTimersByTime(500);
  });
  expect(onCommand).toHaveBeenCalledTimes(1);
  await act(async () => screen.result.current.stopListening());
});

it("cannot start or abort the recognizer owned by a video import", async () => {
  const token = acquireSpeechSession("recipe-video");
  const screen = await renderHook(() => useSpeechRecognition({ onCommand: jest.fn() }));
  try {
    await act(async () => screen.result.current.startListening());
    expect(mockSpeech.start).not.toHaveBeenCalled();
    await screen.unmount();
    expect(mockSpeech.abort).not.toHaveBeenCalled();
    expect(ownsSpeechSession(token)).toBe(true);
  } finally {
    releaseSpeechSession(token);
  }
});
