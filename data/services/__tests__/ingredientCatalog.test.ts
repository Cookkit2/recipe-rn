import { createClient } from "@supabase/supabase-js";
import { fetchIngredientCatalogSnapshot } from "../ingredientCatalog";

jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("~/data/db/database", () => ({ database: {} }));
jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn() } }));

it("reads every page in stable ID order with at most 500 rows per request", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const requests: URL[] = [];
  const fetch = jest.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    requests.push(url);
    const offset = Number(url.searchParams.get("offset"));
    const isCanonical = url.pathname.endsWith("/base_ingredient");
    const rows = isCanonical
      ? offset === 0
        ? Array.from({ length: 500 }, (_, index) => ({
            id: `${id}-${index}`,
            name: `Food ${index}`,
          }))
        : [{ id, name: "Milk" }]
      : [{ base_ingredient_id: id, synonym: "Dairy milk" }];
    return new Response(JSON.stringify(rows), { status: 200 });
  });
  const client = createClient("https://catalog.invalid", "test-public", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
  const result = await fetchIngredientCatalogSnapshot(client);
  expect(result.ingredients).toHaveLength(501);
  expect(result.aliases).toEqual([{ baseIngredientId: id, alias: "Dairy milk" }]);
  expect(requests).toHaveLength(3);
  for (const url of requests) {
    expect(url.searchParams.get("order")).toBe("id.asc");
    expect(url.searchParams.get("limit")).toBe("500");
  }
  expect(requests.some((url) => url.searchParams.get("offset") === "500")).toBe(true);
});

it("rejects the entire fetch when a later alias page fails", async () => {
  const fetch = jest.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/base_ingredient"))
      return new Response('[{"id":"milk","name":"Milk"}]');
    if (Number(url.searchParams.get("offset")) === 0)
      return new Response(
        JSON.stringify(
          Array.from({ length: 500 }, () => ({ base_ingredient_id: "milk", synonym: "alias" }))
        )
      );
    return new Response('{"message":"offline"}', { status: 500 });
  });
  const client = createClient("https://catalog.invalid", "test-public", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
  await expect(fetchIngredientCatalogSnapshot(client)).rejects.toBeDefined();
});

it("ignores unlinked alias rows allowed by the deployed nullable relationship", async () => {
  const fetch = jest.fn(
    async (input: string | URL | Request) =>
      new Response(
        JSON.stringify(
          String(input).includes("/base_ingredient?")
            ? [{ id: "egg", name: "Egg" }]
            : [{ base_ingredient_id: null, synonym: "unlinked" }]
        )
      )
  );
  const client = createClient("https://catalog.invalid", "public", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
  expect((await fetchIngredientCatalogSnapshot(client)).aliases).toEqual([]);
});
