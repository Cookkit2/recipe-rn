import { fireEvent, render, within } from "@testing-library/react-native";
import { SearchResultsList } from "../SearchResultsList";
import type { Recipe } from "~/types/Recipe";
import type useColors from "~/hooks/useColor";
import { Platform, StyleSheet } from "react-native";

const mockKeyboardHeight = { value: 0 };
jest.mock("react-native-keyboard-controller", () => ({
  useReanimatedKeyboardAnimation: () => ({ height: mockKeyboardHeight }),
}));

beforeEach(() => {
  mockKeyboardHeight.value = 0;
});
afterEach(() => jest.restoreAllMocks());

jest.mock("../RecipeResults", () => ({
  RecipeResultItem: ({ recipe }: { recipe: Recipe }) =>
    require("react").createElement(
      require("react-native").Text,
      { testID: "recipe-row" },
      recipe.title
    ),
}));
jest.mock("../IngredientResults", () => ({ IngredientResultItem: () => null }));
jest.mock("expo-image", () => ({ Image: require("react-native").View }));
jest.mock("~/components/ui/skeleton", () => ({
  __esModule: true,
  default: require("react-native").View,
}));
jest.mock("~/components/ui/typography", () => ({
  P: require("react-native").Text,
  Small: require("react-native").Text,
  H4: require("react-native").Text,
}));
jest.mock("~/components/ui/separator", () => ({ Separator: require("react-native").View }));

it("mounts a window of individual results for a broad search", async () => {
  const recipes = Array.from(
    { length: 1000 },
    (_, i) => ({ id: String(i), title: `Recipe ${i}` }) as Recipe
  );
  const screen = await render(
    <SearchResultsList
      recipes={recipes}
      ingredients={[]}
      colors={{ mutedForeground: "gray" } as ReturnType<typeof useColors>}
      hasQuery
      loading={false}
      top={0}
      bottom={0}
    />
  );
  expect(screen.getAllByTestId("recipe-row")).toHaveLength(2);
  await fireEvent.press(screen.getByRole("button", { name: "See all recipes" }));
  const rendered = screen.getAllByTestId("recipe-row");
  expect(rendered.length).toBeGreaterThan(0);
  expect(rendered.length).toBeLessThan(30);
  expect(screen.getByText("Recipe 0")).toBeTruthy();
});

it("keeps local results visible while web search loads or fails, with an inline retry", async () => {
  const retry = jest.fn();
  const props = {
    recipes: [{ id: "local", title: "Saved rice" } as Recipe],
    ingredients: [],
    colors: { mutedForeground: "gray" } as ReturnType<typeof useColors>,
    hasQuery: true,
    loading: false,
    top: 0,
    bottom: 0,
  };
  const web = {
    results: [],
    loading: true,
    error: false,
    submitted: true,
    onRetry: retry,
    onOpen: jest.fn(),
  };
  const screen = await render(<SearchResultsList {...props} web={web} />);
  expect(screen.getByText("Saved rice")).toBeTruthy();
  expect(screen.getAllByTestId("web-recipe-skeleton")).toHaveLength(2);
  await screen.rerender(
    <SearchResultsList {...props} web={{ ...web, loading: false, error: true }} />
  );
  expect(screen.getByText("Saved rice")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Retry web search"));
  expect(retry).toHaveBeenCalledTimes(1);
});

it("expands recipes from their header and resets the preview when the query changes", async () => {
  const props = {
    recipes: Array.from(
      { length: 5 },
      (_, i) => ({ id: String(i), title: `Recipe ${i}` }) as Recipe
    ),
    ingredients: [],
    colors: { mutedForeground: "gray" } as ReturnType<typeof useColors>,
    hasQuery: true,
    loading: false,
    top: 0,
    bottom: 0,
  };
  const screen = await render(<SearchResultsList {...props} query="curry" />);
  expect(screen.getAllByTestId("recipe-row")).toHaveLength(2);
  const seeAll = screen.getByRole("button", { name: "See all recipes" });
  expect(within(screen.getByTestId("search-recipes-header")).getByText("Recipes")).toBeTruthy();
  await fireEvent.press(seeAll);
  expect(screen.getAllByTestId("recipe-row")).toHaveLength(5);
  await fireEvent.press(screen.getByRole("button", { name: "Show fewer recipes" }));
  expect(screen.getAllByTestId("recipe-row")).toHaveLength(2);
  await fireEvent.press(screen.getByRole("button", { name: "See all recipes" }));
  await screen.rerender(<SearchResultsList {...props} query="rice" />);
  expect(screen.getAllByTestId("recipe-row")).toHaveLength(2);
});

it("places web search after saved recipes and replaces two skeletons with actionable results", async () => {
  const search = jest.fn();
  const open = jest.fn();
  const props = {
    recipes: [{ id: "local", title: "Saved rice" } as Recipe],
    ingredients: [],
    colors: { mutedForeground: "gray" } as ReturnType<typeof useColors>,
    hasQuery: true,
    loading: false,
    top: 0,
    bottom: 0,
  };
  const web = {
    results: [],
    loading: false,
    error: false,
    submitted: false,
    canSearch: true,
    onSearch: search,
    onRetry: jest.fn(),
    onOpen: open,
  };
  const screen = await render(<SearchResultsList {...props} web={web} />);
  expect(
    screen.getAllByText(/^(Saved rice|Search the web)$/).map((node) => node.props.children)
  ).toEqual(["Saved rice", "Search the web"]);
  expect(screen.getByTestId("web-search-action")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Search the web" }));
  expect(search).toHaveBeenCalledTimes(1);
  await screen.rerender(
    <SearchResultsList {...props} web={{ ...web, submitted: true, loading: true }} />
  );
  expect(screen.queryByTestId("web-search-action")).toBeNull();
  expect(screen.getAllByTestId("web-recipe-skeleton")).toHaveLength(2);
  const result = {
    title: "Fried rice",
    url: "https://example.com/recipe/fried-rice",
    source: "example.com",
    description: "Egg fried rice",
  };
  await screen.rerender(
    <SearchResultsList {...props} web={{ ...web, submitted: true, results: [result] }} />
  );
  expect(screen.queryByTestId("web-recipe-skeleton")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Open recipe Fried rice from example.com" })
  );
  expect(open).toHaveBeenCalledWith(result);
});

it("bounds late-mounted results above a keyboard that is already open", async () => {
  // Search mounts its list only after typing, after UIKit's keyboard event.
  mockKeyboardHeight.value = -310;
  const props = {
    recipes: [{ id: "curry", title: "Chicken curry" } as Recipe],
    ingredients: [],
    colors: { mutedForeground: "gray" } as ReturnType<typeof useColors>,
    hasQuery: true,
    loading: false,
    top: 50,
    bottom: 34,
  };
  const screen = await render(<SearchResultsList {...props} />);
  const viewport = () =>
    StyleSheet.flatten(screen.getByTestId("search-results-viewport").props.style);

  // The recorded 579-point result set must overflow its usable 502-point frame,
  // rather than rubber-band inside an 812-point frame covered by the keyboard.
  expect(viewport().paddingBottom).toBe(310);
  expect(812 - viewport().paddingBottom).toBeLessThan(579);
  expect(screen.getByTestId("search-results").props.automaticallyAdjustKeyboardInsets).toBe(false);

  mockKeyboardHeight.value = -150;
  await screen.rerender(<SearchResultsList {...props} />);
  expect(viewport().paddingBottom).toBe(150);
  mockKeyboardHeight.value = 0;
  await screen.rerender(<SearchResultsList {...props} />);
  expect(viewport().paddingBottom).toBe(0);
  expect(screen.getByText("Chicken curry")).toBeTruthy();
});

it("leaves Android's resized window in charge of keyboard avoidance", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  mockKeyboardHeight.value = -310;
  const screen = await render(
    <SearchResultsList
      recipes={[]}
      ingredients={[]}
      colors={{ mutedForeground: "gray" } as ReturnType<typeof useColors>}
      hasQuery
      loading={false}
      top={0}
      bottom={0}
    />
  );
  expect(
    StyleSheet.flatten(screen.getByTestId("search-results-viewport").props.style).paddingBottom
  ).toBe(0);
});
