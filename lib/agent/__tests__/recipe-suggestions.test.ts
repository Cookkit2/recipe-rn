import { requestsRecipeSuggestions, recipeSuggestionsSchema } from "../recipe-suggestions";

it.each([
  ["Suggest 3 recipes using my pantry.", true],
  ["What can I cook with eggs?", true],
  ["Recommend dinner from my fridge", true],
  ["How long should I boil eggs?", false],
  ["How long should I cook this recipe?", false],
  ["Explain this recipe step", false],
  ["Add 6 eggs to my pantry.", false],
  ["Plan meals for the next 3 days", false],
])("routes %s to the appropriate chat mode", (content, expected) => {
  expect(requestsRecipeSuggestions([{ id: "1", role: "user", content }])).toBe(expected);
});

it("keeps short recipe follow-ups grounded in the catalog", () => {
  expect(
    requestsRecipeSuggestions([
      { id: "1", role: "user", content: "Suggest recipes" },
      { id: "2", role: "assistant", content: "" },
      { id: "3", role: "user", content: "Any other options?" },
    ])
  ).toBe(true);
});

it("rejects incomplete tool results instead of displaying unverified titles", () => {
  expect(
    recipeSuggestionsSchema.safeParse({
      recipes: [{ title: "Pasta" }],
      pantryCount: 1,
      truncated: false,
    }).success
  ).toBe(false);
});

it("grounds follow-ups when the earlier request did not use the word recipe", () => {
  expect(
    requestsRecipeSuggestions([
      { id: "1", role: "user", content: "What can I cook with eggs?" },
      { id: "2", role: "assistant", content: "" },
      { id: "3", role: "user", content: "Any other options?" },
    ])
  ).toBe(true);
});

it("does not turn a pantry mutation follow-up into a recipe lookup", () => {
  expect(
    requestsRecipeSuggestions([
      { id: "1", role: "user", content: "Suggest recipes" },
      { id: "2", role: "assistant", content: "" },
      { id: "3", role: "user", content: "Add another egg to my pantry" },
    ])
  ).toBe(false);
});
