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

  // Fix the implicit any types in app/recipes/[recipeId]/edit.tsx and hooks/useRecipeEdit.ts
  content = content.replace(/\(ing\)\s*=>\s*\[ing\.id, ing\]/g, "(ing: any) => [ing.id, ing]");
  content = content.replace(
    /\(step\)\s*=>\s*\[step\.id, step\]/g,
    "(step: any) => [step.id, step]"
  );
  content = content.replace(/\(s\)\s*=>\s*\[s\.id, s\]/g, "(s: any) => [s.id, s]");

  // In app/recipes/[recipeId]/edit.tsx, fix `prepareUpdate` error
  content = content.replace(/ing\.prepareUpdate/g, "(ing as any).prepareUpdate");
  content = content.replace(/s\.prepareUpdate/g, "(s as any).prepareUpdate");

  fs.writeFileSync(file, content);
}

updateFile("app/recipes/[recipeId]/edit.tsx");
updateFile("data/db/repositories/RecipeRepository.ts");
updateFile("hooks/useRecipeEdit.ts");
