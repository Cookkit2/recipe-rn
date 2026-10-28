import React from "react";
import { act, render } from "@testing-library/react-native";
import SearchScreen from "~/app/(misc)/search";
import { SearchContent } from "../SearchContent";
import { SearchEntrance } from "../SearchEntrance";
import { StyleSheet } from "react-native";

jest.mock("~/hooks/queries/useWebRecipeSearch", () => ({
  useWebRecipeSearch: () => ({ data: [], isFetching: false, isError: false, refetch: jest.fn() }),
}));

jest.mock("~/components/ui/button", () => ({
  Button: (props: any) => require("react").createElement(require("react-native").Pressable, props),
}));
jest.mock("~/components/ui/input", () => ({
  Input: (props: any) => require("react").createElement(require("react-native").TextInput, props),
}));
jest.mock("lucide-uniwind", () => ({ ArrowUpIcon: () => null, SquareIcon: () => null }));
jest.mock("expo-router/react-navigation", () => ({ useHeaderHeight: () => 118 }));

jest.mock("../SearchAssistantHeader", () => ({ SearchAssistantHeader: () => null }));
jest.mock("~/components/Assistant/AssistantMessages", () => ({ AssistantMessages: () => null }));
const mockStopAssistant = jest.fn();
jest.mock("~/hooks/useSearchAssistant", () => ({
  useSearchAssistant: () => ({
    messages: [],
    status: "idle",
    send: jest.fn(),
    stop: mockStopAssistant,
  }),
}));
let mockNativeReady = false;
let mockScreenFocused = true;
const mockFocus = jest.fn();
let mockOnFocus: (() => void) | undefined;
let mockOnBlur: (() => void) | undefined;
let mockKeyboardVisible = false;
const mockKeyboardListeners = new Set<() => void>();
const mockScreenOptions = jest.fn();
const mockListeners = new Map<string, Set<() => void>>();
const mockNavigation = {
  isFocused: () => mockScreenFocused,
  addListener: (name: string, callback: () => void) => {
    const listeners = mockListeners.get(name) ?? new Set();
    listeners.add(callback);
    mockListeners.set(name, listeners);
    return () => listeners.delete(callback);
  },
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => {
    require("react").useEffect(() => {
      if (mockScreenFocused) return callback();
    }, [callback, mockScreenFocused]);
  },
  Stack: {
    Header: () => null,
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
    SearchBar: ({
      ref,
      onFocus,
      onBlur,
    }: {
      ref: React.Ref<{ focus: () => void }>;
      onFocus: () => void;
      onBlur?: () => void;
    }) => {
      mockOnFocus = onFocus;
      mockOnBlur = onBlur;
      require("react").useLayoutEffect(() => {
        if (!mockNativeReady) return;
        const attach = (value: { focus: () => void } | null) => {
          if (typeof ref === "function") ref(value);
          else if (ref) ref.current = value;
        };
        attach({ focus: mockFocus });
        return () => attach(null);
      });
      return null;
    },
  },
}));
jest.mock("@expo/ui/community/bottom-sheet", () => ({
  __esModule: true,
  default: () => null,
  BottomSheetScrollView: () => null,
}));
jest.mock("@rn-primitives/portal", () => ({ Portal: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 62, bottom: 34 }),
}));
jest.mock("~/hooks/useColor", () => () => ({ background: "black", foreground: "white" }));
jest.mock("~/hooks/queries/useRecipeQueries", () => ({ useRecipes: () => ({ data: [] }) }));
jest.mock("~/hooks/queries/usePantryQueries", () => ({ usePantryItems: () => ({ data: [] }) }));
jest.mock("~/hooks/queries/useFeatureFlags", () => ({
  useFeatureFlag: () => ({ enabled: false }),
}));
jest.mock("../SearchResultsList", () => ({ SearchResultsList: () => null }));
jest.mock("expo-haptics", () => ({}));
jest.mock("react-native", () =>
  Object.defineProperties(Object.create(jest.requireActual("react-native")), {
    BackHandler: { value: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } },
    Keyboard: {
      value: {
        dismiss: jest.fn(),
        isVisible: () => mockKeyboardVisible,
        addListener: (_event: string, callback: () => void) => {
          mockKeyboardListeners.add(callback);
          return { remove: () => mockKeyboardListeners.delete(callback) };
        },
      },
    },
  })
);
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View },
  withSpring: (value: number) => value,
  withTiming: (value: number) => value,
  useAnimatedStyle: (callback: () => unknown) => callback(),
}));

let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
const originalRequestFrame = global.requestAnimationFrame;
const originalCancelFrame = global.cancelAnimationFrame;
async function flushFrames() {
  await act(async () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockNativeReady = false;
  mockScreenFocused = true;
  mockFocus.mockReset();
  mockOnFocus = undefined;
  mockOnBlur = undefined;
  mockKeyboardVisible = false;
  mockKeyboardListeners.clear();
  mockScreenOptions.mockClear();
  mockListeners.clear();
  frames.clear();
  global.requestAnimationFrame = jest.fn((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  global.cancelAnimationFrame = jest.fn((id) => {
    if (typeof id === "number") frames.delete(id);
  });
});

afterEach(() => {
  global.requestAnimationFrame = originalRequestFrame;
  global.cancelAnimationFrame = originalCancelFrame;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it("focuses a native search bar that mounts after the old 150 ms retry window", async () => {
  const screen = await render(<SearchScreen />);
  await act(async () => jest.advanceTimersByTime(300));
  expect(mockFocus).not.toHaveBeenCalled();
  mockNativeReady = true;
  await screen.rerender(<SearchScreen />);
  await flushFrames();
  expect(mockFocus).toHaveBeenCalled();
});

it("starts the retry window when a late native field actually attaches", async () => {
  const screen = await render(<SearchScreen />);
  await flushFrames();
  await act(async () => jest.advanceTimersByTime(2500));
  expect(mockFocus).not.toHaveBeenCalled();
  mockNativeReady = true;
  await screen.rerender(<SearchScreen />);
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(100));
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(2);
});

it("retries focus when the native navigation transition finishes", async () => {
  mockNativeReady = true;
  await render(<SearchScreen />);
  await flushFrames();
  mockFocus.mockClear();
  await act(async () => mockListeners.get("transitionEnd")?.forEach((callback) => callback()));
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(1);
});

it("does not open the keyboard after leaving search and refocuses when returning", async () => {
  mockNativeReady = true;
  const screen = await render(<SearchScreen />);
  mockScreenFocused = false;
  await screen.rerender(<SearchScreen />);
  mockFocus.mockClear();
  await flushFrames();
  expect(mockFocus).not.toHaveBeenCalled();
  mockScreenFocused = true;
  await screen.rerender(<SearchScreen />);
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(1);
});

it("keeps the keyboard closed during the pull preview and focuses after release", async () => {
  mockNativeReady = true;
  const screen = await render(<SearchContent onDismiss={jest.fn()} focusEnabled={false} />);
  await flushFrames();
  expect(mockFocus).not.toHaveBeenCalled();
  expect(mockOnFocus).toBeUndefined();
  await screen.rerender(<SearchContent onDismiss={jest.fn()} focusEnabled />);
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(1);
});

it("does not force the keyboard open again merely because the native field ref reattaches", async () => {
  mockNativeReady = true;
  const screen = await render(<SearchScreen />);
  await flushFrames();
  await act(async () => mockOnFocus?.());
  await act(async () => {
    mockKeyboardVisible = true;
    mockKeyboardListeners.forEach((callback) => callback());
  });
  mockFocus.mockClear();
  await screen.rerender(<SearchScreen />);
  await act(async () => mockListeners.get("transitionEnd")?.forEach((callback) => callback()));
  await flushFrames();
  expect(mockFocus).not.toHaveBeenCalled();
});

it("retries an ignored focus command without requiring a navigation transition", async () => {
  mockNativeReady = true;
  await render(<SearchContent onDismiss={jest.fn()} />);
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(1);
  // iOS can expose a command ref before its search controller accepts focus.
  await act(async () => jest.advanceTimersByTime(100));
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(2);
});

it.each([0, 100, 350, 800, 1500])(
  "opens the keyboard when UIKit becomes ready after %i ms",
  async (delay) => {
    mockNativeReady = true;
    let elapsed = 0;
    let accepted = false;
    mockFocus.mockImplementation(() => {
      if (elapsed < delay) return;
      accepted = true;
      mockOnFocus?.();
      mockKeyboardVisible = true;
      mockKeyboardListeners.forEach((callback) => callback());
    });
    await render(<SearchContent onDismiss={jest.fn()} />);
    for (elapsed = 0; elapsed <= 1800; elapsed += 100) {
      await flushFrames();
      await act(async () => jest.advanceTimersByTime(100));
    }
    expect(accepted).toBe(true);
    const attempts = mockFocus.mock.calls.length;
    await act(async () => jest.advanceTimersByTime(2000));
    await flushFrames();
    expect(mockFocus).toHaveBeenCalledTimes(attempts);
  }
);

it("keeps waiting when editing begins but the keyboard has not appeared", async () => {
  mockNativeReady = true;
  await render(<SearchContent onDismiss={jest.fn()} />);
  await flushFrames();
  await act(async () => mockOnFocus?.());
  await act(async () => mockOnBlur?.());
  await act(async () => jest.advanceTimersByTime(100));
  await flushFrames();
  expect(mockFocus).toHaveBeenCalledTimes(2);
  await act(async () => {
    mockOnFocus?.();
    mockKeyboardVisible = true;
    mockKeyboardListeners.forEach((callback) => callback());
  });
  mockFocus.mockClear();
  await act(async () => jest.advanceTimersByTime(2000));
  await flushFrames();
  expect(mockFocus).not.toHaveBeenCalled();
});

it("does not reopen a confirmed keyboard after the user dismisses it", async () => {
  mockNativeReady = true;
  const screen = await render(<SearchContent onDismiss={jest.fn()} />);
  await flushFrames();
  await act(async () => {
    mockOnFocus?.();
    mockKeyboardVisible = true;
    mockKeyboardListeners.forEach((callback) => callback());
    mockKeyboardVisible = false;
    mockOnBlur?.();
  });
  mockFocus.mockClear();
  await screen.rerender(<SearchContent onDismiss={jest.fn()} />);
  await act(async () => jest.advanceTimersByTime(2000));
  await flushFrames();
  expect(mockFocus).not.toHaveBeenCalled();
});

it("cancels an unacknowledged focus retry when search is disabled", async () => {
  mockNativeReady = true;
  const dismiss = jest.fn();
  const screen = await render(<SearchContent onDismiss={dismiss} />);
  await flushFrames();
  mockFocus.mockClear();
  await screen.rerender(<SearchContent onDismiss={dismiss} focusEnabled={false} />);
  await act(async () => jest.advanceTimersByTime(2000));
  await flushFrames();
  expect(mockFocus).not.toHaveBeenCalled();
});

it("does not extend the initial focus window when native refs repeatedly reattach", async () => {
  mockNativeReady = true;
  const dismiss = jest.fn();
  const screen = await render(<SearchContent onDismiss={dismiss} />);
  await flushFrames();
  for (let attempt = 0; attempt < 5; attempt++) {
    await act(async () => jest.advanceTimersByTime(450));
    await screen.rerender(<SearchContent onDismiss={dismiss} />);
    await flushFrames();
  }
  mockFocus.mockClear();
  await screen.rerender(<SearchContent onDismiss={dismiss} />);
  await flushFrames();
  await act(async () => jest.advanceTimersByTime(2000));
  await flushFrames();
  expect(mockFocus).not.toHaveBeenCalled();
});

it("renders search at the live pull position, not a route-param snapshot", async () => {
  const offset = { value: 38 } as never;
  const progress = { value: 0.8 } as never;
  const screen = await render(
    <SearchEntrance offset={offset} progress={progress} interactive={false}>
      {null}
    </SearchEntrance>
  );
  const entrance = () => screen.getByTestId("search-pull-entrance");
  expect(StyleSheet.flatten(entrance().props.style).transform).toEqual([{ translateY: 38 }]);
  expect(entrance().props.pointerEvents).toBe("none");
  (offset as { value: number }).value = 76;
  await screen.rerender(
    <SearchEntrance offset={offset} progress={progress} interactive={false}>
      {null}
    </SearchEntrance>
  );
  expect(StyleSheet.flatten(entrance().props.style).transform).toEqual([{ translateY: 76 }]);
});
