import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Stock } from "~/data/db/models";
import { pantryQueryKeys } from "../pantryQueryKeys";
import { usePantryCardsByType } from "../usePantryCardQueries";

jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: { getAllStock: jest.fn() },
}));

function stock(id: string, storageType?: string, quantity = 2): Stock {
  return {
    id,
    name: id,
    quantity,
    unit: "pcs",
    storageType,
    imageUrl: "file:///local-image.jpg",
    backgroundColor: "#ffaa00",
    get synonyms(): Stock["synonyms"] {
      throw new Error("Home must not hydrate synonyms");
    },
    get stockCategories(): Stock["stockCategories"] {
      throw new Error("Home must not hydrate categories");
    },
    get stepsToStore(): Stock["stepsToStore"] {
      throw new Error("Home must not hydrate storage steps");
    },
  } as Stock;
}

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.mocked(databaseFacade.getAllStock).mockResolvedValue([stock("Egg", "fridge")]);
});
afterEach(async () => {
  await cleanup();
  client.clear();
  onlineManager.setOnline(true);
});

it("renders offline cards from stock without loading ingredient relationships", async () => {
  onlineManager.setOnline(false);
  const { result } = await renderHook(() => usePantryCardsByType("all"), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([
    {
      id: "Egg",
      name: "Egg",
      quantity: 2,
      unit: "pcs",
      type: "fridge",
      image_url: "file:///local-image.jpg",
      background_color: "#ffaa00",
    },
  ]);
  expect(databaseFacade.getAllStock).toHaveBeenCalledTimes(1);
});

it("filters storage tabs from the same local card cache", async () => {
  jest
    .mocked(databaseFacade.getAllStock)
    .mockResolvedValue([stock("Egg"), stock("Rice", "Pantry Shelf"), stock("Peas", "FREEZER")]);
  const { result, rerender } = await renderHook(
    ({ type }: { type: "all" | "cabinet" | "freezer" }) => usePantryCardsByType(type),
    { wrapper, initialProps: { type: "all" } }
  );
  await waitFor(() => expect(result.current.data).toHaveLength(3));
  await rerender({ type: "cabinet" });
  expect(result.current.data?.map((item) => item.name)).toEqual(["Rice"]);
  await rerender({ type: "freezer" });
  expect(result.current.data?.map((item) => item.name)).toEqual(["Peas"]);
  expect(databaseFacade.getAllStock).toHaveBeenCalledTimes(1);
});

it("preserves full ingredient data and refreshes cards through existing pantry invalidation", async () => {
  const details = [{ id: "Egg", quantity: 2, synonyms: ["eggs"], steps_to_store: ["Keep cool"] }];
  client.setQueryData(pantryQueryKeys.items(), details);
  const { result } = await renderHook(() => usePantryCardsByType("all"), { wrapper });
  await waitFor(() => expect(result.current.data?.[0]?.quantity).toBe(2));
  expect(client.getQueryData(pantryQueryKeys.items())).toEqual(details);
  jest.mocked(databaseFacade.getAllStock).mockResolvedValue([stock("Egg", "fridge", 5)]);
  await act(async () => {
    await client.invalidateQueries({ queryKey: pantryQueryKeys.items() });
  });
  await waitFor(() => expect(result.current.data?.[0]?.quantity).toBe(5));
  expect(client.getQueryData(pantryQueryKeys.items())).toEqual(details);
});

it("distinguishes an empty pantry from a failed local read", async () => {
  jest.mocked(databaseFacade.getAllStock).mockResolvedValueOnce([]);
  const { result } = await renderHook(() => usePantryCardsByType("all"), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual([]));
  jest.mocked(databaseFacade.getAllStock).mockRejectedValueOnce(new Error("SQLite unavailable"));
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
});
