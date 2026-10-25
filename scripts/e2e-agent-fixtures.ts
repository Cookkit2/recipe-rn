/**
 * Host-side Nebius and Supabase stand-ins for the Detox assistant scenario.
 *
 * Binds the fixed ports baked into the E2E bundle (see scripts/e2e-ios-env.sh).
 * Reuses the Tier A HTTP fixtures. Stays in the foreground until the process
 * is killed.
 */
import {
  E2E_NEBIUS_PORT,
  E2E_SUPABASE_PORT,
  E2E_USER_ID,
  e2eNebiusBaseURL,
  e2eSupabaseURL,
} from "../lib/agent/testing/e2e-contract";
import { startOpenAICompatibleServer } from "../lib/agent/testing/openai-compatible-server";
import { startPostgrestFixture } from "../lib/agent/testing/postgrest-fixture";

async function main(): Promise<void> {
  const database = await startPostgrestFixture(
    {
      baseIngredients: [{ id: "base-eggs", name: "eggs" }],
    },
    { port: E2E_SUPABASE_PORT }
  );
  const model = await startOpenAICompatibleServer({
    port: E2E_NEBIUS_PORT,
    script: ({ body }) => {
      const hasToolResult = body.messages?.some((message) => message.role === "tool");
      if (!hasToolResult) {
        return {
          toolCalls: [
            {
              id: "call_add_eggs",
              name: "manage_ingredients",
              arguments: { action: "add", name: "eggs", quantity: 6, unit: "count" },
            },
          ],
        };
      }
      return { textDeltas: ["Added ", "eggs to your pantry."] };
    },
  });

  console.log(
    `[e2e-fixtures] ready user=${E2E_USER_ID} nebius=${e2eNebiusBaseURL(E2E_NEBIUS_PORT)} supabase=${e2eSupabaseURL(E2E_SUPABASE_PORT)}`
  );
  console.log("[e2e-fixtures] ready");

  const shutdown = async () => {
    await model.close();
    await database.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  await new Promise(() => {});
}

main().catch((error: unknown) => {
  console.error("[e2e-fixtures] failed", error);
  process.exitCode = 1;
});
