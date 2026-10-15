import Clipboard from "@react-native-clipboard/clipboard";
import { Linking } from "react-native";
import { FOODPANDA_GROCERY_URL, shopForIngredients } from "../ingredient-shopping";
jest.mock("@react-native-clipboard/clipboard", () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));
jest.mock("react-native", () => ({ Linking: { openURL: jest.fn() } }));
const item = { name: "Eggs", unit: "piece", neededQuantity: 3, isChecked: false, isCovered: false };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(Linking.openURL).mockResolvedValue(undefined);
});
it("copies the shortfall and opens foodpanda groceries", async () => {
  expect(await shopForIngredients("foodpanda", [item])).toBe("opened");
  expect(Clipboard.setString).toHaveBeenCalledWith("Eggs — 3 piece");
  expect(Linking.openURL).toHaveBeenCalledWith(FOODPANDA_GROCERY_URL);
});
it("retains the list if foodpanda cannot open", async () => {
  jest.mocked(Linking.openURL).mockRejectedValue(new Error("blocked"));
  expect(await shopForIngredients("foodpanda", [item])).toBe("copied");
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
});
