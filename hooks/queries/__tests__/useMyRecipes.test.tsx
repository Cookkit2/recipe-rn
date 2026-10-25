import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fetchMyRecipes } from "~/data/api/myRecipesApi";
import { invalidateRecipeLists } from "../queryInvalidationUtils";
import { useMyRecipes } from "../useMyRecipes";

jest.mock("~/data/api/myRecipesApi", () => ({ fetchMyRecipes: jest.fn() }));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.resetAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.mocked(fetchMyRecipes).mockResolvedValue([]);
});
afterEach(async () => {
  await cleanup();
  client.clear();
  onlineManager.setOnline(true);
});

it("reads the saved library while offline", async () => {
  onlineManager.setOnline(false);
  const screen = await renderHook(useMyRecipes, { wrapper });
  await waitFor(() => expect(screen.result.current.isSuccess).toBe(true));
  expect(fetchMyRecipes).toHaveBeenCalledTimes(1);
});

it("refreshes an open My Recipes list after the existing import invalidation", async () => {
  const screen = await renderHook(useMyRecipes, { wrapper });
  await waitFor(() => expect(screen.result.current.data).toEqual([]));
  const imported = {
    id: "imported",
    title: "Noodles",
    description: "",
    imageUrl: "",
    ingredients: [],
    instructions: [],
  };
  jest.mocked(fetchMyRecipes).mockResolvedValue([imported]);
  await act(async () => invalidateRecipeLists(client));
  await waitFor(() => expect(screen.result.current.data).toEqual([imported]));
});
