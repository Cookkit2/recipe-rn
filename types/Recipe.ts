export interface RecipeIngredient {
  name: string;
  relatedIngredientId: string;
  quantity: string;
  notes?: string;
}

export interface RecipeStep {
  step: number;
  title: string;
  description: string;
  relatedIngredientIds: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string; // Main image for the recipe
  prepMinutes?: number; // integer minutes
  cookMinutes?: number; // integer minutes
  difficultyStars?: number; // 1-5 scale
  servings?: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  sourceUrl?: string;
  calories?: number; // Added from previous recipe list example
  tags?: string[];
}
