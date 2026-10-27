import { createCookingTools } from "../tools/definitions";
import type { CookingDataClient } from "../tools/planning";

it("does not let the model bypass clarification with guessed foods later in the same turn", async () => {
  const addIngredient = jest.fn();
  const data = { addIngredient } as unknown as CookingDataClient;
  const tool = createCookingTools(data, { intent: "add_ingredient" }).manage_ingredients;
  const options = { toolCallId: "1", messages: [], context: {} };
  const first = await tool.execute!({ action: "add", name: "vegetables", quantity: 6 }, options);
  expect(first).toMatchObject({ status: "needs_clarification" });
  expect(await tool.execute!({ action: "add", name: "carrot", quantity: 6 }, options)).toEqual(
    first
  );
  expect(addIngredient).not.toHaveBeenCalled();
});

it("fails closed when no validated capability is supplied", async () => {
  const managePantry = jest.fn().mockResolvedValue({ ok: false, error: "Unexpected mutation" });
  const data = { managePantry } as unknown as CookingDataClient;
  const tools = createCookingTools(data);
  expect(
    await tools.manage_ingredients.execute!(
      { action: "add", name: "eggs" },
      { toolCallId: "1", messages: [], context: {} }
    )
  ).toMatchObject({ ok: false, status: "not_authorized" });
  expect(managePantry).not.toHaveBeenCalled();
});

it.each(["remove", "rename", "merge"] as const)(
  "rejects unplanned %s under an add-only plan",
  async (action) => {
    const managePantry = jest.fn().mockResolvedValue({ ok: false, error: "Unexpected mutation" });
    const data = { managePantry } as unknown as CookingDataClient;
    const tools = createCookingTools(data, { intent: "add_ingredient" });
    expect(
      await tools.manage_ingredients.execute!(
        { action, name: "eggs", stockId: "1", targetStockId: "2" },
        { toolCallId: "1", messages: [], context: {} }
      )
    ).toMatchObject({ ok: false, status: "not_authorized" });
    expect(managePantry).not.toHaveBeenCalled();
  }
);

it("rejects mutations even if the model calls one during a pantry read", async () => {
  const managePantry = jest.fn().mockResolvedValue({ ok: false, error: "Unexpected mutation" });
  const data = { managePantry } as unknown as CookingDataClient;
  const tools = createCookingTools(data, { intent: "describe_pantry" });
  expect(
    await tools.manage_ingredients.execute!(
      { action: "remove", name: "eggs" },
      { toolCallId: "1", messages: [], context: {} }
    )
  ).toMatchObject({ ok: false, status: "not_authorized" });
  expect(managePantry).not.toHaveBeenCalled();
});

it("does not repeat a completed mutation step, including parallel calls", async () => {
  const output = {
    ok: true as const,
    status: "updated" as const,
    item: {
      id: "eggs",
      name: "eggs",
      quantity: 8,
      unit: "count",
      expiryDate: null,
      householdId: null,
      addedByUserId: null,
    },
  };
  const managePantry = jest.fn().mockResolvedValue(output);
  const data = { managePantry } as unknown as CookingDataClient;
  const tools = createCookingTools(data, { intent: "add_ingredient" });
  const options = { toolCallId: "1", messages: [], context: {} };
  const input = { action: "add" as const, name: "eggs", quantity: 2 };
  await Promise.all([
    tools.manage_ingredients.execute!(input, options),
    tools.manage_ingredients.execute!(input, options),
  ]);
  expect(managePantry).toHaveBeenCalledTimes(1);
});

it("preserves supplied quantity and unit when a follow-up only clarifies the name", async () => {
  const managePantry = jest
    .fn()
    .mockResolvedValue({ ok: false, status: "needs_clarification", question: "Which entry?" });
  const data = { managePantry } as unknown as CookingDataClient;
  const tools = createCookingTools(data, {
    intent: "add_ingredient",
    suppliedInput: { action: "add", name: "vegetables", quantity: 6, unit: "pieces" },
  });
  await tools.manage_ingredients.execute!(
    { action: "add", name: "carrots", quantity: 1 },
    { toolCallId: "1", messages: [], context: {} }
  );
  expect(managePantry).toHaveBeenCalledWith(
    expect.objectContaining({ name: "carrots", quantity: 6, unit: "pieces" })
  );
});
