import { createRecipeSearchHandler } from "../recipe-search-handler";

const authenticate = jest.fn();
const consumeQuota = jest.fn();
const fetcher = jest.fn();
const handler = createRecipeSearchHandler({
  apiKey: "private-tavily-key",
  authenticate,
  consumeQuota,
  fetcher,
});
const request = (body: unknown = { query: "egg fried rice" }, token = "session") =>
  new Request("https://example.com/search", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
const result = (changes = {}) => ({
  title: "Egg fried rice recipe",
  url: "https://recipes.example/rice/",
  content: "Ingredients: rice and eggs. Instructions: fry together.",
  images: [{ url: "https://recipes.example/rice.jpg" }],
  ...changes,
});
beforeEach(() => {
  authenticate.mockReset().mockResolvedValue("user");
  consumeQuota.mockReset().mockResolvedValue(true);
  fetcher.mockReset().mockImplementation(async () => Response.json({ results: [result()] }));
});

it("requires a verified user or guest JWT before provider/quota calls", async () => {
  expect((await handler(request({}, ""))).status).toBe(401);
  authenticate.mockResolvedValue(null);
  expect((await handler(request())).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
  expect(consumeQuota).not.toHaveBeenCalled();
});
it("serves CORS preflight and rejects other methods", async () => {
  expect((await handler(new Request("https://example.com", { method: "OPTIONS" }))).status).toBe(
    204
  );
  expect((await handler(new Request("https://example.com"))).status).toBe(405);
  expect(authenticate).not.toHaveBeenCalled();
});
it.each([
  { query: "" },
  { query: "x" },
  { query: "x".repeat(201) },
  { query: 1 },
  { query: "x".repeat(3000) },
])("rejects invalid/bounded bodies before quota: %j", async (body) => {
  expect((await handler(request(body))).status).toBe(400);
  expect(consumeQuota).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
it("fails closed when quota is exhausted or unavailable", async () => {
  consumeQuota.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("private db error"));
  expect((await handler(request())).status).toBe(429);
  const response = await handler(request());
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("private db error");
  expect(fetcher).not.toHaveBeenCalled();
});
it("fixes provider settings, requests source images, and never returns the secret", async () => {
  const response = await handler(
    request({
      query: " Egg   Fried Rice ",
      max_results: 100,
      search_depth: "advanced",
      endpoint: "https://evil.test",
    })
  );
  expect(response.status).toBe(200);
  expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.tavily.com/search");
  const options = fetcher.mock.calls[0]![1];
  expect(options.headers.Authorization).toBe("Bearer private-tavily-key");
  expect(JSON.parse(options.body)).toMatchObject({
    query: "egg fried rice recipe ingredients instructions",
    search_depth: "basic",
    max_results: 10,
    include_images: true,
    include_answer: false,
    include_raw_content: false,
    auto_parameters: false,
  });
  expect(await response.json()).toEqual({
    results: [
      {
        url: "https://recipes.example/rice",
        title: "Egg fried rice recipe",
        description: "Ingredients: rice and eggs. Instructions: fry together.",
        source: "recipes.example",
        imageUrl: "https://recipes.example/rice.jpg",
      },
    ],
  });
});
it("deduplicates tracking links, filters unsafe/non-recipe results and does not mix in global images", async () => {
  fetcher.mockResolvedValue(
    Response.json({
      images: ["https://unrelated.test/picture.jpg"],
      results: [
        result({ images: [] }),
        result({ url: "https://recipes.example/rice?utm_source=abc#recipe" }),
        result({ url: "javascript:alert(1)" }),
        result({ url: "http://127.0.0.1/private" }),
        result({
          url: "https://shop.test/product",
          title: "Buy a pan",
          content: "Stainless steel pan",
        }),
      ],
    })
  );
  expect(await (await handler(request())).json()).toEqual({
    results: [
      {
        url: "https://recipes.example/rice",
        title: "Egg fried rice recipe",
        description: "Ingredients: rice and eggs. Instructions: fry together.",
        source: "recipes.example",
      },
    ],
  });
});
it("caps discovery results at eight", async () => {
  fetcher.mockResolvedValue(
    Response.json({
      results: Array.from({ length: 15 }, (_, i) => result({ url: `https://recipes.test/${i}` })),
    })
  );
  expect((await (await handler(request())).json()).results).toHaveLength(8);
});
it("sanitizes provider failures and invalid responses", async () => {
  for (const response of [
    new Response("private-tavily-key", { status: 429 }),
    Response.json({ error: "private details" }),
  ]) {
    fetcher.mockResolvedValueOnce(response);
    const output = await handler(request());
    expect(output.status).toBe(502);
    expect(await output.text()).not.toMatch(/private|tavily-key/);
  }
});
it("returns a usable unavailable state if the server key is absent", async () => {
  const missingKey = createRecipeSearchHandler({ authenticate, consumeQuota, fetcher });
  expect((await missingKey(request())).status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
