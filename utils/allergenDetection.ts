import type { Allergen } from "~/types/Allergen";

const ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
  milk: ["milk", "cheese", "butter", "cream", "yogurt", "whey", "lactose", "dairy"],
  eggs: ["egg", "mayonnaise", "mayo"],
  nuts: ["almond", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "macadamia"],
  fish: ["salmon", "tuna", "cod", "anchovy", "sardine"],
  shellfish: ["shrimp", "crab", "lobster", "scallop", "prawn", "oyster", "mussel"],
  wheat: ["wheat", "flour", "bread", "pasta", "barley", "rye", "breadcrumbs"],
  soy: ["soy", "tofu", "tempeh"],
  peanuts: ["peanut"],
  sesame: ["sesame", "tahini"],
};

export function detectAllergens(ingredientNames: string[]): Allergen[] {
  const detected = new Set<Allergen>();

  for (const name of ingredientNames) {
    const lower = name.toLowerCase();
    for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
      if (keywords.some((keyword) => lower.includes(keyword))) {
        detected.add(allergen as Allergen);
      }
    }
  }

  return Array.from(detected);
}
