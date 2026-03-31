import { renderHook, act } from "@testing-library/react-native";
import { useSpeechRecognition } from "../useSpeechRecognition";
import { AppState } from "react-native";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { voiceCookingService } from "~/utils/voice-cooking";
import { jest } from "@jest/globals";

// Setup mocks
jest.mock("expo-speech-recognition", () => {
  const listeners: Record<string, Function> = {};
  return {
    ExpoSpeechRecognitionModule: {
      start: jest.fn(),
      abort: jest.fn(),
      requestPermissionsAsync: jest
        .fn<() => Promise<{ granted: boolean }>>()
        .mockResolvedValue({ granted: true }),
    },
    useSpeechRecognitionEvent: jest.fn((event, callback) => {
      // In tests, we manually register the listeners so we can trigger them
      listeners[event as string] = callback as Function;
    }),
    __triggerEvent: (event: string, data: any) => {
      if (listeners[event as string]) {
        act(() => {
          listeners[event as string]!(data);
        });
      }
    },
  };
});

jest.mock("~/utils/voice-cooking", () => ({
  voiceCookingService: {
    parseCommand: jest.fn(),
    getIsSpeaking: jest.fn().mockReturnValue(false),
    onSpeakingStart: jest.fn().mockReturnValue(jest.fn()),
    onSpeakingFinish: jest.fn().mockReturnValue(jest.fn()),
    getSuggestionMessage: jest.fn().mockReturnValue("Try saying next"),
    speakFeedback: jest.fn(),
  },
}));

jest.mock("react-native", () => {
  return {
    AppState: {
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
  };
});

// Helper to simulate speech recognition events
const simulateEvent = (eventName: string, data: any = {}) => {
  const { __triggerEvent } = require("expo-speech-recognition");
  __triggerEvent(eventName, data);
};

describe("useSpeechRecognition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clear any pending timers to avoid "Cannot log after tests are done"
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("should initialize with default state", () => {
    const onCommand = jest.fn<() => void>();
    const { result } = renderHook(() => useSpeechRecognition({ onCommand }));

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe("");
  });

  it("should start and stop listening", async () => {
    const onCommand = jest.fn<() => void>();
    const { result } = renderHook(() => useSpeechRecognition({ onCommand }));

    await act(async () => {
      await result.current.startListening();
    });

    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalled();
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalled();

    // Simulate start event
    simulateEvent("start");
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
  });

  it("should process recognized command after confidence and length checks", () => {
    const onCommand = jest.fn<() => void>();
    const recipe = { id: "1" } as any;
    const currentStep = { id: "2" } as any;

    // @ts-ignore
    voiceCookingService.parseCommand.mockReturnValue("next");

    renderHook(() => useSpeechRecognition({ onCommand, recipe, currentStep }));

    // Should ignore low confidence
    simulateEvent("result", { results: [{ transcript: "next step", confidence: 0.4 }] });
    // It's checked asynchronously, so we must advance timers inside the debounce timeout
    act(() => jest.advanceTimersByTime(300));
    expect(voiceCookingService.parseCommand).not.toHaveBeenCalled();

    // Should ignore short transcripts
    simulateEvent("result", { results: [{ transcript: "a", confidence: 0.9 }] });
    act(() => jest.advanceTimersByTime(300));
    expect(voiceCookingService.parseCommand).not.toHaveBeenCalled();

    // Should process valid command
    simulateEvent("result", { results: [{ transcript: "next step", confidence: 0.9 }] });

    // Advance timer to trigger debounce processing
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(voiceCookingService.parseCommand).toHaveBeenCalledWith("next step");
    expect(onCommand).toHaveBeenCalledWith("next", "next step", { recipe, currentStep });
  });

  it("should not process command if TTS is speaking", () => {
    const onCommand = jest.fn<() => void>();
    // @ts-ignore
    voiceCookingService.getIsSpeaking.mockReturnValue(true);

    renderHook(() => useSpeechRecognition({ onCommand }));

    simulateEvent("result", { results: [{ transcript: "next step", confidence: 0.9 }] });
    act(() => jest.advanceTimersByTime(300));
    expect(voiceCookingService.parseCommand).not.toHaveBeenCalled();
  });

  it("should provide suggestion after multiple unknown commands", () => {
    const onCommand = jest.fn<() => void>();
    // @ts-ignore
    voiceCookingService.parseCommand.mockReturnValue("unknown");
    // Ensure TTS is NOT speaking, otherwise the mock we left enabled in a previous test blocks processing
    // @ts-ignore
    voiceCookingService.getIsSpeaking.mockReturnValue(false);

    renderHook(() => useSpeechRecognition({ onCommand }));

    for (let i = 0; i < 3; i++) {
      simulateEvent("result", { results: [{ transcript: `blah ${i}`, confidence: 0.9 }] });
      act(() => {
        jest.advanceTimersByTime(350);
      });
    }

    // Ensure Date.now() returns a value where timeSinceLastSuggestion > 5000
    jest.setSystemTime(Date.now() + 6000);

    // One more to trigger the suggestion logic
    simulateEvent("result", { results: [{ transcript: "blah final", confidence: 0.9 }] });
    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(voiceCookingService.getSuggestionMessage).toHaveBeenCalled();
    expect(voiceCookingService.speakFeedback).toHaveBeenCalledWith("Try saying next");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("should pause and resume recognition when TTS starts and stops", async () => {
    const onCommand = jest.fn<() => void>();

    let onStartCb: () => void = () => {};
    let onFinishCb: () => void = () => {};

    // @ts-ignore
    voiceCookingService.onSpeakingStart.mockImplementation((cb) => {
      onStartCb = cb;
      return jest.fn();
    });
    // @ts-ignore
    voiceCookingService.onSpeakingFinish.mockImplementation((cb) => {
      onFinishCb = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useSpeechRecognition({ onCommand }));

    await act(async () => {
      await result.current.startListening();
    });
    simulateEvent("start");
    expect(result.current.isListening).toBe(true);

    // Simulate TTS start
    act(() => {
      onStartCb();
    });

    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true); // Should not update UI

    // Should ignore result events
    simulateEvent("result", { results: [{ transcript: "next step", confidence: 0.9 }] });
    act(() => jest.advanceTimersByTime(300));
    expect(voiceCookingService.parseCommand).not.toHaveBeenCalled();

    // Simulate TTS finish
    act(() => {
      onFinishCb();
    });

    act(() => {
      jest.advanceTimersByTime(500); // scheduleRestart delay
    });

    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(1000); // safety window delay
    });
  });

  it("should handle AppState changes", async () => {
    const onCommand = jest.fn<() => void>();

    let appStateChangeCb: (state: string) => void = () => {};
    // @ts-ignore
    AppState.addEventListener.mockImplementation((event, cb) => {
      if (event === "change") {
        appStateChangeCb = cb;
      }
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useSpeechRecognition({ onCommand }));

    // Simulate backgrounding when not listening
    act(() => {
      appStateChangeCb("background");
    });
    expect(ExpoSpeechRecognitionModule.abort).not.toHaveBeenCalled();

    // Start listening and then background
    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      appStateChangeCb("background");
    });
    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();

    // Return to active
    act(() => {
      appStateChangeCb("active");
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(2);
  });

  it("should handle error events correctly", async () => {
    const onCommand = jest.fn<() => void>();
    const { result } = renderHook(() => useSpeechRecognition({ onCommand }));

    await act(async () => {
      await result.current.startListening();
    });

    // Some random error (no-speech)
    simulateEvent("error", { error: "no-speech", message: "Network failure" });

    // not-allowed should abort and reset state
    simulateEvent("error", { error: "not-allowed", message: "Permission denied" });

    expect(result.current.isListening).toBe(false);
  });

  it("should ignore events when unmounted", () => {
    const onCommand = jest.fn<() => void>();
    const { unmount } = renderHook(() => useSpeechRecognition({ onCommand }));

    unmount();

    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
  });

  it("toggleListening should stop if already shouldBeListening, else start", async () => {
    const onCommand = jest.fn<() => void>();
    const { result } = renderHook(() => useSpeechRecognition({ onCommand }));

    // It's not listening initially, toggle should start
    await act(async () => {
      await result.current.toggleListening();
    });
    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalled();
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalled();

    // It should now be listening, toggle should stop
    act(() => {
      result.current.toggleListening();
    });
    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
  });

  it("should not start listening if permissions not granted", async () => {
    // @ts-ignore
    ExpoSpeechRecognitionModule.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const onCommand = jest.fn<() => void>();
    const { result } = renderHook(() => useSpeechRecognition({ onCommand }));

    await act(async () => {
      await result.current.startListening();
    });

    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  });
});
