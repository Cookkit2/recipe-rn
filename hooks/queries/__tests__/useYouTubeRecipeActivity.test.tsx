import { renderHook } from "@testing-library/react-native";
import { useImportYouTubeRecipe } from "../useYouTubeRecipeQueries";
import { useRecipeImportBusy } from "~/hooks/useRecipeImportActivity";
let mockPending = false;
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
  useMutation: () => ({ isPending: mockPending, reset: jest.fn() }),
}));
jest.mock("~/data/api/recipeImportApi", () => ({ recipeImportApi: {} }));
jest.mock("../queryInvalidationUtils", () => ({ invalidateRecipeLists: jest.fn() }));
it("blocks clipboard prompts during the legacy YouTube import mutation", async () => {
  mockPending = true;
  const observer = await renderHook(useRecipeImportBusy);
  const importer = await renderHook(useImportYouTubeRecipe);
  expect(observer.result.current).toBe(true);
  mockPending = false;
  await importer.rerender(undefined);
  expect(observer.result.current).toBe(false);
});
