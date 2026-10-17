/** Explicit, small live-inference check. Requires the loopback proxy (`bun run ai:dev`). */
import { buildTextRecipeRequest } from "../lib/recipe-scrapper/shared/recipe-ai-utils";

const response = await fetch("http://127.0.0.1:8787/ai", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(
    buildTextRecipeRequest(`Extract this shared recipe caption.
Garlic rice, serves 2.
Ingredients: 1 cup rice, 2 cloves garlic, 2 cups water.
Rinse rice. Mince garlic. Add rice, garlic and water to a pot. Bring to a boil, cover and simmer 15 minutes.
Only use the stated ingredients and instructions.`)
  ),
  signal: AbortSignal.timeout(75_000),
});
if (!response.ok) {
  const failure = await response.json();
  throw new Error(`AI proxy HTTP ${response.status}: ${failure.error}`);
}
const result = await response.json();
const analysis = JSON.parse(result.content);
if (
  !analysis.isCookingVideo ||
  !analysis.recipe?.ingredients?.length ||
  !analysis.recipe?.steps?.length
) {
  throw new Error("Nano did not extract the sample recipe.");
}
console.log(
  JSON.stringify(
    {
      model: result.model,
      title: analysis.recipe.title,
      ingredients: analysis.recipe.ingredients.length,
      steps: analysis.recipe.steps.length,
      usage: result.usage,
    },
    null,
    2
  )
);
