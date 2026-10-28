import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SearchInputBar } from "../SearchInputBar";

let mockPlatform = "ios";
let mockTheme = "dark";
const mockHeight = { value: -310 };
const mockProgress = { value: 1 };
const mockFocus = jest.fn();
const mockBlur = jest.fn();
jest.mock("react-native", () =>
  Object.defineProperties(Object.create(jest.requireActual("react-native")), {
    Platform: {
      value: {
        get OS() {
          return mockPlatform;
        },
      },
    },
    TextInput: {
      value: require("react").forwardRef((props: any, ref: any) => {
        require("react").useImperativeHandle(ref, () => ({ focus: mockFocus, blur: mockBlur }));
        return require("react").createElement(require("react-native").View, props);
      }),
    },
  })
);
jest.mock("expo-glass-effect", () => ({
  GlassView: require("react-native").View,
  isLiquidGlassAvailable: () => true,
}));
jest.mock("expo-symbols", () => ({ SymbolView: require("react-native").View }));
jest.mock("uniwind", () => ({ useUniwind: () => ({ theme: mockTheme }) }));
jest.mock("react-native-keyboard-controller", () => ({
  useReanimatedKeyboardAnimation: () => ({ height: mockHeight, progress: mockProgress }),
}));
jest.mock("~/hooks/useColor", () => () => ({ foreground: "white", mutedForeground: "gray" }));

const props = {
  ref: React.createRef<import("react-native-screens").SearchBarCommands>(),
  value: "egg",
  conversation: false,
  placeholder: "Search ingredients and recipes…",
  bottom: 34,
  onChangeText: jest.fn(),
  onSwitchMode: jest.fn(),
  onDismiss: jest.fn(),
  onSubmit: jest.fn(),
  onFocus: jest.fn(),
  onBlur: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform = "ios";
  mockTheme = "dark";
  mockHeight.value = -310;
  mockProgress.value = 1;
});

it("renders independent, matching glass circles outside the input and retains the draft on toggle", async () => {
  const screen = await render(<SearchInputBar {...props} />);
  const input = screen.getByTestId("native-search-input");
  const pill = screen.getByTestId("search-input-pill");
  expect(within(pill).queryByTestId("search-mode-button")).toBeNull();
  expect(within(pill).queryByTestId("search-close-button")).toBeNull();
  const mode = screen.getByTestId("search-mode-button");
  const close = screen.getByTestId("search-close-button");
  expect(StyleSheet.flatten(mode.parent?.props.style)).toEqual(
    StyleSheet.flatten(close.parent?.props.style)
  );
  expect(pill.props.colorScheme).toBe("dark");
  await fireEvent.press(mode);
  expect(props.onSwitchMode).toHaveBeenCalledTimes(1);
  expect(mockBlur).not.toHaveBeenCalled();
  expect(mockFocus).not.toHaveBeenCalled();
  await screen.rerender(<SearchInputBar {...props} conversation placeholder="Ask Cookkit…" />);
  expect(screen.getByTestId("native-search-input")).toBe(input);
  expect(input.props.value).toBe("egg");
  expect(screen.getByTestId("search-mode-symbol").props.name).toBe("magnifyingglass");
  await fireEvent.press(close);
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
});

it.each(["ios", "android"])(
  "positions the row above the keyboard on %s without doubling Android's resize",
  async (os) => {
    mockPlatform = os;
    const screen = await render(<SearchInputBar {...props} />);
    const row = () => StyleSheet.flatten(screen.getByTestId("search-input-bar").props.style);
    expect(row().transform).toEqual([{ translateY: os === "ios" ? -310 : 0 }]);
    expect(row().paddingBottom).toBe(8);
    mockHeight.value = 0;
    mockProgress.value = 0;
    await screen.rerender(<SearchInputBar {...props} />);
    expect(row().transform).toEqual([{ translateY: 0 }]);
    expect(row().paddingBottom).toBe(42);
  }
);

it("keeps the keyboard open on submit so AI replies use the same input", async () => {
  const screen = await render(<SearchInputBar {...props} conversation />);
  const input = screen.getByTestId("native-search-input");
  expect(input.props.submitBehavior).toBe("submit");
  await fireEvent(input, "submitEditing");
  expect(props.onSubmit).toHaveBeenCalledTimes(1);
  expect(mockBlur).not.toHaveBeenCalled();
});
