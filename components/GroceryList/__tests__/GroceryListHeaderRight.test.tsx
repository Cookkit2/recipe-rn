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
jest.mock("../GrabMartShoppingGuide", () => {
  const { View, Text, Pressable } = require("react-native");
  return ({ list, busy, onContinue, onClose }: any) => (
    <View testID="grabmart-guide" onAccessibilityEscape={busy ? undefined : onClose}>
      <Text>Shop on GrabMart</Text>
      <Text>{list}</Text>
      {list.length > 1000 && (
        <Text>Grab’s field holds 1,000 characters. Paste this list in smaller batches.</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue"
        disabled={busy}
        onPress={onContinue}
      />
    </View>
  );
});

jest.mock("~/lib/ingredient-shopping", () => ({
  openIngredientStore: jest.fn(),
  shopForIngredients: jest.fn(),
}));
jest.mock("sonner-native", () => ({
  toast: { error: jest.fn(), success: jest.fn(), dismiss: jest.fn() },
}));
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
  expect(screen.getByTestId("grabmart-guide")).toBeTruthy();
  expect(screen.getByText("Eggs — 3 piece")).toBeTruthy();
  expect(shopForIngredients).not.toHaveBeenCalled();
  expect(openIngredientStore).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId("grabmart-guide"), "accessibilityEscape");
  expect(screen.queryByTestId("grabmart-guide")).toBeNull();
  expect(mockSetGuideComplete).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  expect(screen.getByTestId("grabmart-guide")).toBeTruthy();
});

it("continues with the current quantities and remembers a successful first handoff", async () => {
  mockGuideComplete = false;
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  const updatedItems = [{ ...items[0]!, neededQuantity: 2 }];
  await screen.rerender(<GroceryListHeaderRight {...toolbarProps} items={updatedItems} />);
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() =>
    expect(shopForIngredients).toHaveBeenCalledWith("grabmart", updatedItems, expect.any(Function))
  );
  expect(mockSetGuideComplete).toHaveBeenCalledWith(true);
  expect(useLocalStorageState).toHaveBeenCalledWith(GRABMART_SHOPPING_GUIDE_COMPLETED_KEY, {
    defaultValue: false,
  });
  expect(screen.queryByTestId("grabmart-guide")).toBeNull();
  await screen.unmount();
  const reopened = await render(<GroceryListHeaderRight {...toolbarProps} items={updatedItems} />);
  await fireEvent.press(reopened.getByRole("button", { name: "Shop on GrabMart" }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledTimes(2));
  expect(shopForIngredients).toHaveBeenLastCalledWith("grabmart", updatedItems, undefined);
  expect(reopened.queryByTestId("grabmart-guide")).toBeNull();
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
    expect(screen.getByTestId("grabmart-guide")).toBeTruthy();
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
  expect(screen.queryByTestId("grabmart-guide")).toBeNull();
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
  await waitFor(() =>
    expect(shopForIngredients).toHaveBeenCalledWith("grabmart", longList, expect.any(Function))
  );
});

it("offers GrabMart with the current grocery list and hides foodpanda", async () => {
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  expect(screen.queryByRole("button", { name: "Shop on foodpanda" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await waitFor(() =>
    expect(shopForIngredients).toHaveBeenCalledWith("grabmart", items, undefined)
  );
  expect(toast.success).not.toHaveBeenCalled();
});

it("still redirects from an empty list without claiming to copy items", async () => {
  jest.mocked(shopForIngredients).mockResolvedValue("empty");
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={[]} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await waitFor(() => expect(openIngredientStore).toHaveBeenCalledWith("grabmart"));
  expect(toast.success).not.toHaveBeenCalled();
});

it("prevents concurrent store taps and re-enables the action after failure", async () => {
  let finish!: (value: "copied") => void;
  jest.mocked(shopForIngredients).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  expect(shopForIngredients).toHaveBeenCalledTimes(1);
  await act(() => finish("copied"));
  expect(toast.error).toHaveBeenCalledWith("List copied. Open GrabMart to shop.");
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledTimes(2));
});

it("reports an empty-list redirect failure using the selected store", async () => {
  jest.mocked(shopForIngredients).mockResolvedValue("empty");
  jest.mocked(openIngredientStore).mockResolvedValue(false);
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={[]} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("Couldn't open GrabMart. Please try again.")
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

it("confirms copying, counts down 2 then 1, and only then opens GrabMart", async () => {
  jest.useFakeTimers();
  mockGuideComplete = false;
  let redirected = false;
  jest.mocked(shopForIngredients).mockImplementation(async (_provider, _items, beforeOpen) => {
    await beforeOpen?.();
    redirected = true;
    return "opened";
  });
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  const toastId = jest.mocked(toast.success).mock.calls[0]![1]!.id;
  expect(toast.success).toHaveBeenLastCalledWith(
    "List copied",
    expect.objectContaining({
      id: toastId,
      description: "Opening GrabMart in 2…",
    })
  );
  expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  expect(redirected).toBe(false);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
  expect(toast.success).toHaveBeenLastCalledWith(
    "List copied",
    expect.objectContaining({
      id: toastId,
      description: "Opening GrabMart in 1…",
    })
  );
  expect(redirected).toBe(false);
  expect(mockSetGuideComplete).not.toHaveBeenCalled();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(999);
  });
  expect(redirected).toBe(false);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1);
  });
  expect(redirected).toBe(true);
  expect(toast.dismiss).toHaveBeenCalledWith(toastId);
  expect(mockSetGuideComplete).toHaveBeenCalledWith(true);
  await screen.unmount();
  jest.useRealTimers();
});

it("cancels the countdown when the grocery screen unmounts", async () => {
  jest.useFakeTimers();
  mockGuideComplete = false;
  let redirected = false;
  jest.mocked(shopForIngredients).mockImplementation(async (_provider, _items, beforeOpen) => {
    await beforeOpen?.();
    redirected = true;
    return "opened";
  });
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  expect(toast.success).toHaveBeenCalledWith(
    "List copied",
    expect.objectContaining({
      description: "Opening GrabMart in 2…",
    })
  );
  await screen.unmount();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  expect(redirected).toBe(false);
  expect(toast.error).not.toHaveBeenCalled();
  expect(mockSetGuideComplete).not.toHaveBeenCalled();
  jest.useRealTimers();
});

it("copies and redirects immediately without a toast after the tutorial is complete", async () => {
  jest.useFakeTimers();
  let redirected = false;
  jest.mocked(shopForIngredients).mockImplementation(async (_provider, _items, beforeOpen) => {
    await beforeOpen?.();
    redirected = true;
    return "opened";
  });
  const screen = await render(<GroceryListHeaderRight {...toolbarProps} items={items} />);
  try {
    await fireEvent.press(screen.getByRole("button", { name: "Shop on GrabMart" }));
    expect(redirected).toBe(true);
    expect(screen.queryByTestId("grabmart-guide")).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  } finally {
    await screen.unmount();
    jest.useRealTimers();
  }
});
