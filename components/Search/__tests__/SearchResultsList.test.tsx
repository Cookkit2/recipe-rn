import { render } from "@testing-library/react-native";
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
jest.mock("~/components/ui/typography", () => ({
  P: require("react-native").Text,
  Small: require("react-native").Text,
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
