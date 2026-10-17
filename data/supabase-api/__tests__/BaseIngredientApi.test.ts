import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { baseIngredientApi } from "../BaseIngredientApi";

const mockFetch = jest.fn();
let mockSupabase: SupabaseClient | null;
jest.mock("~/lib/supabase/supabase-client", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

beforeEach(() => {
  mockFetch.mockReset().mockImplementation(async () => new Response("null", { status: 200 }));
  mockSupabase = createClient("https://catalog.invalid", "public-test", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: mockFetch },
  });
});

function requestedUrls() {
  return mockFetch.mock.calls.map(([url]) => new URL(String(url)));
}

describe("exact ingredient-name lookup", () => {
  it.each([
    ["milk%", "\\Amilk%\\Z"],
    ["milk_", "\\Amilk_\\Z"],
    ["milk*", "\\Amilk\\*\\Z"],
    ["milk\\*", "\\Amilk\\\\\\*\\Z"],
    ["(?i)milk|egg", "\\A\\(\\?i\\)milk\\|egg\\Z"],
    ["O'Connor", "\\AO'Connor\\Z"],
    ["苹果", "\\A苹果\\Z"],
    [" milk ", "\\A milk \\Z"],
    ["milk\n", "\\Amilk\n\\Z"],
  ])("keeps %j literal through the real PostgREST client", async (name, pattern) => {
    await expect(baseIngredientApi.getBaseIngredientByName(name)).resolves.toBeNull();
    const urls = requestedUrls();
    expect(urls).toHaveLength(2);
    expect(urls[0]?.searchParams.get("name")).toBe(`imatch.${pattern}`);
    expect(urls[1]?.searchParams.get("synonym")).toBe(`imatch.${pattern}`);
  });

  it("preserves a successful synonym fallback and its relations", async () => {
    const ingredient = {
      id: "ingredient-id",
      name: "Scallion",
      storage_type: "fridge",
      days_to_expire: 7,
      steps_to_store_id: null,
    };
    mockFetch.mockImplementation(async (value: string) => {
      const url = new URL(String(value));
      let data: unknown = [];
      if (url.pathname.endsWith("/base_ingredient")) {
        data = url.searchParams.has("id") ? ingredient : null;
      } else if (url.searchParams.has("synonym")) {
        data = { base_ingredient_id: ingredient.id };
      } else if (url.pathname.endsWith("/ingredient_synonym")) {
        data = [{ id: "synonym-id", synonym: "Green onion" }];
      }
      return new Response(JSON.stringify(data), { status: 200 });
    });
    await expect(baseIngredientApi.getBaseIngredientByName("Green onion")).resolves.toMatchObject({
      ...ingredient,
      synonyms: [{ id: "synonym-id", synonym: "Green onion" }],
      categories: [],
    });
    expect(
      requestedUrls()
        .find((url) => url.searchParams.has("synonym"))
        ?.searchParams.get("synonym")
    ).toBe("imatch.\\AGreen onion\\Z");
  });

  it("keeps backend errors visible", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ code: "42501", message: "permission denied" }), { status: 403 })
    );
    await expect(baseIngredientApi.getBaseIngredientByName("milk")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("does not issue a request when Supabase is unavailable", async () => {
    mockSupabase = null;
    await expect(baseIngredientApi.getBaseIngredientByName("milk")).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("batch ingredient relation grouping", () => {
  it("keeps relations isolated, maps aliases, skips null categories and retains empty relations", async () => {
    const ingredients = [
      { id: "onion", name: "Onion" },
      { id: "milk", name: "Milk" },
      { id: "salt", name: "Salt" },
    ];
    mockFetch.mockImplementation(async (value: string) => {
      const url = new URL(String(value));
      let data: unknown = ingredients;
      if (url.pathname.endsWith("/ingredient_synonym")) {
        data = [
          { id: "alias-milk", base_ingredient_id: "milk", synonym: "Dairy milk" },
          { id: "alias-onion", base_ingredient_id: "onion", synonym: "Bulb onion" },
        ];
      } else if (url.pathname.endsWith("/pivot_ingredient_category")) {
        data = [
          { ingredient_id: "milk", ingredient_category: { id: "dairy", name: "Dairy" } },
          { ingredient_id: "onion", ingredient_category: null },
          { ingredient_id: "onion", ingredient_category: { id: "veg", name: "Vegetable" } },
        ];
      }
      return new Response(JSON.stringify(data), { status: 200 });
    });
    const result = await baseIngredientApi.getBaseIngredientsByNames(["Onion", "Milk", "Salt"]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.get("onion")).toEqual({
      ...ingredients[0],
      synonyms: [{ id: "alias-onion", synonym: "Bulb onion" }],
      categories: [{ id: "veg", name: "Vegetable" }],
    });
    expect(result.get("milk")).toEqual({
      ...ingredients[1],
      synonyms: [{ id: "alias-milk", synonym: "Dairy milk" }],
      categories: [{ id: "dairy", name: "Dairy" }],
    });
    expect(result.get("bulb onion")).toBe(result.get("onion"));
    expect(result.get("dairy milk")).toBe(result.get("milk"));
    expect(result.get("salt")).toEqual({ ...ingredients[2], synonyms: [], categories: [] });
  });
});
