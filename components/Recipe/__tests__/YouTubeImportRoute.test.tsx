import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import ImportYouTubeRecipe from "~/app/(misc)/import-youtube";

let mockParams: { url?: string } = {};
const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
const mockSave = jest.fn((_input: unknown) => ({ id: "fresh-youtube-share" }));
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock("~/lib/recipe-share-inbox", () => ({
  savePendingRecipeShare: (input: unknown) => mockSave(input),
}));
jest.mock("../Details/RecipeDetailsSkeleton", () => ({
  __esModule: true,
  default: () =>
    require("react").createElement(require("react-native").View, { testID: "recipe-skeleton" }),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});
it("hands an old YouTube URL directly to recipe extraction once, without an import form", async () => {
  mockParams = { url: "https://youtu.be/-Ksv82YLW-A?t=10" };
  const screen = await render(
    <React.StrictMode>
      <ImportYouTubeRecipe />
    </React.StrictMode>
  );
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/recipes/import",
      params: { shareId: "fresh-youtube-share" },
    })
  );
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave).toHaveBeenCalledWith({ url: "https://www.youtube.com/watch?v=-Ksv82YLW-A" });
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
});
it("does not resurrect a stale import when the retired route opens without a new link", async () => {
  await render(<ImportYouTubeRecipe />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  expect(mockSave).not.toHaveBeenCalled();
});
