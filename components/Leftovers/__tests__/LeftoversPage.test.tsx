import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import LeftoversPage from "~/app/leftovers";
import type { Leftover } from "~/types/Leftover";

const mockRefetch = jest.fn();
const mockSetStatus = jest.fn().mockResolvedValue(undefined);
let mockItems: Leftover[];
let mockLoading = false;
let mockError: Error | null = null;

jest.mock("expo-router", () => {
  const { Pressable } = require("react-native");
  return {
    Stack: {
      Screen: () => null,
      Toolbar: Object.assign(({ children }: any) => <>{children}</>, {
        Button: (props: any) => <Pressable {...props} accessibilityRole="button" />,
      }),
    },
    useLocalSearchParams: () => ({}),
  };
});
jest.mock("~/hooks/queries/useLeftovers", () => ({
  useLeftovers: () => ({
    data: mockItems,
    isLoading: mockLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
  useLeftoverActions: () => ({ setStatus: { mutateAsync: mockSetStatus, isPending: false } }),
}));
jest.mock("~/components/Leftovers/LeftoverForm", () => ({
  __esModule: true,
  default: ({ item, onClose }: any) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close leftover form"
        onPress={onClose}
      >
        <Text>{item ? `Editing ${item.name}` : "New leftover"}</Text>
      </Pressable>
    );
  },
}));
jest.mock("~/components/ui/button", () => ({
  Button: ({ children, ...props }: any) =>
    require("react").createElement(
      require("react-native").Pressable,
      { ...props, accessibilityRole: "button" },
      children
    ),
}));
jest.mock("~/components/ui/typography", () => ({
  H4: require("react-native").Text,
  P: require("react-native").Text,
}));
jest.mock("~/components/ui/text", () => ({ Text: require("react-native").Text }));
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({ foreground: "#111" }),
}));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockLoading = false;
  mockError = null;
  mockItems = [
    {
      id: "soup",
      name: "Tomato soup",
      servings: 2,
      cookedAt: new Date("2026-10-26T10:00:00Z"),
      status: "active",
    },
  ];
});

it("keeps one page scroll view mounted while loading resolves into leftovers", async () => {
  mockLoading = true;
  const screen = await render(<LeftoversPage />);
  const page = screen.getByTestId("leftovers-scroll");
  mockLoading = false;
  await screen.rerender(<LeftoversPage />);
  expect(screen.getByTestId("leftovers-scroll")).toBe(page);
  expect(screen.getByText("Tomato soup")).toBeTruthy();
});

it("keeps empty, error and retry content in that same page scroll view", async () => {
  mockItems = [];
  const screen = await render(<LeftoversPage />);
  const page = screen.getByTestId("leftovers-scroll");
  expect(screen.getByText("No leftovers saved")).toBeTruthy();
  mockError = new Error("Offline");
  await screen.rerender(<LeftoversPage />);
  expect(screen.getByTestId("leftovers-scroll")).toBe(page);
  await fireEvent.press(screen.getByText("Try again"));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it("keeps row actions and the native add action working within a scrolling page", async () => {
  const screen = await render(<LeftoversPage />);
  await fireEvent.press(screen.getByText("Eaten"));
  expect(mockSetStatus).toHaveBeenCalledWith({ id: "soup", status: "eaten" });
  await fireEvent.press(screen.getByText("Edit"));
  expect(screen.getByText("Editing Tomato soup")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Close leftover form" }));
  await fireEvent.press(screen.getByRole("button", { name: "Add leftovers" }));
  expect(screen.getByText("New leftover")).toBeTruthy();
  expect(screen.getAllByTestId("leftovers-scroll")).toHaveLength(1);
});
