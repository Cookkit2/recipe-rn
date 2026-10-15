export interface SharedRecipeInput {
  url?: string;
  text?: string;
}
export interface PendingRecipeShare extends SharedRecipeInput {
  id: string;
}
