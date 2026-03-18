const fs = require("fs");

function updateFile(file) {
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(/recipe\.ingredients\.query\(\)\.fetch/g, "recipe.ingredients.fetch");
  content = content.replace(/recipe\.steps\.query\(\)\.fetch/g, "recipe.steps.fetch");
  content = content.replace(
    /dbRecipe\.ingredients\.query\(\)\.fetch/g,
    "dbRecipe.ingredients.fetch"
  );
  content = content.replace(/dbRecipe\.steps\.query\(\)\.fetch/g, "dbRecipe.steps.fetch");

  content = content.replace(/!recipe\.ingredients\.query/g, "!recipe.ingredients.fetch");

  // Fix implicit any
  content = content.replace(/\(ing\)\s*=>\s*\[ing\.id,\s*ing\]/g, "(ing: any) => [ing.id, ing]");
  content = content.replace(
    /\(step\)\s*=>\s*\[step\.id,\s*step\]/g,
    "(step: any) => [step.id, step]"
  );
  content = content.replace(/\(s\)\s*=>\s*\[s\.id,\s*s\]/g, "(s: any) => [s.id, s]");

  // Fix prepareUpdate in edit.tsx
  // The error is: Property 'prepareUpdate' does not exist on type '{}'
  // The line usually looks like: const updateBatch = ... existingIngredients.map(ing => existing.prepareUpdate( ...
  // Let's just find `prepareUpdate` and ensure the variable using it is typed as `any` or casted.
  content = content.replace(/existingIng\.prepareUpdate/g, "(existingIng as any).prepareUpdate");
  content = content.replace(/existingStep\.prepareUpdate/g, "(existingStep as any).prepareUpdate");

  // also handle when they just use `ing` or `s` for existing mapping.
  content = content.replace(
    /\(ing\) =>\s*existing\.prepareUpdate/g,
    "(ing: any) => (existing as any).prepareUpdate"
  );
  content = content.replace(
    /\(s\) =>\s*existing\.prepareUpdate/g,
    "(s: any) => (existing as any).prepareUpdate"
  );

  fs.writeFileSync(file, content);
}

updateFile("app/recipes/[recipeId]/edit.tsx");
updateFile("data/db/repositories/RecipeRepository.ts");
updateFile("hooks/useRecipeEdit.ts");
