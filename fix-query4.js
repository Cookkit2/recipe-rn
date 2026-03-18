const fs = require("fs");

function updateFile(file) {
  let content = fs.readFileSync(file, "utf8");

  // Fix implicit any from prepareUpdate functions
  content = content.replace(
    /\(existing as any\)\.prepareUpdate\(\(ing\)/g,
    "(existing as any).prepareUpdate((ing: any)"
  );
  content = content.replace(
    /\(existing as any\)\.prepareUpdate\(\(s\)/g,
    "(existing as any).prepareUpdate((s: any)"
  );

  // Fix typo from previous script if it caused "thi s"
  content = content.replace(/thi s/g, "this");

  fs.writeFileSync(file, content);
}

updateFile("app/recipes/[recipeId]/edit.tsx");
updateFile("data/db/repositories/RecipeRepository.ts");
updateFile("hooks/useRecipeEdit.ts");
