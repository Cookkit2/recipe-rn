import {
  aggregateRecipeIngredients,
  calculateNeededQuantities,
  computeGroceryStats,
  groupGroceryItemsIntoSections,
} from "../grocery-list";
import type { MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";

const required = (name: string, quantity: number, unit: string) =>
  new Map([[name.toLowerCase(), { name, totalQuantity: quantity, unit, fromRecipes: ["Dinner"] }]]);
const stock = (name: string, quantity: number, unit: string, other = {}) => ({
  id: name,
  name,
  quantity,
  unit,
  ...other,
});

describe("pantry-aware shopping", () => {
  it("buys only the shortfall and removes fully covered items from sections", () => {
    const short = calculateNeededQuantities(
      required("Eggs", 4, "piece"),
      [stock("Egg", 1, "pieces")],
      {}
    );
    expect(short[0]?.neededQuantity).toBe(3);
    const covered = calculateNeededQuantities(
      required("Eggs", 4, "piece"),
      [stock("Egg", 4, "pieces")],
      {}
    );
    expect(groupGroceryItemsIntoSections(covered)).toEqual([]);
    expect(computeGroceryStats(covered).allCheckedOrCovered).toBe(true);
  });
  it("sums compatible batches without double-counting stable stock IDs", () => {
    const items = [
      stock("Flour", 0.2, "kg", { id: "one" }),
      stock("Flour", 100, "g", { id: "two" }),
      stock("Flour", 0.2, "kg", { id: "one" }),
    ];
    expect(
      calculateNeededQuantities(required("Flour", 500, "g"), items, {})[0]?.neededQuantity
    ).toBe(200);
  });
  it("ignores incompatible units, expired and empty stock", () => {
    const items = [
      stock("Flour", 500, "ml"),
      stock("Flour", 500, "g", { id: "old", expiry_date: new Date(2000, 0, 1) }),
      stock("Flour", -2, "g", { id: "bad" }),
    ];
    expect(
      calculateNeededQuantities(required("Flour", 500, "g"), items, {})[0]?.neededQuantity
    ).toBe(500);
  });
  it("matches explicit synonyms without treating egg noodles as eggs", () => {
    expect(
      calculateNeededQuantities(
        required("Eggs", 4, "piece"),
        [stock("Egg noodles", 10, "piece")],
        {}
      )[0]?.neededQuantity
    ).toBe(4);
    expect(
      calculateNeededQuantities(
        required("Coriander", 10, "g"),
        [stock("Cilantro", 10, "g", { synonyms: [{ synonym: "coriander" }] })],
        {}
      )[0]?.isCovered
    ).toBe(true);
  });
  it("does not allocate the same pantry stock twice through different synonyms", () => {
    const requirements = new Map([
      ...required("Cilantro", 10, "g"),
      ...required("Coriander", 10, "g"),
    ]);
    const result = calculateNeededQuantities(
      requirements,
      [stock("Cilantro", 10, "g", { synonyms: [{ synonym: "coriander" }] })],
      {}
    );
    expect(result.reduce((sum, item) => sum + item.neededQuantity, 0)).toBe(10);
  });
  it("does not report all set when a covered ingredient accompanies an unchecked missing item", () => {
    const covered = calculateNeededQuantities(
      required("Salt", 1, "g"),
      [stock("Salt", 10, "g")],
      {}
    );
    const missing = calculateNeededQuantities(required("Eggs", 4, "piece"), [], {});
    expect(computeGroceryStats([...covered, ...missing]).allCheckedOrCovered).toBe(false);
    expect(
      computeGroceryStats([...covered, { ...missing[0]!, isChecked: true }]).allCheckedOrCovered
    ).toBe(true);
  });
  it("retains incompatible recipe requirements instead of dropping them", () => {
    const meal = {
      servings: 2,
      recipe: {
        servings: 2,
        title: "Dinner",
        ingredients: [
          { name: "Flour", quantity: 100, unit: "g" },
          { name: "Flour", quantity: 1, unit: "cup" },
        ],
      },
    } as MealPlanItemWithRecipe;
    const result = calculateNeededQuantities(aggregateRecipeIngredients([meal]), [], {});
    expect(result.map((item) => item.neededQuantity)).toEqual([100, 1]);
  });
  it("scales and combines repeated meals, then honors hidden and purchased flags", () => {
    const meal = {
      servings: 4,
      recipe: {
        servings: 2,
        title: "Dinner",
        ingredients: [{ name: "Eggs", quantity: 2, unit: "piece" }],
      },
    } as MealPlanItemWithRecipe;
    const requirements = aggregateRecipeIngredients([meal, meal]);
    expect(calculateNeededQuantities(requirements, [], {})[0]?.neededQuantity).toBe(8);
    expect(
      calculateNeededQuantities(requirements, [], { egg: { isChecked: false, isDeleted: true } })
    ).toEqual([]);
    const checked = calculateNeededQuantities(requirements, [], {
      egg: { isChecked: true, isDeleted: false },
    });
    expect(groupGroceryItemsIntoSections(checked)[0]?.category).toBe("purchased");
  });
});
