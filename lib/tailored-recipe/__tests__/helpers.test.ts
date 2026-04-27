/// <reference types="jest" />
import {
  parseTailoredRecipeResponse,
  buildPantryHash,
  buildTailoredPrompt,
  convertDbTailoredRecipeToUIRecipe,
} from "../helpers";
import type { Recipe } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import type { Allergen } from "~/types/Allergen";
import type { Diet } from "~/types/Diet";

describe("parseTailoredRecipeResponse", () => {
  const baseRecipe: Recipe = {
    id: "base-123",
    title: "Base Recipe",
    description: "A base recipe description",
    imageUrl: "https://example.com/image.jpg",
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    difficultyStars: 3,
    calories: 500,
    tags: ["dinner"],
    ingredients: [],
    instructions: [],
    sourceUrl: "https://example.com",
  };

  it("should successfully parse valid JSON response", () => {
    const responseText = `\`\`\`json
    {
      "title": "Tailored Recipe",
      "ingredients": [
        { "name": "salt", "quantity": 1, "unit": "tsp" }
      ],
      "instructions": [
        { "step": 1, "title": "Mix", "description": "Mix it well" }
      ]
    }
    \`\`\``;

    const result = parseTailoredRecipeResponse(responseText, baseRecipe);

    expect(result!.title).toBe("Tailored Recipe");
    expect(result!.ingredients?.length).toBe(1);
    expect(result!.ingredients?.[0]?.name).toBe("salt");
    expect(result!.instructions?.length).toBe(1);
    expect(result!.instructions?.[0]?.title).toBe("Mix");
  });

  it("should throw an error for malformed JSON", () => {
    const responseText = `\`\`\`json
    {
      "title": "Tailored Recipe",
      "ingredients": [
        { "name": "salt", "quantity": 1, "unit": "tsp" }
      ],
      "instructions": [
        { "step": 1, "title": "Mix", "description": "Mix it well" }
      ]
    `; // Missing closing brace

    expect(() => parseTailoredRecipeResponse(responseText, baseRecipe)).toThrow(
      "Invalid tailored recipe response: failed to parse JSON"
    );
  });

  it("should throw an error if parsed JSON is missing required fields", () => {
    const responseText = `\`\`\`json
    {
      "title": "Tailored Recipe"
    }
    \`\`\``;

    expect(() => parseTailoredRecipeResponse(responseText, baseRecipe)).toThrow(
      "Invalid tailored recipe response"
    );
  });
});

describe("buildPantryHash", () => {
  it("should create hash for empty pantry", () => {
    const hash = buildPantryHash([]);
    expect(hash).toBeDefined();
    expect(hash).toMatch(/^h\d+$/);
  });

  it("should create consistent hash for same pantry items", () => {
    const pantryItems: PantryItem[] = [
      {
        id: "1",
        name: "Tomato",
        quantity: 2,
        unit: "pieces",
        expiry_date: new Date(),
      } as any as any,
      { id: "2", name: "Onion", quantity: 1, unit: "piece", expiry_date: new Date() } as any as any,
    ];

    const hash1 = buildPantryHash(pantryItems);
    const hash2 = buildPantryHash(pantryItems);

    expect(hash1).toBe(hash2);
  });

  it("should normalize case and whitespace", () => {
    const items1: PantryItem[] = [
      { id: "1", name: "Tomato", quantity: 2, unit: "pieces", expiry_date: new Date() } as any,
    ];
    const items2: PantryItem[] = [
      { id: "2", name: "  tomato  ", quantity: 2, unit: "pieces", expiry_date: new Date() } as any,
    ];

    const hash1 = buildPantryHash(items1);
    const hash2 = buildPantryHash(items2);

    expect(hash1).toBe(hash2);
  });

  it("should create different hashes for different pantries", () => {
    const items1: PantryItem[] = [
      { id: "1", name: "Tomato", quantity: 2, unit: "pieces", expiry_date: new Date() } as any,
    ];
    const items2: PantryItem[] = [
      { id: "2", name: "Onion", quantity: 1, unit: "piece", expiry_date: new Date() } as any,
    ];

    const hash1 = buildPantryHash(items1);
    const hash2 = buildPantryHash(items2);

    expect(hash1).not.toBe(hash2);
  });
});

describe("buildTailoredPrompt", () => {
  const baseRecipe: Recipe = {
    id: "recipe-1",
    title: "Pasta",
    description: "Delicious pasta",
    imageUrl: "",
    ingredients: [
      { name: "Pasta", relatedIngredientId: "1", quantity: 200, unit: "g" },
      { name: "Tomato Sauce", relatedIngredientId: "2", quantity: 100, unit: "ml" },
    ],
    instructions: [
      { step: 1, title: "Boil", description: "Boil pasta", relatedIngredientIds: [] },
      { step: 2, title: "Mix", description: "Mix with sauce", relatedIngredientIds: [] },
    ],
  };

  const pantryItems: PantryItem[] = [
    { id: "1", name: "Pasta", quantity: 200, unit: "g", expiry_date: new Date() } as any,
    { id: "2", name: "Tomato", quantity: 2, unit: "pieces", expiry_date: new Date() } as any,
  ];

  it("should build prompt with basic info", () => {
    const prompt = buildTailoredPrompt(baseRecipe, pantryItems, {
      allergens: [],
      otherAllergens: [],
      appliances: [],
    });

    expect(prompt).toContain("Pasta");
    expect(prompt).toContain("Delicious pasta");
    expect(prompt).toContain("Pasta: 200 g");
    expect(prompt).toContain("Tomato: 2 pieces");
  });

  it("should include dietary information when provided", () => {
    const prompt = buildTailoredPrompt(baseRecipe, pantryItems, {
      diet: "vegetarian" as Diet,
      allergens: ["dairy" as Allergen],
      otherAllergens: ["nuts"],
      appliances: [],
    });

    expect(prompt).toContain("Diet: vegetarian");
    expect(prompt).toContain("Allergens: dairy");
    expect(prompt).toContain("Other allergens: nuts");
  });

  it("should not include diet when set to none", () => {
    const prompt = buildTailoredPrompt(baseRecipe, pantryItems, {
      diet: "none" as Diet,
      allergens: [],
      otherAllergens: [],
      appliances: [],
    });

    expect(prompt).not.toContain("Diet:");
  });

  it("should include appliances when provided", () => {
    const prompt = buildTailoredPrompt(baseRecipe, pantryItems, {
      allergens: [],
      otherAllergens: [],
      appliances: ["Oven", "Microwave"],
    });

    expect(prompt).toContain("Available cooking appliances: Oven, Microwave");
  });

  it("should include ingredient notes", () => {
    const recipeWithNotes: Recipe = {
      ...baseRecipe,
      ingredients: [
        { name: "Pasta", relatedIngredientId: "1", quantity: 200, unit: "g", notes: "whole wheat" },
      ],
    };

    const prompt = buildTailoredPrompt(recipeWithNotes, pantryItems, {
      allergens: [],
      otherAllergens: [],
      appliances: [],
    });

    expect(prompt).toContain("whole wheat");
  });
});

describe("convertDbTailoredRecipeToUIRecipe", () => {
  const baseRecipe: Recipe = {
    id: "base-123",
    title: "Original Recipe",
    description: "Original description",
    imageUrl: "https://example.com/original.jpg",
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    difficultyStars: 3,
    calories: 500,
    tags: ["dinner"],
    ingredients: [],
    instructions: [],
    sourceUrl: "https://example.com",
  };

  const dbRecipe = {
    id: "tailored-456",
    title: "Tailored Recipe",
    description: "Tailored description",
    imageUrl: "https://example.com/tailored.jpg",
    prepMinutes: 15,
    cookMinutes: 25,
    difficultyStars: 2,
    servings: 4,
    calories: 600,
    tags: ["lunch"],
  };

  const steps = [
    { id: "step-1", step: 1, title: "Prepare", description: "Prep ingredients" },
    { id: "step-2", step: 2, title: "Cook", description: "Cook food" },
  ];

  const ingredients = [
    { id: "ing-1", name: "Flour", quantity: 200, unit: "g", notes: "whole wheat" },
    { id: "ing-2", name: "Eggs", quantity: 2, unit: "pieces", notes: "" },
  ];

  it("should convert db recipe to ui recipe", () => {
    const result = convertDbTailoredRecipeToUIRecipe(
      dbRecipe as any,
      steps,
      ingredients,
      baseRecipe
    );

    expect(result!.id).toBe("tailored-456");
    expect(result!.title).toBe("Tailored Recipe");
    expect(result!.description).toBe("Tailored description");
    expect(result!.ingredients).toHaveLength(2);
    expect(result!.instructions).toHaveLength(2);
  });

  it("should use base recipe values for missing fields", () => {
    const partialDbRecipe = {
      id: "tailored-789",
      title: "Partial Recipe",
      description: null,
      imageUrl: null,
      prepMinutes: null,
      cookMinutes: null,
      difficultyStars: null,
      servings: null,
      calories: null,
      tags: null,
    };

    const result = convertDbTailoredRecipeToUIRecipe(partialDbRecipe as any, [], [], baseRecipe);

    expect(result!.description).toBe(baseRecipe.description);
    expect(result.imageUrl).toBe(baseRecipe.imageUrl);
    expect(result.calories).toBe(baseRecipe.calories);
    expect(result.tags).toBe(baseRecipe.tags);
  });

  it("should create unique relatedIngredientIds", () => {
    const result = convertDbTailoredRecipeToUIRecipe(
      dbRecipe as any,
      steps,
      ingredients,
      baseRecipe
    );

    expect(result!.ingredients[0]!.relatedIngredientId).toBe("tailored-tailored-456-1");
    expect(result!.ingredients[1]!.relatedIngredientId).toBe("tailored-tailored-456-2");
  });

  it("should include empty relatedIngredientIds for instructions", () => {
    const result = convertDbTailoredRecipeToUIRecipe(
      dbRecipe as any,
      steps,
      ingredients,
      baseRecipe
    );

    expect(result!.instructions[0]!.relatedIngredientIds).toEqual([]);
    expect(result!.instructions[1]!.relatedIngredientIds).toEqual([]);
  });
});
