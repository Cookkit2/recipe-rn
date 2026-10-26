import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import AddToPlanModal from "../Details/AddToPlanModal";
import DateSection from "~/components/Ingredient/DateSection";

const mockAddToMealPlan = jest.fn();
const mockBack = jest.fn();
const mockUpdatePantryItem = jest.fn();
const mockRecipe = { title: "Chicken curry", servings: 2 };
const mockPantryItem = {
  id: "pantry-item",
  expiry_date: new Date(2026, 10, 1),
  created_at: new Date(2026, 9, 25),
};
const mockHaptic = jest.fn();

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  Stack: { Screen: () => null },
}));
jest.mock("~/hooks/queries/useMealPlanQueries", () => ({
  useAddToMealPlan: () => ({ mutateAsync: mockAddToMealPlan, isPending: false }),
}));
jest.mock("~/hooks/queries/useRecipeQueries", () => ({
  useRecipe: () => ({ data: mockRecipe }),
}));
jest.mock("~/store/IngredientDetailContext", () => ({
  useIngredientDetailStore: () => ({
    pantryItem: mockPantryItem,
    updatePantryItem: mockUpdatePantryItem,
  }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 24 }),
}));
jest.mock("~/hooks/useSelectionHaptic", () => ({ useSelectionHaptic: () => mockHaptic }));
jest.mock("@expo/ui/community/datetime-picker", () => ({
  __esModule: true,
  default: (props: object) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} testID="native-date-picker" />;
  },
}));
jest.mock("~/components/ui/button", () => ({
  Button: jest.requireActual("react-native").Pressable,
}));
jest.mock("~/components/ui/typography", () => {
  const { Text } = jest.requireActual("react-native");
  return { H2: Text, H3: Text, H4: Text, Muted: Text, P: Text };
});
jest.mock("~/components/ui/card", () => {
  const { View } = jest.requireActual("react-native");
  return { Card: View, CardContent: View };
});
jest.mock("~/components/ui/separator", () => ({
  Separator: jest.requireActual("react-native").View,
}));
jest.mock("~/components/ui/TextShimmer", () => ({
  __esModule: true,
  default: jest.requireActual("react-native").View,
}));
jest.mock("~/components/Shared/SegmentedButtons", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/components/Shared/SlidingNumber", () => ({
  SlidingNumber: () => null,
}));
jest.mock("lucide-uniwind", () => new Proxy({}, { get: () => () => null }));
jest.mock("~/utils/logger", () => ({ log: { error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAddToMealPlan.mockResolvedValue(undefined);
  jest.replaceProperty(Platform, "OS", "ios");
});
afterEach(() => jest.restoreAllMocks());

it("keeps the meal-plan date wheel full width and saves the selected date", async () => {
  const screen = await render(<AddToPlanModal recipeId="recipe-1" />);
  await fireEvent.press(screen.getByLabelText("Open date picker"));
  const picker = screen.getByTestId("native-date-picker");
  expect(StyleSheet.flatten(picker.props.style).width).toBe("100%");
  const selected = new Date(2026, 10, 12, 14, 30);
  await act(async () => picker.props.onChange({ type: "set" }, selected));
  await fireEvent.press(screen.getByLabelText("Confirm date selection"));
  expect(screen.getByText("Thursday, Nov 12, 2026")).toBeTruthy();
  await fireEvent.press(screen.getByText("Add to Meal Plan"));
  expect(mockAddToMealPlan).toHaveBeenCalledWith({
    recipeId: "recipe-1",
    servings: 2,
    mealSlot: "dinner",
    date: new Date(2026, 10, 12),
  });
});

it.each([
  ["Change expiry date", "expiry_date", "Confirm expiry date selection"],
  ["Change purchase date", "purchase_date", "Confirm purchase date selection"],
])("keeps the ingredient wheel full width: %s", async (hint, field, confirm) => {
  const screen = await render(<DateSection />);
  await fireEvent.press(screen.getByHintText(hint));
  const picker = screen.getByTestId("native-date-picker");
  expect(StyleSheet.flatten(picker.props.style).width).toBe("100%");
  const selected = new Date(2026, 10, 12);
  await act(async () => picker.props.onChange({ type: "set" }, selected));
  expect(mockUpdatePantryItem).toHaveBeenCalledWith({ ...mockPantryItem, [field]: selected });
  await fireEvent.press(screen.getByLabelText(confirm));
  expect(screen.queryByTestId("native-date-picker")).toBeNull();
});
