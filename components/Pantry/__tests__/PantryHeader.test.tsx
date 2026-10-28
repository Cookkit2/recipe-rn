import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import PantryHeader from "../PantryHeader";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: {
    Toolbar: Object.assign(
      ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
      {
        View: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
      }
    ),
  },
}));
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 1 } }));
jest.mock("~/components/ui/typography", () => ({
  H1: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
}));
jest.mock("../PantryHeaderActions", () => ({
  __esModule: true,
  default: ({
    onSearch,
    onAdd,
    onProfile,
    disabled,
  }: {
    onSearch: () => void;
    onAdd: () => void;
    onProfile: () => void;
    disabled: boolean;
  }) => (
    <View>
      <Pressable accessibilityLabel="Search" disabled={disabled} onPress={onSearch} />
      <Pressable accessibilityLabel="Add ingredient" disabled={disabled} onPress={onAdd} />
      <Pressable accessibilityLabel="Profile" disabled={disabled} onPress={onProfile} />
    </View>
  ),
}));

it("fades both header groups from the same live progress", async () => {
  const pullSearch = { progress: { value: 0 }, phase: "closed", open: jest.fn() };
  const screen = await render(<PantryHeader pullSearch={pullSearch as never} />);
  const opacity = (id: string) =>
    StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style).opacity;
  expect(opacity("pantry-header-title")).toBe(1);
  expect(opacity("pantry-header-actions")).toBe(1);
  pullSearch.progress.value = 0.5;
  pullSearch.phase = "pulling";
  await screen.rerender(<PantryHeader pullSearch={pullSearch as never} />);
  expect(opacity("pantry-header-title")).toBe(0.5);
  expect(opacity("pantry-header-actions")).toBe(0.5);
  expect(screen.getByLabelText("Search", { includeHiddenElements: true })).toBeDisabled();
  pullSearch.progress.value = 1;
  await screen.rerender(<PantryHeader pullSearch={pullSearch as never} />);
  expect(opacity("pantry-header-title")).toBe(0);
  expect(opacity("pantry-header-actions")).toBe(0);
});

it("opens search through the shared fade and preserves Add and Profile navigation", async () => {
  mockPush.mockClear();
  const pullSearch = { progress: { value: 0 }, phase: "closed", open: jest.fn() };
  const screen = await render(<PantryHeader pullSearch={pullSearch as never} />);
  await fireEvent.press(screen.getByLabelText("Search"));
  expect(pullSearch.open).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Add ingredient"));
  expect(mockPush).toHaveBeenLastCalledWith("/ingredient/create");
  await fireEvent.press(screen.getByLabelText("Profile"));
  expect(mockPush).toHaveBeenLastCalledWith("/profile");
});

it("keeps the AI mode switch out of Pantry's top toolbar", async () => {
  mockPush.mockClear();
  const pullSearch = { progress: { value: 0 }, phase: "closed", open: jest.fn() };
  const screen = await render(<PantryHeader pullSearch={pullSearch as never} />);
  expect(screen.queryByLabelText("Ask Cookkit")).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
  expect(pullSearch.open).not.toHaveBeenCalled();
});
