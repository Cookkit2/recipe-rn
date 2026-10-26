import { hideStockIds, stockIdsFromEvent } from "../stock-id-display";
import type { AgentEvent } from "../types";

it.each([
  ["Milk (**stockId**: `abc123`)", "Milk"],
  ["Milk\n**Stock ID**: `abc123`", "Milk"],
  ["Eggs (targetStockId: abc123)", "Eggs"],
  ["Milk (stockId:\nabc123)", "Milk"],
  ["Milk stockId: abc123, 1 litre", "Milk, 1 litre"],
])("hides labeled IDs even without known tool data: %s", (text, expected) => {
  expect(hideStockIds(text)).toBe(expected);
});

it("hides short known IDs without removing unrelated amounts", () => {
  expect(hideStockIds("Eggs: 6 pcs (x7).", ["x7"])).toBe("Eggs: 6 pcs.");
});

it.each([
  [
    {
      type: "tool-result",
      toolCallId: "read",
      toolName: "get_pantry",
      output: { items: [{ id: "read-id" }] },
    },
    ["read-id"],
  ],
  [
    {
      type: "tool-result",
      toolCallId: "write",
      toolName: "manage_ingredients",
      output: { item: { id: "write-id" } },
    },
    ["write-id"],
  ],
  [
    {
      type: "tool-result",
      toolCallId: "remove",
      toolName: "manage_ingredients",
      output: { removed: [{ id: "removed-id" }] },
    },
    ["removed-id"],
  ],
  [
    {
      type: "tool-result",
      toolCallId: "choose",
      toolName: "manage_ingredients",
      output: { candidates: [{ id: "candidate-id" }] },
    },
    ["candidate-id"],
  ],
  [
    {
      type: "tool-result",
      toolCallId: "diet",
      toolName: "analyze_diet",
      output: { conflicts: [{ id: "diet-id" }] },
    },
    ["diet-id"],
  ],
  [
    {
      type: "tool-call",
      toolCallId: "merge",
      toolName: "manage_ingredients",
      input: { stockId: "source", targetStockId: "destination" },
    },
    ["source", "destination"],
  ],
  [
    {
      type: "tool-result",
      toolCallId: "recipes",
      toolName: "suggest_recipes",
      output: { recipes: [{ id: "recipe-id" }] },
    },
    [],
  ],
] as Array<[AgentEvent, string[]]>)(
  "collects only internal stock IDs from %p",
  (event, expected) => {
    expect(stockIdsFromEvent(event)).toEqual(expected);
  }
);

it("also keeps catalog references from mutation data out of display text", () => {
  const event: AgentEvent = {
    type: "tool-result",
    toolCallId: "write",
    toolName: "manage_ingredients",
    output: { item: { id: "stock-private", baseIngredientId: "catalog-private" } },
  };
  const ids = stockIdsFromEvent(event);
  expect(ids).toEqual(["stock-private", "catalog-private"]);
  expect(hideStockIds("Eggs (catalog-private), 2 pcs", ids)).toBe("Eggs, 2 pcs");
});
