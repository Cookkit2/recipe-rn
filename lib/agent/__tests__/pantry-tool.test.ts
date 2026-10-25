import { createCookingTools } from "../tools/definitions";
import type { CookingDataClient } from "../tools/planning";

it("does not let the model bypass clarification with guessed foods later in the same turn", async () => {
  const addIngredient = jest.fn();
  const data = { addIngredient } as unknown as CookingDataClient;
  const tool = createCookingTools(data).manage_ingredients;
  const options = { toolCallId: "1", messages: [], context: {} };
  const first = await tool.execute!({ action: "add", name: "vegetables", quantity: 6 }, options);
  expect(first).toMatchObject({ status: "needs_clarification" });
  expect(await tool.execute!({ action: "add", name: "carrot", quantity: 6 }, options)).toEqual(
    first
  );
  expect(addIngredient).not.toHaveBeenCalled();
});
