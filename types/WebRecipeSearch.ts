/** A web discovery result, not a saved recipe or a complete recipe extraction. */
export interface WebRecipeSearchResult {
  url: string;
  title: string;
  description: string;
  source: string;
  imageUrl?: string;
}
