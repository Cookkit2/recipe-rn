import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import GroceryStoreShortcuts from "../GroceryStoreShortcuts";
import { openIngredientStore, shopForIngredients } from "~/lib/ingredient-shopping";
import { toast } from "sonner-native";

jest.mock("~/lib/ingredient-shopping", () => ({
  openIngredientStore: jest.fn(),
  shopForIngredients: jest.fn(),
}));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("lucide-uniwind", () => ({ ShoppingBagIcon: () => null, StoreIcon: () => null }));
jest.mock("~/components/ui/button", () => ({
  Button: ({ isLoading, containerClassName, ...props }: any) => {
    const { Pressable } = require("react-native");
    return <Pressable {...props} accessibilityRole="button" />;
  },
}));
jest.mock("~/components/ui/typography", () => ({ P: require("react-native").Text }));
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
  const screen = await render(<GroceryStoreShortcuts items={items} />);
  await fireEvent.press(screen.getByRole("button", { name: `Shop on ${label}` }));
  await waitFor(() => expect(shopForIngredients).toHaveBeenCalledWith(provider, items));
  expect(toast.success).toHaveBeenCalledWith("List copied");
});

it("still redirects from an empty list without claiming to copy items", async () => {
  jest.mocked(shopForIngredients).mockResolvedValue("empty");
  const screen = await render(<GroceryStoreShortcuts items={[]} />);
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
  const screen = await render(<GroceryStoreShortcuts items={items} />);
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
  const screen = await render(<GroceryStoreShortcuts items={[]} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shop on foodpanda" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("Couldn't open foodpanda. Please try again.")
  );
});
