import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import GroceryListHeaderRight from "../GroceryListHeaderRight";
import { openIngredientStore, shopForIngredients } from "~/lib/ingredient-shopping";
import { toast } from "sonner-native";
import { GRABMART_SHOPPING_GUIDE_COMPLETED_KEY } from "~/constants/storage-keys";
import useLocalStorageState from "~/hooks/useLocalStorageState";

let mockGuideComplete = true;
const mockSetGuideComplete = jest.fn();
jest.mock("~/hooks/useLocalStorageState", () => ({
  __esModule: true,
  default: jest.fn(() => [mockGuideComplete, mockSetGuideComplete, { isLoading: false }]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 20 }) }));
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, children, ...props }: any) =>
      visible ? <View {...props}>{children}</View> : null,
  };
});
jest.mock("~/components/ui/button", () => {
  const { Pressable } = require("react-native");
  return {
    Button: ({ children, isLoading, ...props }: any) => (
      <Pressable {...props} accessibilityRole="button">
        {children}
      </Pressable>
    ),
  };
});

jest.mock("~/lib/ingredient-shopping", () => ({
  openIngredientStore: jest.fn(),
  shopForIngredients: jest.fn(),
}));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("~/hooks/useColor", () => () => ({ foreground: "white", destructive: "red" }));
jest.mock("expo-router", () => {
  const { View, Text, Pressable } = require("react-native");
  const Action = ({ children, accessibilityLabel, ...props }: any) => (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
    >
      <Text>{children}</Text>
    </Pressable>
  );
  return {
    Stack: {
      Toolbar: Object.assign(({ children }: any) => <View>{children}</View>, {
        Menu: ({ children }: any) => <View>{children}</View>,
        Label: Text,
        MenuAction: Action,
        Button: Action,
      }),
    },
  };
});
const toolbarProps = {
  isSelectionMode: false,
  canSelectItems: false,
  onToggleSelection: jest.fn(),
  onDeleteSelected: jest.fn(),
};
const items = [
  { name: "Eggs", neededQuantity: 3, unit: "piece", isChecked: false, isCovered: false },
];
beforeEach(() => {
  jest.resetAllMocks();
  mockGuideComplete = true;
  jest
    .mocked(useLocalStorageState)
    .mockImplementation(() => [
      mockGuideComplete,
      mockSetGuideComplete,
      { isLoading: false, isPersistent: true, removeItem: jest.fn() },
    ]);
  mockSetGuideComplete.mockImplementation((value: boolean) => {
    mockGuideComplete = value;
  });
  jest.mocked(shopForIngredients).mockResolvedValue("opened");
  jest.mocked(openIngredientStore).mockResolvedValue(true);
});

it("shows the first-use guide without copying or leaving, and lets the user cancel", async () => {
  mockGuideComplete = false;
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  expect(screen.getByText("Paste your list in GrabMart")).toBeTruthy();
  expect(screen.getByText("Eggs — 3 piece")).toBeTruthy();
  expect(shopForIngredients).not.toHaveBeenCalled();
  expect(openIngredientStore).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
  expect(screen.queryByText("Paste your list in GrabMart")).toBeNull();
  expect(mockSetGuideComplete).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  expect(screen.getByText("Paste your list in GrabMart")).toBeTruthy();
});

it("continues with the current quantities and remembers a successful first handoff", async () => {
  mockGuideComplete = false;
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  const updatedItems = [{ ...items[0]!, neededQuantity: 2 }];
  await screen.rerender(<GroceryListHeaderRight {...toolbarProps} items={updatedItems} />);
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledWith("grabmart", updatedItems));
  expect(mockSetGuideComplete).toHaveBeenCalledWith(true);
  expect(useLocalStorageState).toHaveBeenCalledWith(GRABMART_SHOPPING_GUIDE_COMPLETED_KEY, {
    defaultValue: false,
  });
  expect(screen.queryByText("Paste your list in GrabMart")).toBeNull();
  await screen.unmount();
  const reopened = await render(<GroceryListHeaderRight {...toolbarProps} items={updatedItems} />);
  await fireEvent.press(reopened.getByRole("button", { name: "Shop on GrabMart" }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledTimes(2));
  expect(reopened.queryByText("Paste your list in GrabMart")).toBeNull();
});

it.each(["clipboard", "redirect"])(
  "keeps the guide available after a %s failure",
  async (failure) => {
    mockGuideComplete = false;
    if (failure === "clipboard")
      jest.mocked(shopForIngredients).mockRejectedValueOnce(new Error("Clipboard unavailable"));
    else jest.mocked(shopForIngredients).mockResolvedValueOnce("copied");
    const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
    await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockSetGuideComplete).not.toHaveBeenCalled();
    expect(screen.getByText("Paste your list in GrabMart")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(mockSetGuideComplete).toHaveBeenCalledWith(true));
  }
);

it("does not consume the first-use guide when there is nothing left to buy", async () => {
  mockGuideComplete = false;
  jest.mocked(shopForIngredients).mockResolvedValue("empty");
  const screen = await render(
    <GroceryListHeaderRight {...toolbarProps} items={[{ ...items[0]!, isCovered: true }]} />
  );
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await waitFor(() => expect(openIngredientStore).toHaveBeenCalledWith("grabmart"));
  expect(screen.queryByText("Paste your list in GrabMart")).toBeNull();
  expect(mockSetGuideComplete).not.toHaveBeenCalled();
});

it("continues only once when tapped repeatedly while the handoff is pending", async () => {
  mockGuideComplete = false;
  let finish!: (result: "opened") => void;
  jest.mocked(shopForIngredients).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  expect(shopForIngredients).toHaveBeenCalledTimes(1);
  expect(mockSetGuideComplete).not.toHaveBeenCalled();
  await act(() => finish("opened"));
  expect(mockSetGuideComplete).toHaveBeenCalledWith(true);
});

it("explains Grab's paste limit while handing off the full long list", async () => {
  mockGuideComplete = false;
  const longList = Array.from({ length: 60 }, (_, index) => ({
    ...items[0]!,
    name: `Ingredient number ${index}`,
  }));
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={longList} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  expect(
    screen.getByText("Grab’s field holds 1,000 characters. Paste this list in smaller batches.")
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledWith("grabmart", longList));
});

it.each([
  ["GrabMart", "grabmart"],
  ["foodpanda", "foodpanda"],
] as const)("opens %s with the current grocery list", async (label, provider) => {
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: `Shop on ${label}` }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledWith(provider, items));
  expect(toast.success).toHaveBeenCalledWith("List copied");
});

it("still redirects from an empty list without claiming to copy items", async () => {
  jest.mocked(shopForIngredients).mockResolvedValue("empty");
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={[]} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on foodpanda" }));
  await waitFor(() => expect(openIngredientStore).toHaveBeenCalledWith("foodpanda"));
  expect(toast.success).not.toHaveBeenCalled();
});

it("prevents concurrent taps across both stores and re-enables them after failure", async () => {
  let finish!: (value: "copied") => void;
  jest.mocked(shopForIngredients).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await fireEvent.press(screen.getByRole("button", { name: "Shop on foodpanda" }));
  expect(shopForIngredients).toHaveBeenCalledTimes(1);
  await act(() => finish("copied"));
  expect(toast.error).toHaveBeenCalledWith("List copied. Open GrabMart to shop.");
  await fireEvent.press(screen.getByRole("button", { name: "Shop on foodpanda" }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledTimes(2));
});

it("reports an empty-list redirect failure using the selected store", async () => {
  jest.mocked(shopForIngredients).mockResolvedValue("empty");
  jest.mocked(openIngredientStore).mockResolvedValue(false);
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={[]} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on foodpanda" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("Couldn't open foodpanda. Please try again.")
  );
});

it("retains selection actions in the overflow menu and cancel/delete while selecting", async () => {
  const screen = await render(
    <GroceryListHeaderRight {...toolbarProps} canSelectItems items={items} />
  );
  await fireEvent.press(screen.getByRole("button", { name: "Select items" }));
  expect(toolbarProps.onToggleSelection).toHaveBeenCalledTimes(1);
  await screen.rerender(
    <GroceryListHeaderRight {...toolbarProps} canSelectItems isSelectionMode items={items} />
  );
  expect(screen.queryByRole("button", { name: "Shop on GrabMart" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Delete selected items" }));
  expect(toolbarProps.onDeleteSelected).toHaveBeenCalledTimes(1);
});
