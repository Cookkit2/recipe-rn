import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import RecipeImportReview from "../RecipeImportReview";
import type { RecipeImportDraft } from "~/types/RecipeImportDraft";

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("~/components/ui/input", () => ({ Input: require("react-native").TextInput }));
jest.mock("~/components/ui/text", () => ({ Text: require("react-native").Text }));
jest.mock("~/components/ui/button", () => ({
  Button: ({ isLoading, ...props }: any) =>
    require("react").createElement(require("react-native").View, {
      ...props,
      accessible: true,
      accessibilityRole: "button",
      accessibilityState: { disabled: !!props.disabled },
    }),
}));

const draft: RecipeImportDraft = {
  recipe: {
    title: "Steamed egg",
    description: "",
    prepMinutes: 0,
    cookMinutes: 15,
    servings: 2,
    difficultyStars: 2,
    ingredients: [
      { name: "egg", quantity: 5, unit: "piece" },
      { name: "chicken", quantity: 0, unit: "g", notes: "Amount not specified" },
    ],
    steps: [{ step: 1, title: "Steam", description: "Steam for 15 minutes." }],
    tags: [],
    sourceUrl: "https://vt.tiktok.com/ZSgH2hh7B/",
  },
  warnings: ["Check the steps against the video."],
};

it("requires the missing amount, accepts decimals and saves the edited recipe with its source", async () => {
  const save = jest.fn();
  const screen = await render(
    <RecipeImportReview draft={draft} saving={false} onSave={save} onBack={jest.fn()} />
  );
  expect(screen.getByLabelText("Amount for ingredient 2").props.value).toBe("");
  expect(screen.getByRole("button", { name: "Save recipe" }).props.disabled).toBe(true);
  expect(save).not.toHaveBeenCalled();
  await act(async () =>
    fireEvent.changeText(screen.getByLabelText("Amount for ingredient 2"), "0.5")
  );
  await act(async () =>
    fireEvent.changeText(screen.getByLabelText("Instruction 1"), "Steam gently for 15 minutes.")
  );
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "Save recipe" })));
  const reviewed = save.mock.calls[0]?.[0] as RecipeImportDraft;
  expect(reviewed.recipe.ingredients[1]?.quantity).toBe(0.5);
  expect(reviewed.recipe.steps[0]?.description).toBe("Steam gently for 15 minutes.");
  expect(reviewed.recipe.sourceUrl).toBe(draft.recipe.sourceUrl);
  expect(draft.recipe.ingredients[1]?.quantity).toBe(0);
});

it("allows a falsely identified ingredient to be removed and blocks empty instructions", async () => {
  const screen = await render(
    <RecipeImportReview draft={draft} saving={false} onSave={jest.fn()} onBack={jest.fn()} />
  );
  await act(async () => fireEvent.press(screen.getByLabelText("Remove ingredient 2")));
  expect(screen.getByRole("button", { name: "Save recipe" }).props.disabled).toBe(false);
  await act(async () => fireEvent.changeText(screen.getByLabelText("Instruction 1"), ""));
  expect(screen.getByRole("button", { name: "Save recipe" }).props.disabled).toBe(true);
});

it("keeps a stated count editable when its unit is unknown", async () => {
  const save = jest.fn();
  const screen = await render(
    <RecipeImportReview
      draft={{
        ...draft,
        recipe: { ...draft.recipe, ingredients: [{ name: "egg", quantity: 2, unit: "" }] },
      }}
      saving={false}
      onSave={save}
      onBack={jest.fn()}
    />
  );
  expect(screen.getByRole("button", { name: "Save recipe" }).props.disabled).toBe(true);
  await act(async () =>
    fireEvent.changeText(screen.getByLabelText("Unit for ingredient 1"), "piece")
  );
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "Save recipe" })));
  expect(save.mock.calls[0]?.[0].recipe.ingredients[0]).toEqual(
    expect.objectContaining({ quantity: 2, unit: "piece" })
  );
});
