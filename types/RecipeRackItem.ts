export type RecipeRackItem = {
  id: string;
  title: string;
  imageUrl: string;
  recipeId: string; // Reference to the full recipe data
  x: number;
  y: number;
  scale: number;
  created_at: Date;
  updated_at: Date;
}; 