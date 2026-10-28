import { fireEvent, render } from "@testing-library/react-native";
import { SearchResultsList } from "../SearchResultsList";
import type { Recipe } from "~/types/Recipe";
import type useColors from "~/hooks/useColor";

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
  expect(screen.getByText("Searching the web…")).toBeTruthy();
  await screen.rerender(
    <SearchResultsList {...props} web={{ ...web, loading: false, error: true }} />
  );
  expect(screen.getByText("Saved rice")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Retry web search"));
  expect(retry).toHaveBeenCalledTimes(1);
});
