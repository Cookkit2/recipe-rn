import { fetchMyRecipes } from "../myRecipesApi";

const mockGetAllRecipes = jest.fn();
const mockGetSharedIds = jest.fn();
jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: { getAllRecipes: () => mockGetAllRecipes() },
}));
jest.mock("~/lib/recipe-share-cache", () => ({
  getResolvedRecipeShareIds: () => mockGetSharedIds(),
}));
jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn() } }));

const recipe = (id: string, overrides: object = {}) => ({
  id,
  title: id,
  description: "",
  imageUrl: "",
  createdAt: new Date(100),
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSharedIds.mockReturnValue([]);
});

it("includes imports, personal AI recipes, favorites and older Cookkit links without the discovery catalog", async () => {
  mockGetSharedIds.mockReturnValue(["legacy-link"]);
  mockGetAllRecipes.mockResolvedValue([
    recipe("discovery", { type: "standard", sourceUrl: "https://example.com/recipe" }),
    recipe("old-discovery"),
    recipe("import", { type: "converted" }),
    recipe("tailored", { type: "tailored" }),
    recipe("favorite", { isFavorite: true }),
    recipe("legacy-link"),
  ]);
  expect((await fetchMyRecipes()).map((r) => r.id)).toEqual([
    "favorite",
    "import",
    "legacy-link",
    "tailored",
  ]);
});

it("puts the newest saved recipe first and returns lightweight searchable rows", async () => {
  const stored = [
    recipe("old", { type: "converted", createdAt: new Date(1) }),
    recipe("new", {
      type: "converted",
      createdAt: new Date(3),
      title: "Noodles",
      imageUrl: "data:image/jpeg;base64,photo",
    }),
    recipe("middle", { type: "converted", createdAt: new Date(2) }),
  ];
  mockGetAllRecipes.mockResolvedValue(stored);
  const result = await fetchMyRecipes();
  expect(result.map((r) => r.id)).toEqual(["new", "middle", "old"]);
  expect(result[0]).toMatchObject({
    title: "Noodles",
    imageUrl: "data:image/jpeg;base64,photo",
    ingredients: [],
    instructions: [],
  });
  expect(stored.map((r) => r.id)).toEqual(["old", "new", "middle"]);
});

it("supports an empty library and reports read failures to the screen", async () => {
  mockGetAllRecipes.mockResolvedValue([]);
  expect(await fetchMyRecipes()).toEqual([]);
  mockGetAllRecipes.mockRejectedValue(new Error("Read failed"));
  await expect(fetchMyRecipes()).rejects.toThrow("Read failed");
});
