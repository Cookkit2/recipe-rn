import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRecipeRecommendations } from "../useRecipeQueries";
import { recipeApi } from "~/data/api/recipeApi";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Recipe } from "~/types/Recipe";

jest.mock("~/data/api/recipeApi", () => ({
  recipeApi: { fetchRecommendationCatalog: jest.fn() },
  rankRecipeRecommendations: (recipes: Recipe[]) => ({
    recipes: recipes.map((recipe) => ({ recipe, completionPercentage: 0 })),
  }),
}));
jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getRecipeAvailabilityForCatalog: jest.fn(),
    getMostCookedRecipes: jest.fn(),
    getCookingHistory: jest.fn(),
  },
}));
jest.mock("~/hooks/recommendation", () => ({}));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.mocked(recipeApi.fetchRecommendationCatalog).mockResolvedValue([{ id: "a" }] as Recipe[]);
  jest
    .mocked(databaseFacade.getRecipeAvailabilityForCatalog)
    .mockResolvedValue({ canMake: [], partiallyCanMake: [] });
  jest.mocked(databaseFacade.getMostCookedRecipes).mockResolvedValue([]);
  jest.mocked(databaseFacade.getCookingHistory).mockResolvedValue([]);
});
afterEach(async () => {
  await cleanup();
  client.clear();
});

it("starts no queries while disabled, then shares catalog/availability/history between consumers", async () => {
  const { result, rerender } = await renderHook(
    ({ enabled }: { enabled: boolean }) => ({
      first: useRecipeRecommendations({ enabled }),
      second: useRecipeRecommendations({ enabled }),
    }),
    { wrapper, initialProps: { enabled: false } }
  );
  expect(recipeApi.fetchRecommendationCatalog).not.toHaveBeenCalled();
  expect(databaseFacade.getMostCookedRecipes).not.toHaveBeenCalled();
  await rerender({ enabled: true });
  await waitFor(() => expect(result.current.first.isLoading).toBe(false));
  expect(recipeApi.fetchRecommendationCatalog).toHaveBeenCalledTimes(1);
  expect(databaseFacade.getRecipeAvailabilityForCatalog).toHaveBeenCalledTimes(1);
  expect(databaseFacade.getCookingHistory).toHaveBeenCalledTimes(1);
  expect(result.current.second.recipes).toHaveLength(1);
  await act(async () => {
    await client.invalidateQueries({ queryKey: ["recipes", "availability"] });
  });
  expect(recipeApi.fetchRecommendationCatalog).toHaveBeenCalledTimes(1);
  expect(databaseFacade.getRecipeAvailabilityForCatalog).toHaveBeenCalledTimes(2);
});
