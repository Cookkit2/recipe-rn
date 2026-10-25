import React from "react";
import { act, render } from "@testing-library/react-native";
import SearchScreen from "~/app/(misc)/search";

let mockNativeReady = false;
let mockScreenFocused = true;
const mockFocus = jest.fn();
let mockSearchParams: { pullOffset?: string | string[] } = {};
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
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => mockSearchParams,
  useFocusEffect: (callback: () => void) => {
    require("react").useEffect(() => {
      if (mockScreenFocused) return callback();
    }, [callback, mockScreenFocused]);
  },
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
    SearchBar: ({ ref }: { ref: React.Ref<{ focus: () => void }> }) => {
      require("react").useLayoutEffect(() => {
        if (!mockNativeReady) return;
        const attach = (value: { focus: () => void } | null) => {
          if (typeof ref === "function") ref(value);
          else if (ref) ref.current = value;
        };
        attach({ focus: mockFocus });
        return () => attach(null);
      }, [ref, mockNativeReady]);
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
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View },
  withSpring: (value: number) => value,
  withTiming: (value: number) => value,
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
  mockFocus.mockClear();
  mockSearchParams = {};
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

it("starts the incoming search content at the passed pull offset and springs it to rest", async () => {
  mockSearchParams = { pullOffset: "38" };
  const screen = await render(<SearchScreen />);
  const entrance = screen.getByTestId("search-pull-entrance").props.entering();
  expect(entrance.initialValues.transform).toEqual([{ translateY: 38 }]);
  expect(entrance.animations.transform).toEqual([{ translateY: 0 }]);
  expect(mockScreenOptions).toHaveBeenLastCalledWith(
    expect.objectContaining({ animation: "none" })
  );
});

it.each([undefined, "bad", "Infinity", "-10", "0"])(
  "keeps the normal search entrance without a valid positive pull offset (%s)",
  async (pullOffset) => {
    mockSearchParams = { pullOffset };
    const screen = await render(<SearchScreen />);
    expect(screen.getByTestId("search-pull-entrance").props.entering).toBeUndefined();
    expect(mockScreenOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ animation: "fade" })
    );
  }
);
