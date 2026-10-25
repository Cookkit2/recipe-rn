import React from "react";
import { act, render } from "@testing-library/react-native";
import { AccessibilityInfo, AppState, View, type AppStateStatus } from "react-native";
import RecipeLoadingGlowOverlay from "../RecipeLoadingGlowOverlay";
import { RECIPE_GLOW_EXIT_MS } from "../recipe-loading-glow";

jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: { currentState: "active", addEventListener: jest.fn() },
}));
jest.mock("../RecipeLoadingGlowSurface", () => ({
  __esModule: true,
  default: ({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) => (
    <View testID="glow-surface" accessibilityLabel={`${active}:${reducedMotion}`} />
  ),
}));
let changeAppState: (state: AppStateStatus) => void;
let changeMotion: (reduced: boolean) => void;
const removeAppState = jest.fn();
const removeMotion = jest.fn();
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    changeAppState = listener;
    return { remove: removeAppState };
  });
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_type, listener) => {
    changeMotion = listener as (value: boolean) => void;
    return { remove: removeMotion };
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
async function show() {
  const screen = await render(<RecipeLoadingGlowOverlay active />);
  await act(async () => {});
  return screen;
}
it("is touch transparent, fades on completion, and unmounts after the exit", async () => {
  const screen = await show();
  expect(
    screen.getByTestId("recipe-ai-loading-glow", { includeHiddenElements: true }).props
      .pointerEvents
  ).toBe("none");
  await screen.rerender(<RecipeLoadingGlowOverlay active={false} />);
  expect(
    screen.getByTestId("glow-surface", { includeHiddenElements: true }).props.accessibilityLabel
  ).toBe("false:false");
  await act(() => jest.advanceTimersByTime(RECIPE_GLOW_EXIT_MS - 1));
  expect(screen.getByTestId("glow-surface", { includeHiddenElements: true })).toBeTruthy();
  await act(() => jest.advanceTimersByTime(1));
  expect(screen.queryByTestId("glow-surface", { includeHiddenElements: true })).toBeNull();
});
it("cancels a pending exit when another import or retry begins", async () => {
  const screen = await show();
  await screen.rerender(<RecipeLoadingGlowOverlay active={false} />);
  await act(() => jest.advanceTimersByTime(300));
  await screen.rerender(<RecipeLoadingGlowOverlay active />);
  await act(() => jest.advanceTimersByTime(600));
  expect(
    screen.getByTestId("glow-surface", { includeHiddenElements: true }).props.accessibilityLabel
  ).toBe("true:false");
});
it("removes the renderer in the background and respects live Reduce Motion changes", async () => {
  const screen = await show();
  await act(() => changeAppState("background"));
  expect(screen.queryByTestId("glow-surface", { includeHiddenElements: true })).toBeNull();
  await act(() => changeAppState("active"));
  expect(screen.getByTestId("glow-surface", { includeHiddenElements: true })).toBeTruthy();
  await act(() => changeMotion(true));
  expect(
    screen.getByTestId("glow-surface", { includeHiddenElements: true }).props.accessibilityLabel
  ).toBe("true:true");
  await screen.rerender(<RecipeLoadingGlowOverlay active={false} />);
  expect(screen.queryByTestId("glow-surface", { includeHiddenElements: true })).toBeNull();
  await screen.unmount();
  expect(removeAppState).toHaveBeenCalled();
  expect(removeMotion).toHaveBeenCalled();
});
