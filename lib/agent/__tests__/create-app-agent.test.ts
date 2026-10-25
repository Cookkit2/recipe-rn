import { createAppCookingAgent } from "../create-app-agent";
import { createCookingAgent } from "../factory";
import { pantryApi } from "~/data/api/pantryApi";
import type { CookingDataClient } from "../tools/planning";
import type { PantryItem } from "~/types/PantryItem";
import { QueryClient } from "@tanstack/react-query";
import { pantryQueryKeys } from "~/hooks/queries/pantryQueryKeys";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";
import { err, ok } from "~/utils/result";

jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("../tools/device-diet", () => ({ readDeviceDietProfile: () => null }));
jest.mock("../factory", () => ({ createCookingAgent: jest.fn(() => ({ kind: "nebius" })) }));
jest.mock("~/data/api/pantryApi", () => ({
  pantryApi: {
    fetchAllPantryItems: jest.fn(),
    fetchAllPantryItemsResult: jest.fn(),
    manageAssistantPantry: jest.fn(),
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
  jest.mocked(pantryApi.fetchAllPantryItemsResult).mockResolvedValue(ok([localItem]));
  jest
    .mocked(pantryApi.manageAssistantPantry)
    .mockResolvedValue({ ok: true, status: "updated", item: localItem });
});

function getData(queryClient?: QueryClient): CookingDataClient {
  createAppCookingAgent(queryClient);
  return jest.mocked(createCookingAgent).mock.calls[0]![0]!.data!;
}

it("reads the same local pantry as the app even without Supabase", async () => {
  await expect(getData().listPantry()).resolves.toMatchObject([{ id: "local-1", name: "eggs" }]);
  expect(pantryApi.fetchAllPantryItemsResult).toHaveBeenCalledTimes(1);
  expect(pantryApi.fetchAllPantryItems).not.toHaveBeenCalled();
});

it("reads an empty signed-out pantry without invalidating queries or writing", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  jest.mocked(pantryApi.fetchAllPantryItemsResult).mockResolvedValueOnce(ok([]));

  await expect(getData(client).listPantry()).resolves.toEqual([]);

  expect(pantryApi.manageAssistantPantry).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
});

it("propagates signed-out read errors instead of using the old empty-array fallback", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  jest.mocked(pantryApi.fetchAllPantryItems).mockResolvedValueOnce([]);
  jest
    .mocked(pantryApi.fetchAllPantryItemsResult)
    .mockResolvedValueOnce(err({ kind: "infra", message: "Local database unavailable" }));

  await expect(getData(client).listPantry()).rejects.toThrow("Local database unavailable");

  expect(pantryApi.fetchAllPantryItems).not.toHaveBeenCalled();
  expect(pantryApi.manageAssistantPantry).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
});

it("reads actual local values without invalidating queries or writing", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  jest
    .mocked(pantryApi.fetchAllPantryItemsResult)
    .mockResolvedValueOnce(
      ok([{ ...localItem, quantity: 0.25, unit: "kg", expiry_date: new Date("2026-11-01Z") }])
    );

  await expect(getData(client).listPantry()).resolves.toEqual([
    {
      id: "local-1",
      name: "eggs",
      quantity: 0.25,
      unit: "kg",
      expiryDate: "2026-11-01T00:00:00.000Z",
      householdId: null,
      addedByUserId: null,
    },
  ]);
  expect(pantryApi.manageAssistantPantry).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
});

it("adds through the existing local pantry API", async () => {
  await expect(
    getData().addIngredient({ name: "eggs", quantity: 6, unit: "count" })
  ).resolves.toMatchObject({ ok: true, item: { id: "local-1" } });
  expect(pantryApi.manageAssistantPantry).toHaveBeenCalledWith(
    expect.objectContaining({ action: "add", name: "eggs", quantity: 6, unit: "count" })
  );
});

it("removes local rows through the atomic pantry API", async () => {
  jest
    .mocked(pantryApi.manageAssistantPantry)
    .mockResolvedValue({ ok: true, status: "removed", removed: [localItem] });
  await expect(getData().removeIngredient({ name: "Eggs" })).resolves.toMatchObject({
    ok: true,
    removed: [{ id: "local-1" }],
  });
  expect(pantryApi.manageAssistantPantry).toHaveBeenCalledWith({ action: "remove", name: "Eggs" });
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
    .mocked(pantryApi.manageAssistantPantry)
    .mockResolvedValue({ ok: true, status: "removed", removed: [{ ...localItem, id: "local-2" }] });
  jest
    .mocked(pantryApi.fetchAllPantryItemsResult)
    .mockResolvedValue(ok([localItem, { ...localItem, id: "local-2" }]));
  await expect(
    getData().removeIngredient({ stockId: "local-2", name: "eggs" })
  ).resolves.toMatchObject({
    ok: true,
    removed: [{ id: "local-2" }],
  });
  expect(pantryApi.manageAssistantPantry).toHaveBeenCalledTimes(1);
  expect(pantryApi.manageAssistantPantry).toHaveBeenCalledWith({
    action: "remove",
    stockId: "local-2",
    name: "eggs",
  });
});

it("reports a local write failure without invalidating queries", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  jest
    .mocked(pantryApi.manageAssistantPantry)
    .mockRejectedValueOnce(new Error("Local write failed"));
  await expect(getData(client).addIngredient({ name: "eggs" })).resolves.toEqual({
    ok: false,
    error: "Local write failed",
  });
  expect(invalidate).not.toHaveBeenCalled();
});

it("does not invalidate or claim success when a mutation needs clarification", async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  jest.mocked(pantryApi.manageAssistantPantry).mockResolvedValue({
    ok: false,
    status: "needs_clarification",
    question: "Which pantry entry?",
  });
  await expect(getData(client).addIngredient({ name: "eggs" })).resolves.toMatchObject({
    status: "needs_clarification",
  });
  expect(invalidate).not.toHaveBeenCalled();
});
