const size = 10000;
console.log(`Generating data of size ${size}...`);

const mappings = Array.from({ length: size }, (_, i) => ({
  id: `m${i}`,
  recipeId: `r${i}`,
}));

const recipes = Array.from({ length: size }, (_, i) => ({
  id: `r${i}`,
  type: "tailored",
  sourceUrl: "base_recipe_id",
}));

// Simulate the O(N^2) approach
const start1 = performance.now();
let found1 = 0;
for (const mapping of mappings) {
  const recipe = recipes.find((r) => r.id === mapping.recipeId);
  if (recipe) found1++;
}
const end1 = performance.now();
const time1 = end1 - start1;

// Simulate the O(N) Map-based approach
const start2 = performance.now();
let found2 = 0;
const recipeMap = new Map(recipes.map((r) => [r.id, r]));
for (const mapping of mappings) {
  const recipe = recipeMap.get(mapping.recipeId);
  if (recipe) found2++;
}
const end2 = performance.now();
const time2 = end2 - start2;

console.log(`O(N^2) Array.find approach took: ${time1.toFixed(2)}ms (found ${found1})`);
console.log(`O(N) Map.get approach took: ${time2.toFixed(2)}ms (found ${found2})`);
console.log(`Improvement: ${(time1 / time2).toFixed(2)}x faster`);
