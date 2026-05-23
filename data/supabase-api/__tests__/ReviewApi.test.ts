import { reviewApi } from "../ReviewApi";

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
  update: mockUpdate,
}));

jest.mock("~/lib/supabase/supabase-client", () => ({
  get supabase() {
    return {
      from: mockFrom,
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
    };
  },
  supabaseAvailable: true,
}));

describe("ReviewApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
      update: mockUpdate,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    });
    mockOrder.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
  });

  describe("fetchFeatureFlag", () => {
    it("returns enabled=false when flag row missing", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const result = await reviewApi.fetchFeatureFlag("ratings_and_reviews");
      expect(result).toEqual({ enabled: false });
    });

    it("returns enabled=true when flag is on", async () => {
      mockSingle.mockResolvedValue({
        data: { key: "ratings_and_reviews", enabled: true, updated_at: "2026-05-23" },
        error: null,
      });
      const result = await reviewApi.fetchFeatureFlag("ratings_and_reviews");
      expect(result.enabled).toBe(true);
    });
  });

  describe("fetchRecipeReviewSummary", () => {
    it("returns empty summary when recipe not found", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const result = await reviewApi.fetchRecipeReviewSummary("recipe-1");
      expect(result).toEqual({
        avgRating: null,
        reviewCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    });
  });
});
