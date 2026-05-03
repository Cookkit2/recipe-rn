jest.mock("../useMealPlanQueries", () => ({
  useCalendarMealPlans: jest.fn(),
  useGroceryItemAttributes: jest.fn(),
  useMealPlanItems: jest.fn(),
}));

jest.mock("../usePantryQueries", () => ({
  usePantryItems: jest.fn(),
}));

import { calculateNeededQuantities } from "../useGroceryList";

describe("calculateNeededQuantities", () => {
  it("keeps manually hidden ingredients out of the calculated grocery list", () => {
    const ingredientMap = new Map([
      [
        "tomato",
        {
          name: "Tomato",
          totalQuantity: 4,
          unit: "piece",
          fromRecipes: ["Pasta", "Soup"],
        },
      ],
    ]);

    const groceryItems = calculateNeededQuantities(
      ingredientMap,
      [{ name: "Tomato", quantity: 2, unit: "piece", synonyms: [] }],
      { tomato: { isChecked: false, isDeleted: true } }
    );

    expect(groceryItems).toEqual([]);
  });
});
