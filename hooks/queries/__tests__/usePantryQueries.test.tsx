import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { database } from "~/data/db/database";
import type { Stock } from "~/data/db/models";
import {
  baseIngredientApi,
  type BaseIngredientWithRelations,
} from "~/data/supabase-api/BaseIngredientApi";
import type { PantryItem } from "~/types/PantryItem";
import { pantryQueryKeys } from "../pantryQueryKeys";
import { usePantryItems, usePantryItemsByType } from "../usePantryQueries";

// Exercise the real pantry API and query hooks with local DB/network boundaries mocked.
jest.mock("@nozbe/watermelondb", () => ({
  Q: { where: jest.fn(), oneOf: jest.fn() },
}));
jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getAllStock: jest.fn(),
    isHealthy: jest.fn(),
    getStockCount: jest.fn(),
  },
}));
jest.mock("~/data/db/database", () => ({
  database: { collections: { get: jest.fn() } },
}));
jest.mock("~/data/supabase-api/BaseIngredientApi", () => ({
  baseIngredientApi: { getBaseIngredientsByNames: jest.fn() },
}));
jest.mock("~/lib/notifications", () => ({}));
jest.mock("~/data/services/AchievementService", () => ({ achievementService: {} }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function makeStock(id: string, name: string): Stock {
  return {
    id,
    name,
    quantity: 2,
    unit: "pcs",
    storageType: "fridge",
    createdAt: new Date("2026-10-24T00:00:00Z"),
    updatedAt: new Date("2026-10-24T00:00:00Z"),
  } as Stock;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeIngredient(name: string, categories: NonNullable<PantryItem["categories"]>) {
  return {
    id: name.toLowerCase(),
    name,
    storage_type: "fridge",
    days_to_expire: 7,
    steps_to_store_id: null,
    synonyms: [],
    categories,
  } satisfies BaseIngredientWithRelations;
}

function setLocalRelations(rows: Record<string, unknown[]> = {}) {
  jest
    .mocked(database.collections.get)
    .mockImplementation(
      (table) =>
        ({ query: () => ({ fetch: async () => rows[table] ?? [] }) }) as ReturnType<
          typeof database.collections.get
        >
    );
}

describe("local-first pantry loading", () => {
  let client: QueryClient;
  let metadata: ReturnType<typeof deferred<Map<string, BaseIngredientWithRelations>>>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    metadata = deferred();
    jest.mocked(databaseFacade.isHealthy).mockResolvedValue(true);
    jest.mocked(databaseFacade.getStockCount).mockResolvedValue(1);
    jest.mocked(databaseFacade.getAllStock).mockResolvedValue([makeStock("tomato", "Tomato")]);
    setLocalRelations();
    jest.mocked(baseIngredientApi.getBaseIngredientsByNames).mockReturnValue(metadata.promise);
  });

  afterEach(async () => {
    await act(async () => metadata.resolve(new Map()));
    await cleanup();
    await client.cancelQueries();
    client.clear();
    onlineManager.setOnline(true);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("shows local items while the remote category request is still pending", async () => {
    const { result } = await renderHook(() => usePantryItemsByType("all"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([
      expect.objectContaining({ id: "tomato", name: "Tomato", quantity: 2, categories: [] }),
    ]);
    expect(baseIngredientApi.getBaseIngredientsByNames).toHaveBeenCalledWith(["Tomato"]);
    expect(databaseFacade.isHealthy).not.toHaveBeenCalled();
    expect(databaseFacade.getStockCount).not.toHaveBeenCalled();
  });

  it("fills missing categories later without replacing local categories or edited items", async () => {
    jest
      .mocked(databaseFacade.getAllStock)
      .mockResolvedValue([
        makeStock("tomato", "Tomato"),
        makeStock("second-tomato", "Tomato"),
        makeStock("milk", "Milk"),
      ]);
    setLocalRelations({
      stock_category: [{ stockId: "milk", categoryId: "dairy" }],
      ingredient_category: [{ id: "dairy", name: "Local dairy" }],
      ingredient_synonym: [{ id: "synonym", stockId: "tomato", synonym: "tomatoes" }],
      steps_to_store: [
        { id: "step", stockId: "tomato", title: "Chill", description: "Keep cool", sequence: 1 },
      ],
    });
    const { result } = await renderHook(() => usePantryItems(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(3));

    // A user deletes one duplicate and edits the other while the cloud is slow.
    await act(async () => {
      client.setQueryData<PantryItem[]>(pantryQueryKeys.items(), (items) =>
        items
          ?.filter((item) => item.id !== "second-tomato")
          .map((item) => (item.id === "tomato" ? { ...item, quantity: 9 } : item))
      );
      metadata.resolve(
        new Map([
          ["tomato", makeIngredient("Tomato", [{ id: "vegetables", name: "Vegetables" }])],
          ["milk", makeIngredient("Milk", [{ id: "cloud-dairy", name: "Cloud dairy" }])],
        ])
      );
    });

    await waitFor(() => expect(result.current.data?.[0]?.category).toBe("Vegetables"));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toMatchObject({
      id: "tomato",
      quantity: 9,
      synonyms: [{ id: "synonym", synonym: "tomatoes" }],
      steps_to_store: [{ id: "step", title: "Chill", description: "Keep cool", sequence: 1 }],
    });
    expect(result.current.data?.[1]).toMatchObject({
      id: "milk",
      category: "Local dairy",
      categories: [{ id: "dairy", name: "Local dairy" }],
    });
    expect(baseIngredientApi.getBaseIngredientsByNames).toHaveBeenCalledTimes(1);
    expect(baseIngredientApi.getBaseIngredientsByNames).toHaveBeenCalledWith(["Tomato"]);
  });

  it("reads local items offline without starting a cloud request", async () => {
    onlineManager.setOnline(false);
    const { result } = await renderHook(() => usePantryItemsByType("fridge"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.[0]?.id).toBe("tomato");
    expect(result.current.isError).toBe(false);
    expect(baseIngredientApi.getBaseIngredientsByNames).not.toHaveBeenCalled();
  });

  it("keeps the local list available when background enrichment fails", async () => {
    const { result } = await renderHook(() => usePantryItems(), { wrapper });
    await waitFor(() => expect(baseIngredientApi.getBaseIngredientsByNames).toHaveBeenCalled());

    await act(async () => metadata.reject(new Error("Network unavailable")));
    await waitFor(() =>
      expect(client.getQueryState(pantryQueryKeys.ingredientCategories(["Tomato"]))?.status).toBe(
        "error"
      )
    );

    expect(result.current.data?.[0]?.name).toBe("Tomato");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("shares enrichment between consumers and reuses it after a local refetch", async () => {
    const { result } = await renderHook(
      () => ({ pantry: usePantryItems(), fridge: usePantryItemsByType("fridge") }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.pantry.isLoading).toBe(false));
    await act(async () =>
      metadata.resolve(
        new Map([["tomato", makeIngredient("Tomato", [{ id: "vegetables", name: "Vegetables" }])]])
      )
    );
    await waitFor(() => expect(result.current.fridge.data[0]?.category).toBe("Vegetables"));

    await act(async () => {
      await result.current.pantry.refetch();
    });

    expect(result.current.pantry.data?.[0]?.category).toBe("Vegetables");
    expect(databaseFacade.getAllStock).toHaveBeenCalledTimes(2);
    expect(baseIngredientApi.getBaseIngredientsByNames).toHaveBeenCalledTimes(1);
  });

  it("shows an empty local pantry without requesting metadata", async () => {
    jest.mocked(databaseFacade.getAllStock).mockResolvedValue([]);
    const { result } = await renderHook(() => usePantryItems(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
    expect(baseIngredientApi.getBaseIngredientsByNames).not.toHaveBeenCalled();
  });
});
