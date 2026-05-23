export const reviewQueryKeys = {
  all: ["reviews"] as const,

  summary: (recipeId: string) => [...reviewQueryKeys.all, "summary", recipeId] as const,

  list: (recipeId: string, sort: string, page: number) =>
    [...reviewQueryKeys.all, "list", recipeId, sort, page] as const,

  userReview: (recipeId: string) => [...reviewQueryKeys.all, "userReview", recipeId] as const,

  detail: (reviewId: string) => [...reviewQueryKeys.all, "detail", reviewId] as const,

  tips: (recipeId: string) => [...reviewQueryKeys.all, "tips", recipeId] as const,
} as const;
