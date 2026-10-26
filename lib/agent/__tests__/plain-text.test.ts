import { toAssistantPlainText } from "../plain-text";
import { COOKING_ASSISTANT_INSTRUCTIONS } from "../instructions";

it.each([
  ["Your allergens include **eggs** and *milk*.", "Your allergens include eggs and milk."],
  ["Use __eggs__, _milk_, and ~~sugar~~.", "Use eggs, milk, and sugar."],
  [
    "# Pantry\n\n- Eggs\n* Milk\n1. Rice\n> Check your diet.",
    "Pantry\n\nEggs\nMilk\nRice\nCheck your diet.",
  ],
  ["Use `eggs`.\n```text\nBoil water.\n```", "Use eggs.\nBoil water."],
  ["Read [the guide](https://example.com).", "Read the guide (https://example.com)."],
  ["![Eggs](https://example.com/eggs.png)", "Eggs"],
  ["| Ingredient | Count |\n| --- | ---: |\n| Eggs | 6 |", "Ingredient, Count\nEggs, 6"],
  ["Eggs\n---\n\n***\nMilk", "Eggs\n\nMilk"],
  ["You have **eg", "You have eg"],
  ["**", ""],
  ["##", ""],
  ["Read [the guide", "Read the guide"],
  ["Read [the guide](https://example.com", "Read the guide (https://example.com)"],
  ["You have **eggs*", "You have eggs"],
  [
    "Use 1/2 cup. Cook at 180°C. 2 * 3 = 6. pantry_item stays.",
    "Use 1/2 cup. Cook at 180°C. 2 * 3 = 6. pantry_item stays.",
  ],
])("converts %s to readable plain text", (input, expected) => {
  expect(toAssistantPlainText(input)).toBe(expected);
});

it("explicitly instructs the model to reply in plain text", () => {
  expect(COOKING_ASSISTANT_INSTRUCTIONS).toContain("Reply in plain text only");
});

it.each([
  [
    "Chicken breast (stockId: opaque-chicken-123)\nMilk (stockId: opaque-milk-456)",
    "Chicken breast\nMilk",
  ],
  ["Eggs (stock_id = abc123)", "Eggs"],
  ["Eggs (**stockId**: `abc123`)", "Eggs"],
  ["Eggs\nStock ID: abc123\n6 pcs", "Eggs\n\n6 pcs"],
  ["Eggs (stockId: opaque-part", "Eggs"],
  ["Eggs (stockId:", "Eggs"],
])("hides stock identifier metadata in %s", (input, expected) => {
  expect(toAssistantPlainText(input)).toBe(expected);
});

it("hides bare known stock IDs without removing quantities or ingredient names", () => {
  expect(toAssistantPlainText("Eggs: 6 pcs. Selected opaque-eggs-123.", ["opaque-eggs-123"])).toBe(
    "Eggs: 6 pcs. Selected."
  );
});

it("never flashes a known stock ID split across streamed chunks", () => {
  const stockId = "opaque-eggs-123";
  for (let length = 3; length <= stockId.length; length++) {
    const text = toAssistantPlainText(`Eggs (${stockId.slice(0, length)}`, [stockId]);
    expect(text).toBe("Eggs");
  }
});
