import React, { useEffect } from "react";
import { render } from "@testing-library/react-native";
import { View } from "react-native";
import { RecipeLoadingGlowProvider, useRecipeLoadingGlow } from "../RecipeLoadingGlowProvider";

let mockFocused = true;
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) =>
    useEffect(() => (mockFocused ? callback() : undefined), [callback, mockFocused]),
}));
beforeEach(() => {
  mockFocused = true;
});
jest.mock("../RecipeLoadingGlowOverlay", () => ({
  __esModule: true,
  default: ({ active }: { active: boolean }) => (
    <View testID={active ? "glow-active" : "glow-inactive"} />
  ),
}));
function LoadingScreen({ active }: { active: boolean }) {
  useRecipeLoadingGlow(active);
  return null;
}
function Flow({
  first,
  second,
  mountFirst = true,
}: {
  first: boolean;
  second: boolean;
  mountFirst?: boolean;
}) {
  return (
    <RecipeLoadingGlowProvider>
      {mountFirst && <LoadingScreen active={first} />}
      <LoadingScreen active={second} />
    </RecipeLoadingGlowProvider>
  );
}
it("keeps overlapping loading operations independent and releases on unmount", async () => {
  const screen = await render(<Flow first second />);
  expect(screen.getByTestId("glow-active")).toBeTruthy();
  await screen.rerender(<Flow first={false} second />);
  expect(screen.getByTestId("glow-active")).toBeTruthy();
  await screen.rerender(<Flow first second={false} />);
  expect(screen.getByTestId("glow-active")).toBeTruthy();
  await screen.rerender(<Flow mountFirst={false} first second={false} />);
  expect(screen.getByTestId("glow-inactive")).toBeTruthy();
});
it("does not leak a scope during Strict Mode replay or loading restarts", async () => {
  const flow = (active: boolean) => (
    <React.StrictMode>
      <Flow first={active} second={false} />
    </React.StrictMode>
  );
  const screen = await render(flow(true));
  await screen.rerender(flow(false));
  expect(screen.getByTestId("glow-inactive")).toBeTruthy();
  await screen.rerender(flow(true));
  expect(screen.getByTestId("glow-active")).toBeTruthy();
  await screen.rerender(flow(false));
  expect(screen.getByTestId("glow-inactive")).toBeTruthy();
});

it("releases a hidden screen and resumes loading when it receives focus again", async () => {
  const screen = await render(<Flow first second={false} />);
  mockFocused = false;
  await screen.rerender(<Flow first second />);
  expect(screen.getByTestId("glow-inactive")).toBeTruthy();
  mockFocused = true;
  await screen.rerender(<Flow first second={false} />);
  expect(screen.getByTestId("glow-active")).toBeTruthy();
});
