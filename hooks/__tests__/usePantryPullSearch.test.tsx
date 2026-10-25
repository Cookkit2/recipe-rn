import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { usePantryPullSearch } from "../usePantryPullSearch";

let mockFocused = true;
let mockTransitions: ((finished: boolean) => void)[] = [];
let mockHandlers: Record<string, (event?: { translationY: number }, success?: boolean) => void> =
  {};
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) =>
    require("react").useEffect(() => {
      if (mockFocused) return callback();
    }, [callback, mockFocused]),
}));
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
}));
jest.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Native: () => ({}),
    Simultaneous: (...gestures: unknown[]) => gestures,
    Pan: () => {
      const gesture: Record<string, (...args: unknown[]) => unknown> = {};
      for (const name of [
        "activeOffsetY",
        "failOffsetX",
        "onBegin",
        "onUpdate",
        "onEnd",
        "onFinalize",
      ]) {
        gesture[name] = (callback) => {
          if (typeof callback === "function") mockHandlers[name] = callback as never;
          return gesture;
        };
      }
      return gesture;
    },
  },
}));
jest.mock("react-native-reanimated", () => ({
  useSharedValue: (value: unknown) => require("react").useRef({ value }).current,
  useAnimatedStyle: (callback: () => unknown) => callback(),
  useAnimatedScrollHandler: (callback: () => unknown) => callback,
  withTiming: (value: number, _config: unknown, callback?: (finished: boolean) => void) => {
    if (callback) mockTransitions.push(callback);
    return value;
  },
  withSpring: (value: number) => value,
}));
beforeEach(() => {
  mockFocused = true;
  mockTransitions = [];
  mockHandlers = {};
});
function scroll(handler: unknown, y: number) {
  (handler as (event: unknown) => void)({ contentOffset: { y } });
}
async function pull(distance: number) {
  await act(async () => {
    mockHandlers.onBegin!();
    mockHandlers.onUpdate!({ translationY: distance });
    mockHandlers.onEnd!(undefined, true);
    mockHandlers.onFinalize!();
  });
  await finishTransitions();
}
async function finishTransitions() {
  await act(async () => {
    const callbacks = mockTransitions.splice(0);
    callbacks.forEach((callback) => callback(true));
  });
}

it("keeps search following live native displacement while held and permits focus only on release", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true, -54));
  await act(async () => {
    scroll(result.current.onScroll, -54);
    mockHandlers.onBegin!();
    mockHandlers.onUpdate!({ translationY: 80 });
  });
  expect(result.current.phase).toBe("pulling");
  expect(result.current.focusEnabled).toBe(false);
  // Native scrolling can arrive after the pan callback; a route snapshot loses it.
  await act(async () => scroll(result.current.onScroll, -92));
  expect(result.current.searchOffset.value).toBe(38);
  await act(async () => scroll(result.current.onScroll, -130));
  expect(result.current.searchOffset.value).toBe(76);
  expect(result.current.focusEnabled).toBe(false);
  await act(async () => mockHandlers.onEnd!(undefined, true));
  expect(result.current.phase).toBe("open");
  expect(result.current.focusEnabled).toBe(true);
  expect(result.current.searchOffset.value).toBe(0);
  await act(async () => {
    mockHandlers.onFinalize!();
    scroll(result.current.onScroll, -90);
  });
  expect(result.current.searchOffset.value).toBe(0);
});

it.each([25, -100])("does not focus for a short or upward pull (%s)", async (distance) => {
  const { result } = await renderHook(() => usePantryPullSearch(true, 0));
  await pull(distance);
  expect(result.current.phase).toBe("closed");
  expect(result.current.focusEnabled).toBe(false);
});

it("cancels an interrupted preview without focusing the keyboard", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true, 0));
  await act(async () => {
    mockHandlers.onBegin!();
    mockHandlers.onUpdate!({ translationY: 100 });
    mockHandlers.onEnd!(undefined, false);
    mockHandlers.onFinalize!();
  });
  await finishTransitions();
  expect(result.current.phase).toBe("closed");
  expect(result.current.focusEnabled).toBe(false);
});

it("ignores a pull starting below the real top, even with a partially hidden native header", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true, -54));
  await act(async () => scroll(result.current.onScroll, -30));
  await pull(100);
  expect(result.current.phase).toBe("closed");
});

it("disables pulling while the drawer is open or Pantry is unfocused", async () => {
  let enabled = false;
  const { result, rerender } = await renderHook(() => usePantryPullSearch(enabled, 0));
  await pull(100);
  expect(result.current.phase).toBe("closed");
  mockFocused = false;
  enabled = true;
  await rerender({});
  await pull(100);
  expect(result.current.phase).toBe("closed");
});

it("lets a new pull open search after dismissal", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true, 0));
  await pull(100);
  await act(async () => result.current.dismiss());
  await finishTransitions();
  expect(result.current.phase).toBe("closed");
  await pull(100);
  expect(result.current.phase).toBe("open");
});

it("keeps search mounted during the reverse fade and only closes when it finishes", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true, 0));
  await pull(100);
  await act(async () => result.current.dismiss());
  expect(result.current.phase).toBe("closing");
  expect(result.current.focusEnabled).toBe(false);
  expect(mockTransitions).toHaveLength(1);
  await finishTransitions();
  expect(result.current.phase).toBe("closed");
});

it("fades the whole home away, and delays button-opened native search until the fade finishes", async () => {
  const { result, rerender } = await renderHook(() => usePantryPullSearch(true, 0));
  await act(async () => result.current.open());
  expect(result.current.phase).toBe("pulling");
  expect(result.current.focusEnabled).toBe(false);
  await rerender({});
  expect(result.current.homeStyle).toEqual(expect.objectContaining({ opacity: 0 }));
  await finishTransitions();
  expect(result.current.phase).toBe("open");
  expect(result.current.focusEnabled).toBe(true);
});

it("does not start a search fade for an ordinary tap that never became a pull", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true, 0));
  await act(async () => {
    mockHandlers.onBegin!();
    mockHandlers.onFinalize!();
  });
  expect(result.current.phase).toBe("closed");
  expect(mockTransitions).toHaveLength(0);
});
