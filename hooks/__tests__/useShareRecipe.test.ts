import { act, renderHook } from "@testing-library/react-native";
import { toast } from "sonner-native";
import { useShareRecipe } from "../useShareRecipe";
import { publishRecipeShare } from "~/data/api/recipeShareApi";
import { shareRecipe } from "~/utils/recipe-share";
import type { Recipe } from "~/types/Recipe";

jest.mock("~/data/api/recipeShareApi", () => ({ publishRecipeShare: jest.fn() }));
jest.mock("~/utils/recipe-share", () => ({ shareRecipe: jest.fn() }));
jest.mock("sonner-native", () => ({
  toast: Object.assign(jest.fn(), { loading: jest.fn(), dismiss: jest.fn() }),
}));

const recipe: Recipe = {
  id: "pasta",
  title: "Pasta",
  description: "Dinner",
  imageUrl: "",
  ingredients: [{ name: "Pasta", quantity: 200, unit: "g", relatedIngredientId: "" }],
  instructions: [{ step: 1, title: "Cook", description: "Boil pasta", relatedIngredientIds: [] }],
};
const link = "https://example.com/r/pasta";

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers();
  jest.mocked(shareRecipe).mockResolvedValue({ action: "dismissed" });
});
afterEach(() => jest.useRealTimers());

it("opens sharing immediately for a cached link without flashing a loading toast", async () => {
  jest.mocked(publishRecipeShare).mockResolvedValue(link);
  const { result } = await renderHook(() => useShareRecipe(recipe));
  await act(async () => {
    await result.current();
  });
  expect(shareRecipe).toHaveBeenCalledWith(recipe, link);
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(toast.loading).not.toHaveBeenCalled();
});

it("keeps a slow publish silent and ignores duplicate taps", async () => {
  let finish!: (value: string) => void;
  jest.mocked(publishRecipeShare).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const { result } = await renderHook(() => useShareRecipe(recipe));
  let sharing!: Promise<void>;
  await act(async () => {
    sharing = result.current();
  });
  expect(toast.loading).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(toast.loading).not.toHaveBeenCalled();
  await act(async () => {
    await result.current();
  });
  expect(publishRecipeShare).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(link);
    await sharing;
  });
  expect(toast).not.toHaveBeenCalled();
  expect(shareRecipe).toHaveBeenCalledTimes(1);
});

it("falls back to recipe text when publishing fails", async () => {
  jest.mocked(publishRecipeShare).mockRejectedValue(new Error("Offline"));
  const { result } = await renderHook(() => useShareRecipe(recipe));
  await act(async () => {
    await result.current();
  });
  expect(shareRecipe).toHaveBeenCalledWith(recipe, undefined);
  expect(toast).toHaveBeenCalledWith("Couldn't create a link. Sharing the recipe text instead.", {
    id: "publish-recipe-share",
  });
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(toast.loading).not.toHaveBeenCalled();
});
