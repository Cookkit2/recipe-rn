import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { householdApi } from "../HouseholdApi";

const mockFetch = jest.fn();
let mockSupabase: SupabaseClient | null;
jest.mock("~/lib/supabase/supabase-client", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue(new Response(null, { status: 201 }));
  mockSupabase = createClient("https://household.invalid", "public-test", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: mockFetch },
  });
});

it("partitions mixed identity keys so PostgREST cannot turn omission into a null clear", async () => {
  const catalogId = "12345678-1234-4234-9234-123456789abc";
  const omitted = { id: "s1", name: "Milk", household_id: "h1" };
  const linked = { id: "s2", name: "Egg", household_id: "h1", base_ingredient_id: catalogId };
  const clear = { id: "s3", name: "Salt", household_id: "h1", base_ingredient_id: null };
  await householdApi.upsertSharedStock([omitted, linked, clear]);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  const bodies = mockFetch.mock.calls.map(([, options]) => JSON.parse(options.body));
  expect(bodies).toContainEqual([omitted]);
  expect(bodies).toContainEqual([linked, clear]);
  const urls = mockFetch.mock.calls.map(([url]) => new URL(String(url)));
  const omittedUrl = urls[bodies.findIndex((rows) => rows[0].id === "s1")];
  expect(omittedUrl?.searchParams.get("columns")).not.toContain("base_ingredient_id");
});

it("never uploads a temporary or malformed catalog reference", async () => {
  await householdApi.upsertSharedStock([
    { id: "s1", name: "Milk", household_id: "h1", base_ingredient_id: "temp-milk" },
  ]);
  const body = JSON.parse(mockFetch.mock.calls[0][1].body);
  expect(body[0]).not.toHaveProperty("base_ingredient_id");
});

it("keeps upsert failures visible to the retry queue", async () => {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ message: "network", code: "500" }), { status: 500 })
  );
  await expect(
    householdApi.upsertSharedStock([{ id: "s1", name: "Milk", household_id: "h1" }])
  ).rejects.toMatchObject({ message: "network" });
});
