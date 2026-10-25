import {
  openIngredientStore,
  shopForIngredients,
  FOODPANDA_GROCERY_URL,
} from "../ingredient-shopping.web";
import { GRABMART_FALLBACK_URL } from "~/utils/grabmart-shopping";
const assign = jest.fn();
const writeText = jest.fn();
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalLocation = Object.getOwnPropertyDescriptor(window, "location");
beforeAll(() => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText } },
  });
  Object.defineProperty(window, "location", { configurable: true, value: { assign } });
});
afterAll(() => {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else Reflect.deleteProperty(globalThis, "navigator");
  if (originalLocation) Object.defineProperty(window, "location", originalLocation);
  else Reflect.deleteProperty(window, "location");
});
beforeEach(() => {
  jest.resetAllMocks();
  writeText.mockResolvedValue(undefined);
});
it.each([
  ["grabmart", GRABMART_FALLBACK_URL],
  ["foodpanda", FOODPANDA_GROCERY_URL],
] as const)(
  "opens %s directly without overwriting the clipboard",
  async (provider, destination) => {
    expect(await openIngredientStore(provider)).toBe(true);
    expect(assign).toHaveBeenCalledWith(destination);
    expect(writeText).not.toHaveBeenCalled();
  }
);
it("copies only needed items before the web redirect", async () => {
  expect(
    await shopForIngredients("foodpanda", [
      { name: "Eggs", neededQuantity: 3, unit: "piece", isChecked: false, isCovered: false },
    ])
  ).toBe("opened");
  expect(writeText).toHaveBeenCalledWith("Eggs — 3 piece");
  expect(assign).toHaveBeenCalledWith(FOODPANDA_GROCERY_URL);
  expect(await shopForIngredients("foodpanda", [])).toBe("empty");
});
it("reports web navigation failures", async () => {
  assign.mockImplementationOnce(() => {
    throw new Error("Blocked");
  });
  expect(await openIngredientStore("foodpanda")).toBe(false);
});
