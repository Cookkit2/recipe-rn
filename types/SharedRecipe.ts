export interface SharedRecipeInput {
  url?: string;
  text?: string;
  videoUri?: string;
  language?: string;
}
export interface PendingRecipeShare extends SharedRecipeInput {
  id: string;
}
