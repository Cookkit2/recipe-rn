export interface RecipeIngredient {
  name: string;
  quantity: string;
  notes?: string;
}

export interface RecipeStep {
  stepNumber: number;
  description: string;
  imageUrl?: string; // Optional image for a specific step
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string; // Main image for the recipe
  prepMinutes?: number; // integer minutes
  cookMinutes?: number; // integer minutes
  difficultyStars?: number; // 1-3 or 1-5 scale
  servings?: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[]; // Changed from string[] to RecipeStep[]
  sourceUrl?: string;
  calories?: number; // Added from previous recipe list example
  tags?: string[];
}
