import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { usePantryPullSearch } from "../usePantryPullSearch";

const mockPush = jest.fn();
let mockFocused = true;
let mockFocusGeneration = 0;
const mockNavigation = { isFocused: () => mockFocused };
const mockRouter = { push: mockPush };
let mockHandlers: Record<string, (event?: { translationY: number }) => void> = {};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) =>
    require("react").useEffect(callback, [callback, mockFocusGeneration]),
}));
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (callback: () => void) => callback(),
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
  withTiming: (value: number) => value,
}));

beforeEach(() => {
  mockPush.mockClear();
  mockFocused = true;
  mockFocusGeneration = 0;
  mockHandlers = {};
});

function drag(distance: number) {
  mockHandlers.onBegin!();
  mockHandlers.onUpdate!({ translationY: distance });
  mockHandlers.onEnd?.({ translationY: distance });
  mockHandlers.onFinalize!();
}

function scroll(handler: unknown, y: number, insetTop = 0) {
  (handler as (event: unknown) => void)({ contentOffset: { y }, contentInset: { top: insetTop } });
}

it("opens search once after a deliberate pull at the top, including automatic header insets", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true));
  await act(async () => {
    scroll(result.current.onScroll, -120, 120);
    drag(100);
    drag(100);
  });
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith("/search");
});

it("opens search while the finger is still down as soon as the pull crosses the threshold", async () => {
  await renderHook(() => usePantryPullSearch(true));
  await act(async () => {
    mockHandlers.onBegin!();
    mockHandlers.onUpdate!({ translationY: 40 });
  });
  expect(mockPush).not.toHaveBeenCalled();

  // No release or rebound event has occurred here.
  await act(async () => mockHandlers.onUpdate!({ translationY: 80 }));
  expect(mockPush).toHaveBeenCalledTimes(1);

  await act(async () => {
    mockHandlers.onUpdate!({ translationY: 100 });
    mockHandlers.onUpdate!({ translationY: 130 });
    mockHandlers.onEnd?.({ translationY: 0 });
    mockHandlers.onFinalize!();
  });
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it("ignores short bounces, upward swipes and pulls beginning partway down the list", async () => {
  const { result } = await renderHook(() => usePantryPullSearch(true));
  await act(async () => {
    drag(25);
    drag(-100);
    scroll(result.current.onScroll, 200);
    mockHandlers.onBegin!();
    // Reaching the top during an ordinary scroll must not activate search.
    scroll(result.current.onScroll, 0);
    mockHandlers.onUpdate!({ translationY: 200 });
    mockHandlers.onEnd?.({ translationY: 200 });
    mockHandlers.onFinalize!();
  });
  expect(mockPush).not.toHaveBeenCalled();
});

it("ignores canceled or retracted pulls below the threshold and restores list opacity", async () => {
  const { result, rerender } = await renderHook(() => usePantryPullSearch(true));
  const opacity = () => (result.current.pullStyle as unknown as { opacity: number }).opacity;
  await act(async () => {
    mockHandlers.onBegin!();
    mockHandlers.onUpdate!({ translationY: 50 });
  });
  await rerender({});
  expect(opacity()).toBeLessThan(1);
  await act(async () => mockHandlers.onFinalize!());
  await rerender({});
  expect(opacity()).toBe(1);
  expect(mockPush).not.toHaveBeenCalled();

  await act(async () => {
    mockHandlers.onBegin!();
    mockHandlers.onUpdate!({ translationY: 50 });
    mockHandlers.onUpdate!({ translationY: 20 });
    mockHandlers.onEnd?.({ translationY: 20 });
    mockHandlers.onFinalize!();
  });
  expect(mockPush).not.toHaveBeenCalled();
});

it("disables pull search while the recipe drawer is open or Pantry is not focused", async () => {
  let enabled = false;
  const { rerender } = await renderHook(() => usePantryPullSearch(enabled));
  await act(async () => drag(100));
  expect(mockPush).not.toHaveBeenCalled();
  enabled = true;
  await rerender({});
  mockFocused = false;
  await act(async () => drag(100));
  expect(mockPush).not.toHaveBeenCalled();
});

it("can open search again after returning to the same Pantry screen", async () => {
  const { rerender } = await renderHook(() => usePantryPullSearch(true));
  await act(async () => drag(100));
  mockFocusGeneration++;
  await rerender({});
  await act(async () => drag(100));
  expect(mockPush).toHaveBeenCalledTimes(2);
});
