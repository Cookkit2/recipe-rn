import { reviewQueryKeys } from "../reviewQueryKeys";

describe("reviewQueryKeys", () => {
  it("generates summary key with recipeId", () => {
    expect(reviewQueryKeys.summary("recipe-123")).toEqual(["reviews", "summary", "recipe-123"]);
  });

  it("generates list key with recipeId and sort", () => {
    expect(reviewQueryKeys.list("recipe-123", "newest", 0)).toEqual([
      "reviews",
      "list",
      "recipe-123",
      "newest",
      0,
    ]);
  });

  it("generates userReview key with recipeId", () => {
    expect(reviewQueryKeys.userReview("recipe-123")).toEqual([
      "reviews",
      "userReview",
      "recipe-123",
    ]);
  });

  it("generates detail key with reviewId", () => {
    expect(reviewQueryKeys.detail("review-456")).toEqual(["reviews", "detail", "review-456"]);
  });

  it("generates tips list key with recipeId", () => {
    expect(reviewQueryKeys.tips("recipe-123")).toEqual(["reviews", "tips", "recipe-123"]);
  });
});
