const fs = require("fs");

function updateFile(file) {
  let content = fs.readFileSync(file, "utf8");

  // Fix queries
  content = content.replace(/recipe\.ingredients\.query\(\)\.fetch/g, "recipe.ingredients.fetch");
  content = content.replace(/recipe\.steps\.query\(\)\.fetch/g, "recipe.steps.fetch");
  content = content.replace(
    /dbRecipe\.ingredients\.query\(\)\.fetch/g,
    "dbRecipe.ingredients.fetch"
  );
  content = content.replace(/dbRecipe\.steps\.query\(\)\.fetch/g, "dbRecipe.steps.fetch");
  content = content.replace(/recipe\.ingredients\.query !==/g, "recipe.ingredients.fetch !==");

  // Fix array maps typing
  content = content.replace(/\(ing\) => \[ing\.id, ing\]/g, "(ing: any) => [ing.id, ing]");
  content = content.replace(/\(step\) => \[step\.id, step\]/g, "(step: any) => [step.id, step]");

  // Fix prepare update errors
  // app/recipes/[recipeId]/edit.tsx:
  // exist(ing as any).prepareUpdate -> (existing as any).prepareUpdate
  content = content.replace(
    /exist\(ing as any\)\.prepareUpdate/g,
    "(existing as any).prepareUpdate"
  );

  // In the original file before previous modifications, it might be `existing.prepareUpdate((ing) =>`
  content = content.replace(
    /existing\.prepareUpdate\(\(ing\)/g,
    "(existing as any).prepareUpdate((ing: any)"
  );
  content = content.replace(
    /existing\.prepareUpdate\(\(s\)/g,
    "(existing as any).prepareUpdate((s: any)"
  );

  fs.writeFileSync(file, content);
}

updateFile("app/recipes/[recipeId]/edit.tsx");
updateFile("data/db/repositories/RecipeRepository.ts");
updateFile("hooks/useRecipeEdit.ts");
