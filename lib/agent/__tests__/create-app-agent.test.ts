import { createAppCookingAgent } from "../create-app-agent";
import { createCookingAgent } from "../factory";
import { pantryApi } from "~/data/api/pantryApi";
import type { CookingDataClient } from "../tools/planning";
import type { PantryItem } from "~/types/PantryItem";
import { QueryClient } from "@tanstack/react-query";
import { pantryQueryKeys } from "~/hooks/queries/pantryQueryKeys";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";

jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("../tools/device-diet", () => ({ readDeviceDietProfile: () => null }));
jest.mock("../factory", () => ({ createCookingAgent: jest.fn(() => ({ kind: "nebius" })) }));
jest.mock("~/data/api/pantryApi", () => ({
  pantryApi: {
    fetchAllPantryItems: jest.fn(),
    addPantryItem: jest.fn(),
    deletePantryItem: jest.fn(),
  },
}));

const localItem: PantryItem = {
  id: "local-1",
  name: "eggs",
  quantity: 6,
  unit: "count",
  category: "other",
  type: "fridge",
  image_url: undefined,
  background_color: undefined,
  created_at: new Date(),
  updated_at: new Date(),
  steps_to_store: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(pantryApi.fetchAllPantryItems).mockResolvedValue([localItem]);
  jest.mocked(pantryApi.addPantryItem).mockResolvedValue(localItem);
  jest.mocked(pantryApi.deletePantryItem).mockResolvedValue(undefined);
});

function getData(queryClient?: QueryClient): CookingDataClient {
  createAppCookingAgent(queryClient);
  return jest.mocked(createCookingAgent).mock.calls[0]![0]!.data!;
}

it("reads the same local pantry as the app even without Supabase", async () => {
  await expect(getData().listPantry()).resolves.toMatchObject([{ id: "local-1", name: "eggs" }]);
});

it("adds through the existing local pantry API", async () => {
  await expect(
    getData().addIngredient({ name: "eggs", quantity: 6, unit: "count" })
  ).resolves.toMatchObject({ ok: true, item: { id: "local-1" } });
  expect(pantryApi.addPantryItem).toHaveBeenCalledWith(
    expect.objectContaining({ name: "eggs", quantity: 6, unit: "count" })
  );
});

it("removes local rows through the existing pantry API", async () => {
  await expect(getData().removeIngredient({ name: "Eggs" })).resolves.toMatchObject({
    ok: true,
    removed: [{ id: "local-1" }],
  });
  expect(pantryApi.deletePantryItem).toHaveBeenCalledWith("local-1");
});

it("invalidates pantry and recipe queries after a local mutation", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const data = getData(client);
  await data.addIngredient({ name: "eggs" });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: pantryQueryKeys.all });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: recipeQueryKeys.all });
});

it("uses stockId to remove only one of several local rows with the same name", async () => {
  jest
    .mocked(pantryApi.fetchAllPantryItems)
    .mockResolvedValue([localItem, { ...localItem, id: "local-2" }]);
  await expect(
    getData().removeIngredient({ stockId: "local-2", name: "eggs" })
  ).resolves.toMatchObject({
    ok: true,
    removed: [{ id: "local-2" }],
  });
  expect(pantryApi.deletePantryItem).toHaveBeenCalledTimes(1);
  expect(pantryApi.deletePantryItem).toHaveBeenCalledWith("local-2");
});

it("reports a local write failure without invalidating queries", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  jest.mocked(pantryApi.addPantryItem).mockRejectedValueOnce(new Error("Local write failed"));
  await expect(getData(client).addIngredient({ name: "eggs" })).resolves.toEqual({
    ok: false,
    error: "Local write failed",
  });
  expect(invalidate).not.toHaveBeenCalled();
});

it("refreshes the pantry after a partially successful multi-row removal", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  jest
    .mocked(pantryApi.fetchAllPantryItems)
    .mockResolvedValue([localItem, { ...localItem, id: "local-2" }]);
  jest
    .mocked(pantryApi.deletePantryItem)
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("Delete failed"));
  await expect(getData(client).removeIngredient({ name: "eggs" })).resolves.toEqual({
    ok: false,
    error: "Delete failed",
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: pantryQueryKeys.all });
});
