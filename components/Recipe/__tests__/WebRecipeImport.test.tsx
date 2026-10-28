import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Text, View } from "react-native";
import ImportWebRecipeScreen from "~/app/recipes/web-import";
const mockReplace = jest.fn();
const mockPrepare = jest.fn();
const mockClearInbox = jest.fn();
let mockUrl = "https://recipes.test/rice/?utm_source=search#recipe";
let mockRecipes: { id: string; sourceUrl: string }[] = [];
let mockPending = false;
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ url: mockUrl }),
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("~/hooks/queries/useRecipeQueries", () => ({
  useRecipes: () => ({
    data: mockRecipes,
    isPending: mockPending,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock("~/hooks/queries/useRecipeImportPreview", () => ({
  useRecipeImportPreview: () => ({
    prepare: mockPrepare,
    save: jest.fn(),
    statusMessage: "Reading recipe…",
  }),
}));
jest.mock("~/lib/recipe-share-inbox", () => ({
  readPendingRecipeShare: () => ({ id: "unrelated-social-share", url: "https://tiktok.com/video" }),
  clearPendingRecipeShare: (...args: unknown[]) => mockClearInbox(...args),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 20 }),
}));
jest.mock("../Loading/RecipeLoadingGlowProvider", () => ({ useRecipeLoadingGlow: () => {} }));
jest.mock("../Details/RecipeDetailsSkeleton", () => ({
  __esModule: true,
  default: () => <View testID="recipe-skeleton" />,
}));
jest.mock("~/components/ui/button", () => ({ Button: require("react-native").Pressable }));
jest.mock("~/components/ui/typography", () => ({
  P: (props: any) => <Text {...props} />,
  H2: (props: any) => <Text {...props} />,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockUrl = "https://recipes.test/rice/?utm_source=search#recipe";
  mockRecipes = [];
  mockPending = false;
  mockPrepare.mockReset();
});

it("shows the recipe skeleton, imports the complete URL once, then opens the saved detail without touching another share", async () => {
  let finish!: (value: unknown) => void;
  mockPrepare.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(<ImportWebRecipeScreen />);
  expect(screen.getByTestId("recipe-skeleton")).toBeTruthy();
  expect(mockPrepare.mock.calls[0]![0]).toMatchObject({ url: "https://recipes.test/rice" });
  await act(async () =>
    finish({ kind: "saved", result: { success: true, recipe: { id: "saved-web" } } })
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/recipes/saved-web"));
  expect(mockPrepare).toHaveBeenCalledTimes(1);
  expect(mockClearInbox).not.toHaveBeenCalled();
});
it("opens an already-imported source instead of extracting/saving a duplicate", async () => {
  mockRecipes = [{ id: "existing", sourceUrl: "https://recipes.test/rice/" }];
  await render(<ImportWebRecipeScreen />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/recipes/existing"));
  expect(mockPrepare).not.toHaveBeenCalled();
  expect(mockClearInbox).not.toHaveBeenCalled();
});
it("waits for the saved-recipe lookup before starting an import", async () => {
  mockPending = true;
  const screen = await render(<ImportWebRecipeScreen />);
  expect(mockPrepare).not.toHaveBeenCalled();
  mockRecipes = [{ id: "existing", sourceUrl: "https://recipes.test/rice" }];
  mockPending = false;
  await screen.rerender(<ImportWebRecipeScreen />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/recipes/existing"));
  expect(mockPrepare).not.toHaveBeenCalled();
});
it("rejects unsupported links before extracting or saving", async () => {
  mockUrl = "file:///private/data";
  const screen = await render(<ImportWebRecipeScreen />);
  expect(screen.getByText("This recipe link is not supported.")).toBeTruthy();
  expect(mockPrepare).not.toHaveBeenCalled();
});
