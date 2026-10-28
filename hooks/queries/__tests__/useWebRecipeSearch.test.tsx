import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWebRecipeSearch } from "../useWebRecipeSearch";
const mockSearch = jest.fn();
jest.mock("~/data/api/webRecipeSearchApi", () => ({
  searchWebRecipes: (...args: unknown[]) => mockSearch(...args),
}));
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient();
  mockSearch.mockReset().mockResolvedValue([]);
});
afterEach(() => client.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
it("only queries after submission and reuses equivalent submitted queries", async () => {
  const screen = await renderHook(
    ({ query, enabled }: { query: string; enabled: boolean }) => useWebRecipeSearch(query, enabled),
    {
      initialProps: { query: "", enabled: true },
      wrapper,
    }
  );
  expect(mockSearch).not.toHaveBeenCalled();
  await screen.rerender({ query: " Egg  Rice ", enabled: false });
  expect(mockSearch).not.toHaveBeenCalled();
  await screen.rerender({ query: " Egg  Rice ", enabled: true });
  await waitFor(() => expect(screen.result.current.isSuccess).toBe(true));
  expect(mockSearch).toHaveBeenCalledTimes(1);
  await screen.rerender({ query: "egg rice", enabled: true });
  expect(mockSearch).toHaveBeenCalledTimes(1);
});
it("cancels an abandoned query and isolates its result from the new query", async () => {
  mockSearch.mockImplementation(() => new Promise(() => {}));
  const screen = await renderHook(
    ({ query }: { query: string }) => useWebRecipeSearch(query, true),
    {
      initialProps: { query: "old recipe" },
      wrapper,
    }
  );
  const signal = mockSearch.mock.calls[0]![1] as AbortSignal;
  await screen.rerender({ query: "new recipe" });
  expect(signal.aborted).toBe(true);
  expect(mockSearch).toHaveBeenCalledTimes(2);
  expect(screen.result.current.data).toBeUndefined();
});
