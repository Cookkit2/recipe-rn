import { createCookingAgent } from "../factory";
import { NebiusCookingAgent } from "../NebiusCookingAgent";
import { AgentUnavailableError } from "../types";
import type { CookingDataClient } from "../tools/planning";

const data = {
  listPantry: async () => [],
  addIngredient: async () => ({ ok: false as const, error: "unused" }),
  removeIngredient: async () => ({ ok: false as const, error: "unused" }),
  getDietProfile: async () => ({
    diet: null,
    allergens: [],
    macroTarget: null,
    source: "none" as const,
  }),
  listRecipes: async () => ({ recipes: [], truncated: false }),
} satisfies CookingDataClient;

it("returns the Nebius agent by default", () => {
  const agent = createCookingAgent({ data });
  expect(agent).toBeInstanceOf(NebiusCookingAgent);
  expect(agent.kind).toBe("nebius");
});

it("rejects the unimplemented local agent", () => {
  expect(() => createCookingAgent({ kind: "local", data })).toThrow(AgentUnavailableError);
});

it("maps an injected model stream without calling Nebius", async () => {
  const agent = createCookingAgent({
    data,
    streamTurn: async function* () {
      yield { type: "text-delta", text: "Hello" };
      yield { type: "finish", finishReason: "stop" };
    },
  });
  const events = [];
  for await (const event of agent.stream({ messages: [] })) events.push(event);
  expect(events.map((event) => event.type)).toEqual(["text-delta", "finish"]);
});

it("reports a missing prototype key before opening a stream", async () => {
  const agent = createCookingAgent({
    data,
    config: { apiKey: "", model: "", baseURL: "https://api.tokenfactory.nebius.com/v1" },
  });
  const events = [];
  for await (const event of agent.stream({
    messages: [{ id: "1", role: "user", content: "What can I cook?" }],
  })) {
    events.push(event);
  }
  expect(events[0]).toMatchObject({ type: "error" });
  expect(events[0]?.type === "error" ? events[0].message : "").toBe(
    "Something went wrong, please try again later"
  );
});
