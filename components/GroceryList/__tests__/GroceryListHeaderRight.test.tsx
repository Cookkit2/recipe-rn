import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import GroceryListHeaderRight from "../GroceryListHeaderRight";
import { openIngredientStore, shopForIngredients } from "~/lib/ingredient-shopping";
import { toast } from "sonner-native";

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
  jest.mocked(shopForIngredients).mockResolvedValue("opened");
  jest.mocked(openIngredientStore).mockResolvedValue(true);
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
