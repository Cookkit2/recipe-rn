import { searchWebRecipes } from "../webRecipeSearchApi";
const mockConnection = jest.fn();
jest.mock("~/lib/ai/proxy-connection", () => ({ getAIProxyConnection: () => mockConnection() }));
const originalFetch = global.fetch;
const fetcher = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  global.fetch = fetcher;
  mockConnection
    .mockReset()
    .mockResolvedValue({ headers: { Authorization: "Bearer user-session", apikey: "public-key" } });
  fetcher.mockReset().mockImplementation(async () =>
    Response.json({
      results: [
        {
          url: "https://recipes.test/rice",
          title: "Rice",
          description: "Recipe",
          source: "recipes.test",
        },
      ],
    })
  );
});
afterAll(() => {
  global.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
});
it("calls the Supabase search function using the existing guest/user session", async () => {
  expect(await searchWebRecipes("rice")).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledWith(
    "https://project.supabase.co/functions/v1/recipe-search",
    expect.objectContaining({
      headers: {
        Authorization: "Bearer user-session",
        apikey: "public-key",
        "Content-Type": "application/json",
      },
      body: '{"query":"rice"}',
    })
  );
});
it.each([
  [429, "Search limit"],
  [503, "not available"],
  [502, "try again"],
])("maps HTTP %s to safe retryable copy", async (status, message) => {
  fetcher.mockResolvedValue(new Response("private backend error", { status: status as number }));
  await expect(searchWebRecipes("rice")).rejects.toThrow(message as string);
});
it("does not fetch when already cancelled", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(searchWebRecipes("rice", controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(fetcher).not.toHaveBeenCalled();
});
