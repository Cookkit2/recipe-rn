import { recipeSuggestionsSchema } from "../recipe-suggestions";

it("rejects incomplete tool results instead of displaying unverified titles", () => {
  expect(
    recipeSuggestionsSchema.safeParse({
      recipes: [{ title: "Pasta" }],
      pantryCount: 1,
      truncated: false,
    }).success
  ).toBe(false);
});
