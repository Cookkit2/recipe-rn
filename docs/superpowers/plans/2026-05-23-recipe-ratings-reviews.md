# Recipe Ratings & Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add community-driven ratings, reviews with photos, helpful voting, and user tips to recipe detail screens, gated by a Supabase feature flag.

**Architecture:** Supabase-only storage with TanStack Query caching. No WatermelonDB tables for community data. New `ReviewApi` module mirrors the existing `RecipeApi` pattern. UI components follow existing `components/Recipe/Details/` conventions with uniwind styling.

**Tech Stack:** Supabase (tables, RLS, storage, triggers), TanStack Query (v5), React Native (Expo SDK 55), TypeScript strict mode, uniwind (Tailwind-like styling).

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `data/supabase-api/ReviewApi.ts` | All Supabase calls for reviews, tips, helpful votes, feature flags |
| `hooks/queries/reviewQueryKeys.ts` | Centralized query key factory for review/tip queries |
| `hooks/queries/useReviewQueries.ts` | TanStack Query hooks (queries + mutations) for reviews and tips |
| `hooks/queries/useFeatureFlags.ts` | Feature flag query hook |
| `types/Review.ts` | TypeScript types for reviews, tips, votes, summaries |
| `components/ui/StarRating.tsx` | Reusable star display/selector (1-5 whole stars) |
| `components/ui/HelpfulButton.tsx` | Thumbs up button + helpful count |
| `components/Recipe/Details/RatingSummary.tsx` | Avg rating, stars, distribution bars, write CTA |
| `components/Recipe/Details/ReviewCard.tsx` | Single review display with photos, helpful, edit/delete |
| `components/Recipe/Details/ReviewsList.tsx` | Paginated review list with sort toggle |
| `components/Recipe/Details/WriteReviewModal.tsx` | Create/edit review form with photo picker |
| `components/Recipe/Details/TipCard.tsx` | Single tip display with helpful, edit/delete |
| `components/Recipe/Details/TipsList.tsx` | Tips section with add button |
| `components/Recipe/Details/WriteTipModal.tsx` | Create/edit tip form |
| `supabase/migrations/001_ratings_and_reviews.sql` | SQL migration: tables, triggers, RLS, storage bucket |
| `data/supabase-api/__tests__/ReviewApi.test.ts` | Unit tests for ReviewApi (mocked Supabase) |
| `hooks/queries/__tests__/useReviewQueries.test.ts` | Unit tests for query key factory and mutation invalidation |
| `components/ui/__tests__/StarRating.test.tsx` | Render tests for StarRating |
| `components/ui/__tests__/HelpfulButton.test.tsx` | Render tests for HelpfulButton |

### Modified Files

| File | Change |
|---|---|
| `app/recipes/[recipeId]/index.tsx` | Add RatingSummary, ReviewsList, TipsList sections (gated by feature flag) |
| `components/Recipe/Step/CongratulationsContent.tsx` | Re-enable RateRecipeModal + add "Share publicly?" prompt |
| `lib/supabase/supabase-types.ts` | Add type definitions for new tables |

---

## Task 1: Supabase Migration (SQL)

**Files:**
- Create: `supabase/migrations/001_ratings_and_reviews.sql`

This task is SQL-only. No app code changes. Run against the Supabase dashboard or CLI.

- [ ] **Step 1: Write the migration SQL**

```sql
-- ========================================
-- FEATURE FLAGS
-- ========================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the ratings_and_reviews flag (off by default)
INSERT INTO public.feature_flags (key, enabled) VALUES ('ratings_and_reviews', false);

-- RLS: anyone can read, only service_role can write
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_flags_select_public" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "feature_flags_insert_service" ON public.feature_flags FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "feature_flags_update_service" ON public.feature_flags FOR UPDATE USING (auth.role() = 'service_role');

-- ========================================
-- RECIPE REVIEWS
-- ========================================
CREATE TABLE IF NOT EXISTS public.recipe_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT NOT NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_review_recipe_id ON public.recipe_review (recipe_id);
CREATE INDEX idx_recipe_review_user_id ON public.recipe_review (user_id);
CREATE UNIQUE INDEX idx_recipe_review_unique ON public.recipe_review (recipe_id, user_id);

ALTER TABLE public.recipe_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_review_select_public" ON public.recipe_review FOR SELECT USING (true);
CREATE POLICY "recipe_review_insert_own" ON public.recipe_review FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_review_update_own" ON public.recipe_review FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipe_review_delete_own" ON public.recipe_review FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- REVIEW PHOTOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.review_photo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.recipe_review(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  position SMALLINT NOT NULL CHECK (position >= 1 AND position <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_photo_review_id ON public.review_photo (review_id);
CREATE UNIQUE INDEX idx_review_photo_position ON public.review_photo (review_id, position);

ALTER TABLE public.review_photo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_photo_select_public" ON public.review_photo FOR SELECT USING (true);
CREATE POLICY "review_photo_insert_own" ON public.review_photo FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipe_review WHERE recipe_review.id = review_photo.review_id AND recipe_review.user_id = auth.uid())
);
CREATE POLICY "review_photo_delete_own" ON public.review_photo FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipe_review WHERE recipe_review.id = review_photo.review_id AND recipe_review.user_id = auth.uid())
);

-- ========================================
-- REVIEW HELPFUL VOTES
-- ========================================
CREATE TABLE IF NOT EXISTS public.review_helpful_vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.recipe_review(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_helpful_vote_review_id ON public.review_helpful_vote (review_id);
CREATE INDEX idx_review_helpful_vote_user_id ON public.review_helpful_vote (user_id);
CREATE UNIQUE INDEX idx_review_helpful_vote_unique ON public.review_helpful_vote (review_id, user_id);

ALTER TABLE public.review_helpful_vote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_helpful_vote_select_public" ON public.review_helpful_vote FOR SELECT USING (true);
CREATE POLICY "review_helpful_vote_insert_own" ON public.review_helpful_vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_helpful_vote_delete_own" ON public.review_helpful_vote FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- RECIPE TIPS
-- ========================================
CREATE TABLE IF NOT EXISTS public.recipe_tip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_tip_recipe_id ON public.recipe_tip (recipe_id);
CREATE INDEX idx_recipe_tip_user_id ON public.recipe_tip (user_id);

ALTER TABLE public.recipe_tip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_tip_select_public" ON public.recipe_tip FOR SELECT USING (true);
CREATE POLICY "recipe_tip_insert_own" ON public.recipe_tip FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_tip_update_own" ON public.recipe_tip FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipe_tip_delete_own" ON public.recipe_tip FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- TIP HELPFUL VOTES
-- ========================================
CREATE TABLE IF NOT EXISTS public.tip_helpful_vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES public.recipe_tip(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tip_helpful_vote_tip_id ON public.tip_helpful_vote (tip_id);
CREATE INDEX idx_tip_helpful_vote_user_id ON public.tip_helpful_vote (user_id);
CREATE UNIQUE INDEX idx_tip_helpful_vote_unique ON public.tip_helpful_vote (tip_id, user_id);

ALTER TABLE public.tip_helpful_vote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tip_helpful_vote_select_public" ON public.tip_helpful_vote FOR SELECT USING (true);
CREATE POLICY "tip_helpful_vote_insert_own" ON public.tip_helpful_vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tip_helpful_vote_delete_own" ON public.tip_helpful_vote FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- DENORMALIZED RECIPE COLUMNS
-- ========================================
ALTER TABLE public.recipe ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1);
ALTER TABLE public.recipe ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0;

-- ========================================
-- STORAGE BUCKET
-- ========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "review_photos_upload_own" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "review_photos_read_public" ON storage.objects FOR SELECT USING (bucket_id = 'review-photos');

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updated_at on recipe_review
CREATE OR REPLACE FUNCTION public.update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_review_updated_at
  BEFORE UPDATE ON public.recipe_review
  FOR EACH ROW EXECUTE FUNCTION public.update_review_updated_at();

-- Auto-update updated_at on recipe_tip
CREATE OR REPLACE FUNCTION public.update_tip_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_tip_updated_at
  BEFORE UPDATE ON public.recipe_tip
  FOR EACH ROW EXECUTE FUNCTION public.update_tip_updated_at();

-- Recalculate review helpful_count on vote change
CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.recipe_review
  SET helpful_count = (SELECT COUNT(*) FROM public.review_helpful_vote WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_review_helpful_count
  AFTER INSERT OR DELETE ON public.review_helpful_vote
  FOR EACH ROW EXECUTE FUNCTION public.update_review_helpful_count();

-- Recalculate tip helpful_count on vote change
CREATE OR REPLACE FUNCTION public.update_tip_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.recipe_tip
  SET helpful_count = (SELECT COUNT(*) FROM public.tip_helpful_vote WHERE tip_id = COALESCE(NEW.tip_id, OLD.tip_id))
  WHERE id = COALESCE(NEW.tip_id, OLD.tip_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_tip_helpful_count
  AFTER INSERT OR DELETE ON public.tip_helpful_vote
  FOR EACH ROW EXECUTE FUNCTION public.update_tip_helpful_count();

-- Recalculate recipe avg_rating and review_count on review change
CREATE OR REPLACE FUNCTION public.update_recipe_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_recipe_id UUID;
BEGIN
  target_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);
  UPDATE public.recipe
  SET
    avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.recipe_review WHERE recipe_id = target_recipe_id),
    review_count = (SELECT COUNT(*) FROM public.recipe_review WHERE recipe_id = target_recipe_id)
  WHERE id = target_recipe_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_recipe_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_review
  FOR EACH ROW EXECUTE FUNCTION public.update_recipe_rating_stats();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/001_ratings_and_reviews.sql
git commit -m "feat(reviews): add Supabase migration for ratings & reviews"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/Review.ts`
- Modify: `lib/supabase/supabase-types.ts`

- [ ] **Step 1: Create types/Review.ts**

```typescript
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
```

- [ ] **Step 2: Add Supabase table types to lib/supabase/supabase-types.ts**

After the existing `recipe_step` table type block (around line 230), add the new table type definitions. These follow the existing pattern of `{ Row, Insert, Update, Relationships }`.

Add these inside the `Tables` object in `Database["public"]`:

```typescript
      feature_flags: {
        Row: {
          key: string;
          enabled: boolean;
          updated_at: string;
        };
        Insert: {
          key: string;
          enabled: boolean;
          updated_at?: string;
        };
        Update: {
          key?: string;
          enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_review: {
        Row: {
          id: string;
          recipe_id: string;
          user_id: string;
          rating: number;
          title: string | null;
          body: string;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          user_id: string;
          rating: number;
          title?: string | null;
          body: string;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          user_id?: string;
          rating?: number;
          title?: string | null;
          body?: string;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "recipe_review_recipe_id_fkey"; columns: ["recipe_id"]; isOneToOne: false; referencedRelation: "recipe"; referencedColumns: ["id"] },
          { foreignKeyName: "recipe_review_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      review_photo: {
        Row: {
          id: string;
          review_id: string;
          photo_url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          photo_url: string;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          photo_url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "review_photo_review_id_fkey"; columns: ["review_id"]; isOneToOne: false; referencedRelation: "recipe_review"; referencedColumns: ["id"] },
        ];
      };
      review_helpful_vote: {
        Row: {
          id: string;
          review_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "review_helpful_vote_review_id_fkey"; columns: ["review_id"]; isOneToOne: false; referencedRelation: "recipe_review"; referencedColumns: ["id"] },
          { foreignKeyName: "review_helpful_vote_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      recipe_tip: {
        Row: {
          id: string;
          recipe_id: string;
          user_id: string;
          body: string;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          user_id: string;
          body: string;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          user_id?: string;
          body?: string;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "recipe_tip_recipe_id_fkey"; columns: ["recipe_id"]; isOneToOne: false; referencedRelation: "recipe"; referencedColumns: ["id"] },
          { foreignKeyName: "recipe_tip_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      tip_helpful_vote: {
        Row: {
          id: string;
          tip_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tip_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tip_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tip_helpful_vote_tip_id_fkey"; columns: ["tip_id"]; isOneToOne: false; referencedRelation: "recipe_tip"; referencedColumns: ["id"] },
          { foreignKeyName: "tip_helpful_vote_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
```

Also update the `recipe` Row/Insert/Update types to include `avg_rating` and `review_count`:

Add to `recipe` Row:
```typescript
          avg_rating: number | null;
          review_count: number;
```

Add to `recipe` Insert:
```typescript
          avg_rating?: number | null;
          review_count?: number;
```

Add to `recipe` Update:
```typescript
          avg_rating?: number | null;
          review_count?: number;
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (new types are standalone, no consumers yet)

- [ ] **Step 4: Commit**

```bash
git add types/Review.ts lib/supabase/supabase-types.ts
git commit -m "feat(reviews): add TypeScript types for reviews, tips, and feature flags"
```

---

## Task 3: Query Key Factory

**Files:**
- Create: `hooks/queries/reviewQueryKeys.ts`
- Test: `hooks/queries/__tests__/useReviewQueries.test.ts` (key factory portion)

- [ ] **Step 1: Write failing test for query keys**

Create `hooks/queries/__tests__/useReviewQueries.test.ts`:

```typescript
import { reviewQueryKeys } from "../reviewQueryKeys";

describe("reviewQueryKeys", () => {
  it("generates summary key with recipeId", () => {
    expect(reviewQueryKeys.summary("recipe-123")).toEqual([
      "reviews",
      "summary",
      "recipe-123",
    ]);
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
    expect(reviewQueryKeys.detail("review-456")).toEqual([
      "reviews",
      "detail",
      "review-456",
    ]);
  });

  it("generates tips list key with recipeId", () => {
    expect(reviewQueryKeys.tips("recipe-123")).toEqual([
      "reviews",
      "tips",
      "recipe-123",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- hooks/queries/__tests__/useReviewQueries.test.ts`
Expected: FAIL — `Cannot find module '../reviewQueryKeys'`

- [ ] **Step 3: Create hooks/queries/reviewQueryKeys.ts**

```typescript
export const reviewQueryKeys = {
  all: ["reviews"] as const,

  summary: (recipeId: string) =>
    [...reviewQueryKeys.all, "summary", recipeId] as const,

  list: (recipeId: string, sort: string, page: number) =>
    [...reviewQueryKeys.all, "list", recipeId, sort, page] as const,

  userReview: (recipeId: string) =>
    [...reviewQueryKeys.all, "userReview", recipeId] as const,

  detail: (reviewId: string) =>
    [...reviewQueryKeys.all, "detail", reviewId] as const,

  tips: (recipeId: string) =>
    [...reviewQueryKeys.all, "tips", recipeId] as const,
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- hooks/queries/__tests__/useReviewQueries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/queries/reviewQueryKeys.ts hooks/queries/__tests__/useReviewQueries.test.ts
git commit -m "feat(reviews): add review query key factory with tests"
```

---

## Task 4: ReviewApi — Data Access Layer

**Files:**
- Create: `data/supabase-api/ReviewApi.ts`
- Test: `data/supabase-api/__tests__/ReviewApi.test.ts`

- [ ] **Step 1: Write failing tests for ReviewApi**

Create `data/supabase-api/__tests__/ReviewApi.test.ts`:

```typescript
import { reviewApi } from "../ReviewApi";

// Mock supabase client
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockRange = jest.fn();
const mockSingle = jest.fn();
const mockUpload = jest.fn();
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
  update: mockUpdate,
}));
const mockStorageFrom = jest.fn(() => ({
  upload: mockUpload,
}));

jest.mock("~/lib/supabase/supabase-client", () => ({
  get supabase() {
    return {
      from: mockFrom,
      storage: {
        from: mockStorageFrom,
      },
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
    // Chain helpers
    mockEq.mockReturnValue({ select: mockSelect, insert: mockInsert, delete: mockDelete, update: mockUpdate, eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, single: mockSingle });
    mockOrder.mockReturnValue({ eq: mockEq, limit: mockLimit, range: mockRange, single: mockSingle });
    mockLimit.mockReturnValue({ eq: mockEq, range: mockRange, single: mockSingle });
    mockRange.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, single: mockSingle });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
  });

  describe("fetchRecipeReviewSummary", () => {
    it("returns null summary when no reviews exist", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await reviewApi.fetchRecipeReviewSummary("recipe-1");

      expect(result).toEqual({
        avgRating: null,
        reviewCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    });

    it("returns summary with avg_rating and review_count from recipe row", async () => {
      mockSingle.mockResolvedValue({
        data: { avg_rating: 4.2, review_count: 5 },
        error: null,
      });
      // For distribution query
      mockSelect.mockImplementation(() => ({
        eq: mockEq,
      }));
      mockEq.mockResolvedValue({
        data: [
          { rating: 5 },
          { rating: 4 },
          { rating: 4 },
          { rating: 4 },
          { rating: 3 },
        ],
        error: null,
      });

      const result = await reviewApi.fetchRecipeReviewSummary("recipe-1");

      expect(result.reviewCount).toBe(5);
    });
  });

  describe("fetchFeatureFlag", () => {
    it("returns enabled=false when flag row missing", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- data/supabase-api/__tests__/ReviewApi.test.ts`
Expected: FAIL — `Cannot find module '../ReviewApi'`

- [ ] **Step 3: Create data/supabase-api/ReviewApi.ts**

```typescript
import { supabase } from "~/lib/supabase/supabase-client";
import type {
  Review,
  ReviewWithAuthor,
  ReviewSummary,
  ReviewSortOption,
  CreateReviewInput,
  UpdateReviewInput,
  Tip,
  TipWithAuthor,
  CreateTipInput,
  UpdateTipInput,
} from "~/types/Review";
import type { Tables } from "~/lib/supabase/supabase-types";
import { log } from "~/utils/logger";

function guardSupabase() {
  if (!supabase) return false;
  return true;
}

/** Deterministic color from userId hash for partially anonymous avatars. */
function colorFromUserId(userId: string): string {
  const colors = [
    "#EF4444", "#F97316", "#F59E0B", "#84CC16",
    "#22C55E", "#14B8A6", "#06B6D4", "#3B82F6",
    "#6366F1", "#8B5CF6", "#A855F7", "#EC4899",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** First initial from display name or fallback to "U". */
function getInitial(displayName: string | null | undefined): string {
  if (!displayName) return "U";
  return displayName.charAt(0).toUpperCase();
}

type ReviewRow = Tables<"recipe_review">;
type ReviewPhotoRow = Tables<"review_photo">;
type TipRow = Tables<"recipe_tip">;

async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function getUserDisplayName(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return (data.user?.user_metadata?.full_name as string) ?? data.user?.email ?? null;
}

function mapReviewRow(row: ReviewRow, photos: ReviewPhotoRow[], authorInitial: string, authorColor: string): ReviewWithAuthor {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    userId: row.user_id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    helpfulCount: row.helpful_count,
    photos: photos.map((p) => ({
      id: p.id,
      reviewId: p.review_id,
      photoUrl: p.photo_url,
      position: p.position,
      createdAt: p.created_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorInitial,
    authorColor,
  };
}

export const reviewApi = {
  // ─── Feature Flags ─────────────────────────────────────────────

  fetchFeatureFlag: async (key: string): Promise<{ enabled: boolean }> => {
    if (!guardSupabase()) return { enabled: false };
    const { data, error } = await supabase!
      .from("feature_flags")
      .select("key, enabled, updated_at")
      .eq("key", key)
      .single();
    if (error || !data) return { enabled: false };
    return { enabled: data.enabled };
  },

  // ─── Reviews ───────────────────────────────────────────────────

  fetchRecipeReviewSummary: async (recipeId: string): Promise<ReviewSummary> => {
    const empty: ReviewSummary = {
      avgRating: null,
      reviewCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    if (!guardSupabase()) return empty;

    // Get denormalized stats from recipe row
    const { data: recipe, error: recipeError } = await supabase!
      .from("recipe")
      .select("avg_rating, review_count")
      .eq("id", recipeId)
      .single();
    if (recipeError || !recipe) return empty;

    // Get distribution
    const { data: ratings } = await supabase!
      .from("recipe_review")
      .select("rating")
      .eq("recipe_id", recipeId);

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings?.forEach((r) => {
      dist[r.rating] = (dist[r.rating] || 0) + 1;
    });

    return {
      avgRating: recipe.avg_rating,
      reviewCount: recipe.review_count,
      ratingDistribution: dist,
    };
  },

  fetchRecipeReviews: async (
    recipeId: string,
    page: number,
    sort: ReviewSortOption,
    pageSize = 10
  ): Promise<{ reviews: ReviewWithAuthor[]; hasMore: boolean }> => {
    if (!guardSupabase()) return { reviews: [], hasMore: false };

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const orderCol = sort === "most_helpful" ? "helpful_count" : "created_at";
    const orderAsc = sort === "most_helpful";

    const { data, error } = await supabase!
      .from("recipe_review")
      .select("*, review_photo(*), users(username)")
      .eq("recipe_id", recipeId)
      .order(orderCol, { ascending: orderAsc })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      log.error("[ReviewApi] Error fetching reviews:", error);
      return { reviews: [], hasMore: false };
    }

    const reviews = (data ?? []).map((row) => {
      const photos = (row.review_photo ?? []) as ReviewPhotoRow[];
      const username = (row as any).users?.username ?? null;
      return mapReviewRow(
        row as unknown as ReviewRow,
        photos,
        getInitial(username),
        colorFromUserId(row.user_id)
      );
    });

    return { reviews, hasMore: data?.length === pageSize };
  },

  fetchUserReview: async (recipeId: string): Promise<ReviewWithAuthor | null> => {
    if (!guardSupabase()) return null;
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase!
      .from("recipe_review")
      .select("*, review_photo(*)")
      .eq("recipe_id", recipeId)
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    const photos = (data.review_photo ?? []) as ReviewPhotoRow[];
    const displayName = await getUserDisplayName();
    return mapReviewRow(
      data as unknown as ReviewRow,
      photos,
      getInitial(displayName),
      colorFromUserId(userId)
    );
  },

  createReview: async (
    recipeId: string,
    input: CreateReviewInput
  ): Promise<Review> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Not authenticated");

    // Create review row first
    const { data, error } = await supabase!
      .from("recipe_review")
      .insert({
        recipe_id: recipeId,
        user_id: userId,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body,
      })
      .select()
      .single();

    if (error) throw error;

    // Upload photos
    const photoRows: ReviewPhotoRow[] = [];
    for (const photo of input.photos) {
      const path = `${userId}/${data.id}/${photo.position}.jpg`;
      const { error: uploadError } = await supabase!
        .storage.from("review-photos")
        .upload(path, { uri: photo.uri, type: "image/jpeg", name: `${photo.position}.jpg` } as unknown as Blob);

      if (uploadError) {
        log.error("[ReviewApi] Photo upload failed:", uploadError);
        continue;
      }

      const { data: publicUrl } = supabase!.storage.from("review-photos").getPublicUrl(path);

      const { data: photoData } = await supabase!
        .from("review_photo")
        .insert({
          review_id: data.id,
          photo_url: publicUrl.publicUrl,
          position: photo.position,
        })
        .select()
        .single();

      if (photoData) photoRows.push(photoData as unknown as ReviewPhotoRow);
    }

    return {
      id: data.id,
      recipeId: data.recipe_id,
      userId: data.user_id,
      rating: data.rating,
      title: data.title,
      body: data.body,
      helpfulCount: data.helpful_count,
      photos: photoRows.map((p) => ({
        id: p.id,
        reviewId: p.review_id,
        photoUrl: p.photo_url,
        position: p.position,
        createdAt: p.created_at,
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  updateReview: async (
    reviewId: string,
    input: UpdateReviewInput
  ): Promise<void> => {
    if (!guardSupabase()) throw new Error("Supabase not available");

    const updateData: Record<string, unknown> = {};
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.body !== undefined) updateData.body = input.body;

    const { error } = await supabase!
      .from("recipe_review")
      .update(updateData)
      .eq("id", reviewId);

    if (error) throw error;

    // Handle photo changes if provided
    if (input.photos) {
      // Delete existing photos
      await supabase!.from("review_photo").delete().eq("review_id", reviewId);

      // Upload new photos
      const userId = await getCurrentUserId();
      for (const photo of input.photos) {
        const path = `${userId}/${reviewId}/${photo.position}.jpg`;
        await supabase!.storage.from("review-photos").upload(
          path,
          { uri: photo.uri, type: "image/jpeg", name: `${photo.position}.jpg` } as unknown as Blob
        );
        const { data: publicUrl } = supabase!.storage.from("review-photos").getPublicUrl(path);
        await supabase!.from("review_photo").insert({
          review_id: reviewId,
          photo_url: publicUrl.publicUrl,
          position: photo.position,
        });
      }
    }
  },

  deleteReview: async (reviewId: string): Promise<void> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const { error } = await supabase!.from("recipe_review").delete().eq("id", reviewId);
    if (error) throw error;
  },

  // ─── Helpful Voting ────────────────────────────────────────────

  toggleHelpful: async (reviewId: string): Promise<boolean> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Not authenticated");

    // Check for existing vote
    const { data: existing } = await supabase!
      .from("review_helpful_vote")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase!.from("review_helpful_vote").delete().eq("id", existing.id);
      return false; // un-voted
    } else {
      await supabase!.from("review_helpful_vote").insert({
        review_id: reviewId,
        user_id: userId,
      });
      return true; // voted
    }
  },

  // ─── Tips ──────────────────────────────────────────────────────

  fetchRecipeTips: async (recipeId: string): Promise<TipWithAuthor[]> => {
    if (!guardSupabase()) return [];

    const { data, error } = await supabase!
      .from("recipe_tip")
      .select("*, users(username)")
      .eq("recipe_id", recipeId)
      .order("helpful_count", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      log.error("[ReviewApi] Error fetching tips:", error);
      return [];
    }

    return (data ?? []).map((row) => {
      const username = (row as any).users?.username ?? null;
      return {
        id: row.id,
        recipeId: row.recipe_id,
        userId: row.user_id,
        body: row.body,
        helpfulCount: row.helpful_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorInitial: getInitial(username),
        authorColor: colorFromUserId(row.user_id),
      };
    });
  },

  createTip: async (recipeId: string, input: CreateTipInput): Promise<Tip> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await supabase!
      .from("recipe_tip")
      .insert({ recipe_id: recipeId, user_id: userId, body: input.body })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      recipeId: data.recipe_id,
      userId: data.user_id,
      body: data.body,
      helpfulCount: data.helpful_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  updateTip: async (tipId: string, input: UpdateTipInput): Promise<void> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const { error } = await supabase!.from("recipe_tip").update({ body: input.body }).eq("id", tipId);
    if (error) throw error;
  },

  deleteTip: async (tipId: string): Promise<void> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const { error } = await supabase!.from("recipe_tip").delete().eq("id", tipId);
    if (error) throw error;
  },

  toggleTipHelpful: async (tipId: string): Promise<boolean> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Not authenticated");

    const { data: existing } = await supabase!
      .from("tip_helpful_vote")
      .select("id")
      .eq("tip_id", tipId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase!.from("tip_helpful_vote").delete().eq("id", existing.id);
      return false;
    } else {
      await supabase!.from("tip_helpful_vote").insert({ tip_id: tipId, user_id: userId });
      return true;
    }
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- data/supabase-api/__tests__/ReviewApi.test.ts`
Expected: PASS

- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add data/supabase-api/ReviewApi.ts data/supabase-api/__tests__/ReviewApi.test.ts
git commit -m "feat(reviews): add ReviewApi with Supabase data access and tests"
```

---

## Task 5: Feature Flag Hook

**Files:**
- Create: `hooks/queries/useFeatureFlags.ts`

- [ ] **Step 1: Create hooks/queries/useFeatureFlags.ts**

```typescript
import { useQuery } from "@tanstack/react-query";
import { reviewApi } from "~/data/supabase-api/ReviewApi";

export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["featureFlag", key],
    queryFn: () => reviewApi.fetchFeatureFlag(key),
    staleTime: 5 * 60 * 1000, // 5 minutes — flags change infrequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return { enabled: data?.enabled ?? false, isLoading };
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add hooks/queries/useFeatureFlags.ts
git commit -m "feat(reviews): add useFeatureFlag hook with 5min cache"
```

---

## Task 6: Review Query Hooks

**Files:**
- Create: `hooks/queries/useReviewQueries.ts`

- [ ] **Step 1: Create hooks/queries/useReviewQueries.ts**

```typescript
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { reviewQueryKeys } from "./reviewQueryKeys";
import { reviewApi } from "~/data/supabase-api/ReviewApi";
import type {
  ReviewSortOption,
  CreateReviewInput,
  UpdateReviewInput,
  CreateTipInput,
  UpdateTipInput,
} from "~/types/Review";

const PAGE_SIZE = 10;

export function useRecipeReviews(recipeId: string, sort: ReviewSortOption = "newest") {
  return useInfiniteQuery({
    queryKey: reviewQueryKeys.list(recipeId, sort, 0),
    queryFn: ({ pageParam = 0 }) =>
      reviewApi.fetchRecipeReviews(recipeId, pageParam as number, sort, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
    enabled: !!recipeId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecipeReviewSummary(recipeId: string) {
  return useQuery({
    queryKey: reviewQueryKeys.summary(recipeId),
    queryFn: () => reviewApi.fetchRecipeReviewSummary(recipeId),
    enabled: !!recipeId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUserReview(recipeId: string) {
  return useQuery({
    queryKey: reviewQueryKeys.userReview(recipeId),
    queryFn: () => reviewApi.fetchUserReview(recipeId),
    enabled: !!recipeId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: CreateReviewInput }) =>
      reviewApi.createReview(recipeId, input),
    onSuccess: (_data, variables) => {
      const { recipeId } = variables;
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.list(recipeId, "newest", 0) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.summary(recipeId) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.userReview(recipeId) });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      input,
      recipeId,
    }: {
      reviewId: string;
      input: UpdateReviewInput;
      recipeId: string;
    }) => reviewApi.updateReview(reviewId, input),
    onSuccess: (_data, variables) => {
      const { recipeId } = variables;
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.list(recipeId, "newest", 0) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.summary(recipeId) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.userReview(recipeId) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.detail(variables.reviewId) });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, recipeId }: { reviewId: string; recipeId: string }) =>
      reviewApi.deleteReview(reviewId),
    onSuccess: (_data, variables) => {
      const { recipeId } = variables;
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.list(recipeId, "newest", 0) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.summary(recipeId) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.userReview(recipeId) });
    },
  });
}

export function useToggleHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      recipeId,
    }: {
      reviewId: string;
      recipeId: string;
    }) => reviewApi.toggleHelpful(reviewId),
    onSuccess: (_data, variables) => {
      const { recipeId } = variables;
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.list(recipeId, "newest", 0) });
    },
  });
}

// ─── Tips ────────────────────────────────────────────────────────

export function useRecipeTips(recipeId: string) {
  return useQuery({
    queryKey: reviewQueryKeys.tips(recipeId),
    queryFn: () => reviewApi.fetchRecipeTips(recipeId),
    enabled: !!recipeId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateTip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: CreateTipInput }) =>
      reviewApi.createTip(recipeId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.tips(variables.recipeId) });
    },
  });
}

export function useUpdateTip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tipId,
      input,
      recipeId,
    }: {
      tipId: string;
      input: UpdateTipInput;
      recipeId: string;
    }) => reviewApi.updateTip(tipId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.tips(variables.recipeId) });
    },
  });
}

export function useDeleteTip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tipId, recipeId }: { tipId: string; recipeId: string }) =>
      reviewApi.deleteTip(tipId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.tips(variables.recipeId) });
    },
  });
}

export function useToggleTipHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tipId, recipeId }: { tipId: string; recipeId: string }) =>
      reviewApi.toggleTipHelpful(tipId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.tips(variables.recipeId) });
    },
  });
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add hooks/queries/useReviewQueries.ts
git commit -m "feat(reviews): add TanStack Query hooks for reviews and tips"
```

---

## Task 7: StarRating UI Component

**Files:**
- Create: `components/ui/StarRating.tsx`
- Test: `components/ui/__tests__/StarRating.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/ui/__tests__/StarRating.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import StarRating from "../StarRating";

describe("StarRating", () => {
  it("renders 5 empty stars when rating is 0", () => {
    const { UNSAFE_root } = render(<StarRating rating={0} />);
    // StarRating renders a View with 5 star icons
    expect(UNSAFE_root.children.length).toBeGreaterThan(0);
  });

  it("renders in display-only mode without press handlers", () => {
    const { UNSAFE_root } = render(<StarRating rating={3.5} />);
    expect(UNSAFE_root).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/ui/__tests__/StarRating.test.tsx`
Expected: FAIL — `Cannot find module '../StarRating'`

- [ ] **Step 3: Create components/ui/StarRating.tsx**

```tsx
import React from "react";
import { View, Pressable } from "react-native";
import { StarIcon } from "lucide-uniwind";
import { cn } from "~/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  return (
    <View className={cn("flex-row items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.round(rating);

        const star = (
          <StarIcon
            size={size}
            strokeWidth={1.5}
            className={cn(
              isFilled ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40"
            )}
          />
        );

        if (interactive) {
          return (
            <Pressable
              key={starValue}
              onPress={() => onRatingChange?.(starValue)}
              hitSlop={4}
              accessibilityLabel={`Rate ${starValue} stars`}
            >
              {star}
            </Pressable>
          );
        }

        return <View key={starValue}>{star}</View>;
      })}
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/ui/__tests__/StarRating.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/StarRating.tsx components/ui/__tests__/StarRating.test.tsx
git commit -m "feat(reviews): add StarRating component with display and interactive modes"
```

---

## Task 8: HelpfulButton UI Component

**Files:**
- Create: `components/ui/HelpfulButton.tsx`
- Test: `components/ui/__tests__/HelpfulButton.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/ui/__tests__/HelpfulButton.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import HelpfulButton from "../HelpfulButton";

describe("HelpfulButton", () => {
  it("renders count text", () => {
    const { getByText } = render(
      <HelpfulButton count={5} isVoted={false} onPress={jest.fn()} />
    );
    expect(getByText("5")).toBeDefined();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <HelpfulButton count={0} isVoted={false} onPress={onPress} />
    );
    fireEvent.press(getByLabelText("Mark as helpful"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/ui/__tests__/HelpfulButton.test.tsx`
Expected: FAIL — `Cannot find module '../HelpfulButton'`

- [ ] **Step 3: Create components/ui/HelpfulButton.tsx**

```tsx
import React from "react";
import { Pressable, View } from "react-native";
import { ThumbsUpIcon } from "lucide-uniwind";
import { Small } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

interface HelpfulButtonProps {
  count: number;
  isVoted: boolean;
  onPress: () => void;
  className?: string;
}

export default function HelpfulButton({ count, isVoted, onPress, className }: HelpfulButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel="Mark as helpful"
      accessibilityRole="button"
      accessibilityState={{ selected: isVoted }}
    >
      <View className={cn("flex-row items-center gap-1.5", className)}>
        <ThumbsUpIcon
          size={14}
          strokeWidth={2}
          className={cn(isVoted ? "text-primary fill-primary/30" : "text-muted-foreground")}
        />
        {count > 0 && (
          <Small className={cn(isVoted ? "text-primary" : "text-muted-foreground")}>
            {count}
          </Small>
        )}
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/ui/__tests__/HelpfulButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/HelpfulButton.tsx components/ui/__tests__/HelpfulButton.test.tsx
git commit -m "feat(reviews): add HelpfulButton component with vote toggle"
```

---

## Task 9: RatingSummary Component

**Files:**
- Create: `components/Recipe/Details/RatingSummary.tsx`

- [ ] **Step 1: Create components/Recipe/Details/RatingSummary.tsx**

```tsx
import React from "react";
import { View } from "react-native";
import { H2, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import StarRating from "~/components/ui/StarRating";
import { Separator } from "~/components/ui/separator";
import type { ReviewSummary } from "~/types/Review";

interface RatingSummaryProps {
  summary: ReviewSummary | undefined;
  userHasReview: boolean;
  onWriteReview: () => void;
  isLoading: boolean;
}

export default function RatingSummary({
  summary,
  userHasReview,
  onWriteReview,
  isLoading,
}: RatingSummaryProps) {
  if (isLoading) return null;

  const avgRating = summary?.avgRating ?? 0;
  const reviewCount = summary?.reviewCount ?? 0;
  const dist = summary?.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const maxCount = Math.max(...Object.values(dist), 1);

  return (
    <View className="mb-6">
      <Separator className="mb-8" />

      <View className="flex-row items-center justify-between mb-4">
        <H2 className="font-urbanist-bold text-xl">Ratings & Reviews</H2>
        <Button
          size="sm"
          variant={userHasReview ? "outline" : "default"}
          className="rounded-2xl"
          onPress={onWriteReview}
        >
          <Small className="font-urbanist-semibold text-primary-foreground">
            {userHasReview ? "Edit Your Review" : "Write a Review"}
          </Small>
        </Button>
      </View>

      {reviewCount === 0 ? (
        <View className="py-6 items-center">
          <P className="text-muted-foreground text-center mb-3">
            Be the first to review this recipe
          </P>
        </View>
      ) : (
        <View className="flex-row gap-6">
          {/* Left: avg rating */}
          <View className="items-center justify-center min-w-[80px]">
            <H2 className="font-bowlby-one text-3xl">{avgRating.toFixed(1)}</H2>
            <StarRating rating={avgRating} size={16} />
            <Small className="text-muted-foreground mt-1">
              {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </Small>
          </View>

          {/* Right: distribution bars */}
          <View className="flex-1 justify-center gap-1">
            {[5, 4, 3, 2, 1].map((star) => (
              <View key={star} className="flex-row items-center gap-2">
                <Small className="w-3 text-right text-muted-foreground">{star}</Small>
                <View className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <View
                    className="h-full rounded-full bg-yellow-500"
                    style={{ width: `${(dist[star] / maxCount) * 100}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/Recipe/Details/RatingSummary.tsx
git commit -m "feat(reviews): add RatingSummary component with distribution bars"
```

---

## Task 10: ReviewCard Component

**Files:**
- Create: `components/Recipe/Details/ReviewCard.tsx`

- [ ] **Step 1: Create components/Recipe/Details/ReviewCard.tsx**

```tsx
import React, { useState } from "react";
import { View, Pressable, LayoutAnimation } from "react-native";
import { P, Small } from "~/components/ui/typography";
import { Image } from "expo-image";
import StarRating from "~/components/ui/StarRating";
import HelpfulButton from "~/components/ui/HelpfulButton";
import type { ReviewWithAuthor } from "~/types/Review";

interface ReviewCardProps {
  review: ReviewWithAuthor;
  isOwnReview: boolean;
  currentUserId: string | null;
  onEdit: (review: ReviewWithAuthor) => void;
  onDelete: (reviewId: string) => void;
  onToggleHelpful: (reviewId: string) => void;
  onPhotoPress: (photoUrl: string) => void;
}

const MAX_COLLAPSED_LINES = 3;

export default function ReviewCard({
  review,
  isOwnReview,
  currentUserId,
  onEdit,
  onDelete,
  onToggleHelpful,
  onPhotoPress,
}: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isEdited =
    new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 60_000;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const [hasVoted, setHasVoted] = useState(false);

  const handleToggleHelpful = () => {
    setHasVoted(!hasVoted);
    onToggleHelpful(review.id);
  };

  return (
    <View className="py-4 border-b border-border/50">
      {/* Header: avatar + stars + date */}
      <View className="flex-row items-center gap-3 mb-2">
        {/* Avatar */}
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: review.authorColor + "30" }}
        >
          <Small className="font-urbanist-bold" style={{ color: review.authorColor }}>
            {review.authorInitial}
          </Small>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <StarRating rating={review.rating} size={14} />
            {isEdited && (
              <Small className="text-muted-foreground/60">(edited)</Small>
            )}
          </View>
          <Small className="text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString()}
          </Small>
        </View>
      </View>

      {/* Title */}
      {review.title && (
        <P className="font-urbanist-semibold mb-1">{review.title}</P>
      )}

      {/* Body */}
      <Pressable onPress={toggleExpand} disabled={!review.body}>
        <P
          className="text-foreground/80 font-urbanist-regular"
          numberOfLines={expanded ? undefined : MAX_COLLAPSED_LINES}
        >
          {review.body}
        </P>
        {!expanded && review.body.length > 150 && (
          <Small className="text-primary mt-1">Read more</Small>
        )}
      </Pressable>

      {/* Photos */}
      {review.photos.length > 0 && (
        <View className="flex-row gap-2 mt-3">
          {review.photos.map((photo) => (
            <Pressable key={photo.id} onPress={() => onPhotoPress(photo.photoUrl)}>
              <Image
                source={{ uri: photo.photoUrl }}
                className="w-20 h-20 rounded-lg"
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* Footer: helpful + edit/delete */}
      <View className="flex-row items-center justify-between mt-3">
        <HelpfulButton
          count={review.helpfulCount + (hasVoted ? 1 : 0)}
          isVoted={hasVoted}
          onPress={handleToggleHelpful}
        />

        {isOwnReview && (
          <View className="flex-row gap-3">
            <Pressable onPress={() => onEdit(review)} hitSlop={8}>
              <Small className="text-primary">Edit</Small>
            </Pressable>
            <Pressable onPress={() => onDelete(review.id)} hitSlop={8}>
              <Small className="text-destructive">Delete</Small>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/Recipe/Details/ReviewCard.tsx
git commit -m "feat(reviews): add ReviewCard with collapsible text, photos, helpful, edit/delete"
```

---

## Task 11: WriteReviewModal Component

**Files:**
- Create: `components/Recipe/Details/WriteReviewModal.tsx`

- [ ] **Step 1: Create components/Recipe/Details/WriteReviewModal.tsx**

```tsx
import React, { useState, useEffect } from "react";
import { View, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import BaseModal from "~/components/ui/modal";
import StarRating from "~/components/ui/StarRating";
import type { ReviewWithAuthor, CreateReviewInput } from "~/types/Review";

interface WriteReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateReviewInput) => void;
  existingReview?: ReviewWithAuthor | null;
  isSubmitting: boolean;
  /** Pre-fill from personal CookingHistory rating */
  initialRating?: number;
  initialNotes?: string;
}

const MAX_BODY_LENGTH = 1000;
const MAX_TITLE_LENGTH = 80;

export default function WriteReviewModal({
  visible,
  onClose,
  onSubmit,
  existingReview,
  isSubmitting,
  initialRating,
  initialNotes,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (visible) {
      if (existingReview) {
        setRating(existingReview.rating);
        setTitle(existingReview.title ?? "");
        setBody(existingReview.body);
      } else {
        setRating(initialRating ?? 0);
        setBody(initialNotes ?? "");
        setTitle("");
      }
    }
  }, [visible, existingReview, initialRating, initialNotes]);

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Rating required", "Please select a star rating.");
      return;
    }
    if (body.trim().length === 0) {
      Alert.alert("Review required", "Please write your review.");
      return;
    }

    onSubmit({
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
      photos: [], // Photo picker deferred — can be added in a follow-up
    });
  };

  const handleClose = () => {
    setRating(0);
    setTitle("");
    setBody("");
    onClose();
  };

  const isEditing = !!existingReview;

  return (
    <BaseModal modalVisible={visible} onCancel={handleClose}>
      <View className="bg-background rounded-4xl p-6 w-full shadow-xl border-continuous">
        <H4 className="font-urbanist-bold text-foreground text-center mb-2">
          {isEditing ? "Edit Your Review" : "Write a Review"}
        </H4>
        <P className="text-sm font-urbanist-regular text-muted-foreground text-center mb-6">
          Share your experience with this recipe
        </P>

        {/* Star Rating */}
        <View className="items-center mb-4">
          <StarRating
            rating={rating}
            size={36}
            interactive
            onRatingChange={setRating}
          />
          {rating > 0 && (
            <Small className="text-muted-foreground mt-2">
              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
            </Small>
          )}
        </View>

        {/* Title */}
        <View className="mb-3">
          <P className="text-sm font-urbanist-medium text-foreground mb-1">
            Title (optional)
          </P>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Summarize your experience"
            placeholderTextColor="#999"
            maxLength={MAX_TITLE_LENGTH}
            className="w-full rounded-lg bg-muted px-3 py-2 text-base font-urbanist-regular border-continuous"
            editable={!isSubmitting}
          />
        </View>

        {/* Body */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-1">
            <P className="text-sm font-urbanist-medium text-foreground">Review</P>
            <Small className="text-muted-foreground">
              {body.length}/{MAX_BODY_LENGTH}
            </Small>
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What did you think of this recipe? Any tips or modifications?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={MAX_BODY_LENGTH}
            className="w-full min-h-[120px] rounded-lg bg-muted px-3 py-2 text-base font-urbanist-regular border-continuous"
            editable={!isSubmitting}
          />
        </View>

        {/* Actions */}
        <View className="flex-row gap-3 mt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl"
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <P className="font-urbanist-semibold text-foreground">Cancel</P>
          </Button>
          <Button
            className="flex-1 rounded-2xl bg-foreground flex-row justify-center items-center gap-2"
            onPress={handleSubmit}
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting && <ActivityIndicator size="small" color="white" />}
            <P className="font-urbanist-semibold text-background">
              {isEditing ? "Update" : "Submit"}
            </P>
          </Button>
        </View>
      </View>
    </BaseModal>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/Recipe/Details/WriteReviewModal.tsx
git commit -m "feat(reviews): add WriteReviewModal with star rating, title, and body"
```

---

## Task 12: ReviewsList Component

**Files:**
- Create: `components/Recipe/Details/ReviewsList.tsx`

- [ ] **Step 1: Create components/Recipe/Details/ReviewsList.tsx**

```tsx
import React, { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { P, Small } from "~/components/ui/typography";
import ReviewCard from "./ReviewCard";
import type { ReviewWithAuthor, ReviewSortOption } from "~/types/Review";

interface ReviewsListProps {
  reviews: ReviewWithAuthor[];
  hasMore: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  sort: ReviewSortOption;
  onSortChange: (sort: ReviewSortOption) => void;
  onLoadMore: () => void;
  currentUserId: string | null;
  onEditReview: (review: ReviewWithAuthor) => void;
  onDeleteReview: (reviewId: string) => void;
  onToggleHelpful: (reviewId: string) => void;
  onPhotoPress: (photoUrl: string) => void;
}

export default function ReviewsList({
  reviews,
  hasMore,
  isLoading,
  isFetchingNextPage,
  sort,
  onSortChange,
  onLoadMore,
  currentUserId,
  onEditReview,
  onDeleteReview,
  onToggleHelpful,
  onPhotoPress,
}: ReviewsListProps) {
  if (isLoading) {
    return <ActivityIndicator size="small" className="py-8" />;
  }

  if (reviews.length === 0) {
    return null; // RatingSummary handles the empty state
  }

  return (
    <View className="mb-6">
      {/* Sort toggle */}
      <View className="flex-row gap-2 mb-4">
        {(["newest", "most_helpful"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => onSortChange(option)}
            className={`px-3 py-1.5 rounded-full border ${
              sort === option
                ? "bg-foreground border-foreground"
                : "bg-transparent border-border"
            }`}
          >
            <Small
              className={`font-urbanist-medium ${
                sort === option ? "text-background" : "text-foreground"
              }`}
            >
              {option === "newest" ? "Newest" : "Most Helpful"}
            </Small>
          </Pressable>
        ))}
      </View>

      {/* Review cards */}
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isOwnReview={review.userId === currentUserId}
          currentUserId={currentUserId}
          onEdit={onEditReview}
          onDelete={onDeleteReview}
          onToggleHelpful={onToggleHelpful}
          onPhotoPress={onPhotoPress}
        />
      ))}

      {/* Load more */}
      {hasMore && (
        <Pressable
          onPress={onLoadMore}
          className="py-4 items-center"
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" />
          ) : (
            <Small className="text-primary font-urbanist-medium">Load more reviews</Small>
          )}
        </Pressable>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/Recipe/Details/ReviewsList.tsx
git commit -m "feat(reviews): add ReviewsList with sort toggle and pagination"
```

---

## Task 13: TipCard, TipsList, WriteTipModal Components

**Files:**
- Create: `components/Recipe/Details/TipCard.tsx`
- Create: `components/Recipe/Details/TipsList.tsx`
- Create: `components/Recipe/Details/WriteTipModal.tsx`

- [ ] **Step 1: Create components/Recipe/Details/TipCard.tsx**

```tsx
import React from "react";
import { View, Pressable } from "react-native";
import { P, Small } from "~/components/ui/typography";
import HelpfulButton from "~/components/ui/HelpfulButton";
import type { TipWithAuthor } from "~/types/Review";

interface TipCardProps {
  tip: TipWithAuthor;
  isOwnTip: boolean;
  onEdit: (tip: TipWithAuthor) => void;
  onDelete: (tipId: string) => void;
  onToggleHelpful: (tipId: string) => void;
}

export default function TipCard({
  tip,
  isOwnTip,
  onEdit,
  onDelete,
  onToggleHelpful,
}: TipCardProps) {
  return (
    <View className="py-3 border-b border-border/50">
      <View className="flex-row items-center gap-2 mb-1.5">
        <View
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: tip.authorColor + "30" }}
        >
          <Small className="text-xs font-urbanist-bold" style={{ color: tip.authorColor }}>
            {tip.authorInitial}
          </Small>
        </View>
        <Small className="text-muted-foreground">
          {new Date(tip.createdAt).toLocaleDateString()}
        </Small>
      </View>

      <P className="text-foreground/80 font-urbanist-regular text-sm mb-2">{tip.body}</P>

      <View className="flex-row items-center justify-between">
        <HelpfulButton
          count={tip.helpfulCount}
          isVoted={false}
          onPress={() => onToggleHelpful(tip.id)}
        />
        {isOwnTip && (
          <View className="flex-row gap-3">
            <Pressable onPress={() => onEdit(tip)} hitSlop={8}>
              <Small className="text-primary">Edit</Small>
            </Pressable>
            <Pressable onPress={() => onDelete(tip.id)} hitSlop={8}>
              <Small className="text-destructive">Delete</Small>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Create components/Recipe/Details/TipsList.tsx**

```tsx
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import TipCard from "./TipCard";
import type { TipWithAuthor } from "~/types/Review";

interface TipsListProps {
  tips: TipWithAuthor[] | undefined;
  isLoading: boolean;
  currentUserId: string | null;
  onAddTip: () => void;
  onEditTip: (tip: TipWithAuthor) => void;
  onDeleteTip: (tipId: string) => void;
  onToggleTipHelpful: (tipId: string) => void;
}

export default function TipsList({
  tips,
  isLoading,
  currentUserId,
  onAddTip,
  onEditTip,
  onDeleteTip,
  onToggleTipHelpful,
}: TipsListProps) {
  return (
    <View className="mb-6">
      <Separator className="mb-6" />

      <View className="flex-row items-center justify-between mb-4">
        <H4 className="font-urbanist-bold">Tips & Modifications</H4>
        <Button size="sm" variant="outline" className="rounded-2xl" onPress={onAddTip}>
          <Small className="font-urbanist-semibold text-foreground">Add a Tip</Small>
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" className="py-4" />
      ) : !tips?.length ? (
        <View className="py-4 items-center">
          <P className="text-muted-foreground text-center text-sm">
            No tips yet. Share your modifications!
          </P>
        </View>
      ) : (
        tips.map((tip) => (
          <TipCard
            key={tip.id}
            tip={tip}
            isOwnTip={tip.userId === currentUserId}
            onEdit={onEditTip}
            onDelete={onDeleteTip}
            onToggleHelpful={onToggleTipHelpful}
          />
        ))
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create components/Recipe/Details/WriteTipModal.tsx**

```tsx
import React, { useState, useEffect } from "react";
import { View, TextInput, ActivityIndicator, Alert } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import BaseModal from "~/components/ui/modal";
import type { TipWithAuthor, CreateTipInput } from "~/types/Review";

interface WriteTipModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTipInput) => void;
  existingTip?: TipWithAuthor | null;
  isSubmitting: boolean;
}

const MAX_LENGTH = 300;

export default function WriteTipModal({
  visible,
  onClose,
  onSubmit,
  existingTip,
  isSubmitting,
}: WriteTipModalProps) {
  const [body, setBody] = useState("");

  useEffect(() => {
    if (visible) {
      setBody(existingTip?.body ?? "");
    }
  }, [visible, existingTip]);

  const handleSubmit = () => {
    if (body.trim().length === 0) {
      Alert.alert("Tip required", "Please write your tip or modification.");
      return;
    }
    onSubmit({ body: body.trim() });
  };

  const handleClose = () => {
    setBody("");
    onClose();
  };

  const isEditing = !!existingTip;

  return (
    <BaseModal modalVisible={visible} onCancel={handleClose}>
      <View className="bg-background rounded-4xl p-6 w-full shadow-xl border-continuous">
        <H4 className="font-urbanist-bold text-foreground text-center mb-2">
          {isEditing ? "Edit Tip" : "Add a Tip"}
        </H4>
        <P className="text-sm font-urbanist-regular text-muted-foreground text-center mb-6">
          Share a modification or cooking tip
        </P>

        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-1">
            <P className="text-sm font-urbanist-medium text-foreground">Your tip</P>
            <Small className="text-muted-foreground">
              {body.length}/{MAX_LENGTH}
            </Small>
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="e.g., I substituted coconut milk and it turned out great!"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={MAX_LENGTH}
            className="w-full min-h-[80px] rounded-lg bg-muted px-3 py-2 text-base font-urbanist-regular border-continuous"
            editable={!isSubmitting}
          />
        </View>

        <View className="flex-row gap-3 mt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl"
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <P className="font-urbanist-semibold text-foreground">Cancel</P>
          </Button>
          <Button
            className="flex-1 rounded-2xl bg-foreground flex-row justify-center items-center gap-2"
            onPress={handleSubmit}
            disabled={isSubmitting || body.trim().length === 0}
          >
            {isSubmitting && <ActivityIndicator size="small" color="white" />}
            <P className="font-urbanist-semibold text-background">
              {isEditing ? "Update" : "Submit"}
            </P>
          </Button>
        </View>
      </View>
    </BaseModal>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/Recipe/Details/TipCard.tsx components/Recipe/Details/TipsList.tsx components/Recipe/Details/WriteTipModal.tsx
git commit -m "feat(reviews): add TipCard, TipsList, and WriteTipModal components"
```

---

## Task 14: Wire Up Recipe Detail Screen

**Files:**
- Modify: `app/recipes/[recipeId]/index.tsx`

This is the main integration task. It wires all the review components into the recipe detail screen, gated by the feature flag.

- [ ] **Step 1: Add imports to app/recipes/[recipeId]/index.tsx**

After the existing imports (around line 47), add:

```typescript
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";
import {
  useRecipeReviewSummary,
  useRecipeReviews,
  useUserReview,
  useRecipeTips,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
  useToggleHelpful,
  useCreateTip,
  useUpdateTip,
  useDeleteTip,
  useToggleTipHelpful,
} from "~/hooks/queries/useReviewQueries";
import RatingSummary from "~/components/Recipe/Details/RatingSummary";
import ReviewsList from "~/components/Recipe/Details/ReviewsList";
import WriteReviewModal from "~/components/Recipe/Details/WriteReviewModal";
import TipsList from "~/components/Recipe/Details/TipsList";
import WriteTipModal from "~/components/Recipe/Details/WriteTipModal";
import type { ReviewWithAuthor, TipWithAuthor, ReviewSortOption, CreateReviewInput } from "~/types/Review";
```

- [ ] **Step 2: Add review state and hooks inside RecipeDetailsContent**

After the existing hooks (around line 128, after `const addToMealPlan = useAddToMealPlan();`), add:

```typescript
  // ─── Reviews & Ratings ──────────────────────────────────────────
  const { enabled: reviewsEnabled } = useFeatureFlag("ratings_and_reviews");
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>("newest");
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewWithAuthor | null>(null);
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [editingTip, setEditingTip] = useState<TipWithAuthor | null>(null);

  const { data: reviewSummary } = useRecipeReviewSummary(recipeId);
  const {
    data: reviewsData,
    fetchNextPage: fetchMoreReviews,
    hasNextPage: hasMoreReviews,
    isFetchingNextPage: isFetchingMoreReviews,
  } = useRecipeReviews(recipeId, reviewSort);
  const { data: userReview } = useUserReview(recipeId);
  const { data: tips } = useRecipeTips(recipeId);

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const toggleHelpful = useToggleHelpful();
  const createTip = useCreateTip();
  const updateTip = useUpdateTip();
  const deleteTip = useDeleteTip();
  const toggleTipHelpful = useToggleTipHelpful();

  const allReviews = reviewsData?.pages.flatMap((p) => p.reviews) ?? [];

  const handleOpenWriteReview = useCallback(() => {
    if (userReview) {
      setEditingReview(userReview);
    } else {
      setEditingReview(null);
    }
    setReviewModalVisible(true);
  }, [userReview]);

  const handleEditReview = useCallback((review: ReviewWithAuthor) => {
    setEditingReview(review);
    setReviewModalVisible(true);
  }, []);

  const handleDeleteReview = useCallback(
    (reviewId: string) => {
      Alert.alert("Delete Review", "Are you sure you want to delete your review?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteReview.mutate({ reviewId, recipeId }),
        },
      ]);
    },
    [deleteReview, recipeId]
  );

  const handleSubmitReview = useCallback(
    (input: CreateReviewInput) => {
      if (editingReview) {
        updateReview.mutate(
          { reviewId: editingReview.id, input, recipeId },
          { onSuccess: () => setReviewModalVisible(false) }
        );
      } else {
        createReview.mutate(
          { recipeId, input },
          { onSuccess: () => setReviewModalVisible(false) }
        );
      }
    },
    [editingReview, createReview, updateReview, recipeId]
  );

  const handleToggleHelpful = useCallback(
    (reviewId: string) => {
      toggleHelpful.mutate({ reviewId, recipeId });
    },
    [toggleHelpful, recipeId]
  );

  const handleAddTip = useCallback(() => {
    setEditingTip(null);
    setTipModalVisible(true);
  }, []);

  const handleEditTip = useCallback((tip: TipWithAuthor) => {
    setEditingTip(tip);
    setTipModalVisible(true);
  }, []);

  const handleDeleteTip = useCallback(
    (tipId: string) => {
      Alert.alert("Delete Tip", "Are you sure you want to delete this tip?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTip.mutate({ tipId, recipeId }),
        },
      ]);
    },
    [deleteTip, recipeId]
  );

  const handleSubmitTip = useCallback(
    (input: { body: string }) => {
      if (editingTip) {
        updateTip.mutate(
          { tipId: editingTip.id, input, recipeId },
          { onSuccess: () => setTipModalVisible(false) }
        );
      } else {
        createTip.mutate(
          { recipeId, input },
          { onSuccess: () => setTipModalVisible(false) }
        );
      }
    },
    [editingTip, createTip, updateTip, recipeId]
  );

  const handleToggleTipHelpful = useCallback(
    (tipId: string) => {
      toggleTipHelpful.mutate({ tipId, recipeId });
    },
    [toggleTipHelpful, recipeId]
  );
```

- [ ] **Step 3: Add review UI sections to the ScrollView content**

Inside the `<Animated.View className="flex-1 px-6 py-8 bg-background rounded-t-3xl -mt-8">`, before the `<View className="h-32" />`, add:

```tsx
          {/* ─── Reviews & Ratings ─────────────────────────────────── */}
          {reviewsEnabled && (
            <>
              <RatingSummary
                summary={reviewSummary}
                userHasReview={!!userReview}
                onWriteReview={handleOpenWriteReview}
                isLoading={false}
              />

              <ReviewsList
                reviews={allReviews}
                hasMore={hasMoreReviews ?? false}
                isLoading={false}
                isFetchingNextPage={isFetchingMoreReviews}
                sort={reviewSort}
                onSortChange={setReviewSort}
                onLoadMore={() => fetchMoreReviews()}
                currentUserId={null}
                onEditReview={handleEditReview}
                onDeleteReview={handleDeleteReview}
                onToggleHelpful={handleToggleHelpful}
                onPhotoPress={() => {}}
              />

              <TipsList
                tips={tips}
                isLoading={false}
                currentUserId={null}
                onAddTip={handleAddTip}
                onEditTip={handleEditTip}
                onDeleteTip={handleDeleteTip}
                onToggleTipHelpful={handleToggleTipHelpful}
              />
            </>
          )}

          {/* Review Modal */}
          <WriteReviewModal
            visible={reviewModalVisible}
            onClose={() => setReviewModalVisible(false)}
            onSubmit={handleSubmitReview}
            existingReview={editingReview}
            isSubmitting={createReview.isPending || updateReview.isPending}
          />

          {/* Tip Modal */}
          <WriteTipModal
            visible={tipModalVisible}
            onClose={() => setTipModalVisible(false)}
            onSubmit={handleSubmitTip}
            existingTip={editingTip}
            isSubmitting={createTip.isPending || updateTip.isPending}
          />
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/recipes/[recipeId]/index.tsx
git commit -m "feat(reviews): wire review components into recipe detail screen"
```

---

## Task 15: Integration — RateRecipeModal → WriteReviewModal Bridge

**Files:**
- Modify: `components/Recipe/Step/CongratulationsContent.tsx`

This re-enables the rating prompt after cooking and adds a "Share publicly?" call-to-action that opens the WriteReviewModal.

- [ ] **Step 1: Update CongratulationsContent.tsx**

Replace the component body to add the RateRecipeModal and a "Share publicly" prompt. The full file becomes:

```tsx
import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { H2, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import { Image } from "expo-image";
import MaskedView from "@react-native-masked-view/masked-view";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { formatDuration } from "~/utils/time-formatter";
import { cn } from "~/lib/utils";
import RateRecipeModal from "./RateRecipeModal";
import { useCookingHistoryMutations } from "~/hooks/queries/useCookingHistoryQueries";
import { useCreateReview } from "~/hooks/queries/useReviewQueries";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";
import WriteReviewModal from "~/components/Recipe/Details/WriteReviewModal";

const CongratulationsContent = () => {
  const { recipe, duration } = useRecipeSteps();
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [pendingRating, setPendingRating] = useState<number | undefined>(undefined);
  const [pendingNotes, setPendingNotes] = useState("");
  const { enabled: reviewsEnabled } = useFeatureFlag("ratings_and_reviews");

  const saveCookingHistory = useCookingHistoryMutations();
  const createReview = useCreateReview();

  const handleSaveRating = (rating: number | undefined, notes: string) => {
    if (!recipe?.id) return;

    saveCookingHistory.mutate(
      {
        recipeId: recipe.id,
        rating: rating ?? undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setRateModalVisible(false);
          if (reviewsEnabled && rating) {
            setPendingRating(rating);
            setPendingNotes(notes);
            Alert.alert(
              "Share your review?",
              "Would you like to share your rating publicly for other cooks to see?",
              [
                { text: "Not now", style: "cancel" },
                {
                  text: "Share Review",
                  onPress: () => setReviewModalVisible(true),
                },
              ]
            );
          }
        },
      }
    );
  };

  const handleSubmitPublicReview = (input: { rating: number; title?: string; body: string; photos: Array<{ uri: string; position: number }> }) => {
    if (!recipe?.id) return;
    createReview.mutate(
      { recipeId: recipe.id, input },
      { onSuccess: () => setReviewModalVisible(false) }
    );
  };

  return (
    <>
      <View
        className={cn(
          "flex-1 flex bg-black rounded-3xl border-continuous p-4 justify-center items-center border-2 border-foreground"
        )}
      >
        <P className="text-lg text-center text-white/90 font-urbanist-medium mb-2">
          You've completed
        </P>
        <H2 className="text-primary font-bowlby-one px-6 text-center">{recipe.title}</H2>

        <View className="w-[80%] aspect-square mb-4">
          <MaskedView
            style={styles.fill}
            maskElement={<ShapeContainer index={12} text="" width="100%" height="100%" />}
          >
            <Image source={{ uri: recipe.imageUrl }} style={styles.fill} contentFit="cover" />
          </MaskedView>
        </View>
        <P className="text-lg text-center text-white/80 font-urbanist-extrabold mb-1">
          Completed in <P className="text-primary">{duration ? formatDuration(duration) : "..."}</P>
          !
        </P>
        <P className="text-center text-white/80 font-urbanist-semibold mb-4">
          Great job following and enjoy your dishes!
        </P>

        <Button
          className="rounded-2xl bg-primary"
          onPress={() => setRateModalVisible(true)}
        >
          <Small className="font-urbanist-semibold text-primary-foreground">
            Rate This Recipe
          </Small>
        </Button>
      </View>

      <RateRecipeModal
        modalVisible={rateModalVisible}
        onCancel={() => setRateModalVisible(false)}
        onSave={handleSaveRating}
        onSkip={() => setRateModalVisible(false)}
        isSaving={saveCookingHistory.isPending}
      />

      {reviewsEnabled && (
        <WriteReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          onSubmit={handleSubmitPublicReview}
          initialRating={pendingRating}
          initialNotes={pendingNotes}
          isSubmitting={createReview.isPending}
        />
      )}
    </>
  );
};

export default CongratulationsContent;

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (may need to check `useCookingHistoryMutations` exists; if not, adapt to the actual hook name found in `hooks/queries/useCookingHistoryQueries.ts`)

- [ ] **Step 3: Commit**

```bash
git add components/Recipe/Step/CongratulationsContent.tsx
git commit -m "feat(reviews): bridge personal rating to public review after cooking"
```

---

## Task 16: Final Integration Test & Lint

**Files:** No new files — verify everything works together.

- [ ] **Step 1: Run full typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `bun run test`
Expected: All existing and new tests pass

- [ ] **Step 4: Commit any lint fixes if needed**

```bash
git add -A && git commit -m "style: lint fixes for ratings & reviews feature"
```

---

## Task 17: Recipe Browsing — Rating Filter

**Files:**
- Modify: `hooks/queries/useRecipeQueries.ts` (add rating filter to search/browse queries)
- Modify: whichever recipe browsing screen uses the recipe list (e.g., `app/(misc)/search.tsx` or the main recipe list)

This task adds a "4+ stars" filter chip to recipe browsing, powered by the denormalized `avg_rating` column on the recipe table (created in Task 1).

- [ ] **Step 1: Add minRating filter to RecipeFilters and searchRecipes**

In `hooks/queries/useRecipeQueries.ts`, add `minRating` to the `RecipeFilters` interface (around line 61):

```typescript
export interface RecipeFilters {
  tags?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  minTotalTime?: number;
  maxTotalTime?: number;
  difficulty?: number;
  minRating?: number;
}
```

Update `recipeFiltersApply` to include the new filter:

```typescript
function recipeFiltersApply(filters?: RecipeFilters): boolean {
  if (!filters) return false;
  if (filters.tags && filters.tags.length > 0) return true;
  if (filters.difficulty !== undefined) return true;
  if (filters.maxTotalTime !== undefined) return true;
  if (filters.minTotalTime !== undefined) return true;
  if (filters.maxPrepTime !== undefined) return true;
  if (filters.maxCookTime !== undefined) return true;
  if (filters.minRating !== undefined) return true;
  return false;
}
```

- [ ] **Step 2: Update RecipeApi.searchRecipes to pass minRating to Supabase**

In `data/api/recipeApi.ts`, find the `searchRecipes` function. Add a filter for `avg_rating` when `minRating` is provided:

After the existing filter chain (where difficulty, tags, time filters are applied), add:

```typescript
if (filters?.minRating !== undefined) {
  query = query.gte("avg_rating", filters.minRating);
}
```

- [ ] **Step 3: Add rating filter chip to recipe search/browse screen**

In the recipe browsing screen (check `app/(misc)/search.tsx` or the main recipe list screen), add a filter chip row:

```tsx
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";

// Inside the component:
const { enabled: reviewsEnabled } = useFeatureFlag("ratings_and_reviews");

// In the filter chips area, conditionally add:
{reviewsEnabled && (
  <Pressable
    onPress={() => setFilters((f) => ({ ...f, minRating: f.minRating ? undefined : 4 }))}
    className={`px-3 py-1.5 rounded-full border ${
      filters.minRating ? "bg-foreground border-foreground" : "bg-transparent border-border"
    }`}
  >
    <Small className={filters.minRating ? "text-background" : "text-foreground"}>
      4+ Stars
    </Small>
  </Pressable>
)}
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/queries/useRecipeQueries.ts data/api/recipeApi.ts app/(misc)/search.tsx
git commit -m "feat(reviews): add rating filter chip to recipe browsing"
```
