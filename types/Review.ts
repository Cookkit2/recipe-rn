/** Types for the recipe ratings & reviews feature. All data comes from Supabase. */

export interface ReviewPhoto {
  id: string;
  reviewId: string;
  photoUrl: string;
  position: number;
  createdAt: string;
}

export interface Review {
  id: string;
  recipeId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  helpfulCount: number;
  photos: ReviewPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithAuthor extends Review {
  /** First initial of the user's display name, e.g. "J" */
  authorInitial: string;
  /** Deterministic color hex derived from userId hash */
  authorColor: string;
}

export interface ReviewSummary {
  avgRating: number | null;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
}

export type ReviewSortOption = "newest" | "most_helpful";

export interface CreateReviewInput {
  rating: number;
  title?: string;
  body: string;
  photos: Array<{ uri: string; position: number }>;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string | null;
  body?: string;
  photos?: Array<{ uri: string; position: number }>;
}

export interface Tip {
  id: string;
  recipeId: string;
  userId: string;
  body: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TipWithAuthor extends Tip {
  authorInitial: string;
  authorColor: string;
}

export interface CreateTipInput {
  body: string;
}

export interface UpdateTipInput {
  body: string;
}
