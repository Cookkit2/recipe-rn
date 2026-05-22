# Recipe Ratings & Reviews — Design Spec

**Date:** 2026-05-23
**Status:** Draft
**Approach:** Supabase-only (no WatermelonDB tables for community data)

## Overview

Community-driven ratings and reviews for recipes. Users can rate (1-5 stars), write reviews with photos, vote reviews as helpful, and submit tips/modifications. All community data lives in Supabase with TanStack Query caching on the client. CookingHistory remains the personal/local-only record.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data storage | Supabase-only | Community data doesn't need offline access; keeps local DB clean |
| User identity | Partially anonymous | First initial of display name + deterministic color avatar (color derived from user_id hash). No full names or profile pictures shown. |
| Review editing | Full edit support | Users can update rating, text, and photos after posting |
| Photos per review | Up to 3 | Balance of expression and storage |
| Moderation | None (MVP) | Helpful voting surfaces quality content; report button deferred |
| Star granularity | Whole stars (1-5) | Standard pattern, simpler UI |
| One review per recipe | Yes | Unique constraint on (recipe_id, user_id) |
| Tips | Separate section | Lightweight content type (max 300 chars), displayed below reviews |
| Tips per recipe per user | Multiple allowed | Users may have different tips/modifications |

## Supabase Schema

### `recipe_review`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `recipe_id` | uuid | FK → recipe.id, NOT NULL, indexed | |
| `user_id` | uuid | FK → auth.users.id, NOT NULL, indexed | |
| `rating` | smallint | NOT NULL, CHECK 1-5 | Whole stars |
| `title` | text | nullable | Optional headline, max 80 chars |
| `body` | text | NOT NULL | Max 1000 chars |
| `helpful_count` | int | NOT NULL, default 0 | Denormalized, updated by trigger |
| `created_at` | timestamptz | NOT NULL, default now() | |
| `updated_at` | timestamptz | NOT NULL, default now() | |

**Unique constraint:** `(recipe_id, user_id)` — one review per user per recipe.

### `review_photo`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `review_id` | uuid | FK → recipe_review.id ON DELETE CASCADE, NOT NULL, indexed | |
| `photo_url` | text | NOT NULL | Supabase Storage public URL |
| `position` | smallint | NOT NULL, CHECK 1-3 | Display order |
| `created_at` | timestamptz | NOT NULL, default now() | |

**Unique constraint:** `(review_id, position)`.

### `review_helpful_vote`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `review_id` | uuid | FK → recipe_review.id ON DELETE CASCADE, NOT NULL, indexed | |
| `user_id` | uuid | FK → auth.users.id, NOT NULL, indexed | |
| `created_at` | timestamptz | NOT NULL, default now() | |

**Unique constraint:** `(review_id, user_id)`.

### `recipe_tip`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `recipe_id` | uuid | FK → recipe.id, NOT NULL, indexed | |
| `user_id` | uuid | FK → auth.users.id, NOT NULL, indexed | |
| `body` | text | NOT NULL | Max 300 chars |
| `helpful_count` | int | NOT NULL, default 0 | Denormalized, updated by trigger |
| `created_at` | timestamptz | NOT NULL, default now() | |
| `updated_at` | timestamptz | NOT NULL, default now() | |

No unique constraint — users can submit multiple tips per recipe.

### `tip_helpful_vote`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `tip_id` | uuid | FK → recipe_tip.id ON DELETE CASCADE, NOT NULL, indexed | |
| `user_id` | uuid | FK → auth.users.id, NOT NULL, indexed | |
| `created_at` | timestamptz | NOT NULL, default now() | |

**Unique constraint:** `(tip_id, user_id)`.

### Denormalized Recipe Columns

Add to the existing `recipe` table in Supabase:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `avg_rating` | numeric(2,1) | nullable | Average of all review ratings, updated by trigger |
| `review_count` | int | NOT NULL, default 0 | Total review count, updated by trigger |

These enable efficient "filter by 4+ stars" and "sort by rating" queries without joining the reviews table.

### Storage Bucket: `review-photos`

- Public read, authenticated upload
- Path pattern: `{user_id}/{review_id}/{position}.jpg`
- Max file size: 5MB per image
- Client-side resize to max 1200px before upload

### Database Triggers

1. **`update_review_helpful_count`** — AFTER INSERT OR DELETE on `review_helpful_vote`: Recalculates `recipe_review.helpful_count` as `COUNT(*) WHERE review_id = NEW.review_id`.

2. **`update_tip_helpful_count`** — AFTER INSERT OR DELETE on `tip_helpful_vote`: Same pattern for `recipe_tip.helpful_count`.

3. **`update_recipe_rating_stats`** — AFTER INSERT OR UPDATE OR DELETE on `recipe_review`: Recalculates `recipe.avg_rating` and `recipe.review_count` for the affected recipe_id.

4. **`update_review_updated_at`** — BEFORE UPDATE on `recipe_review`: Sets `updated_at = now()`.

5. **`update_tip_updated_at`** — BEFORE UPDATE on `recipe_tip`: Sets `updated_at = now()`.

## Row Level Security

### `recipe_review`
- **SELECT:** Public (anyone can read reviews)
- **INSERT:** Authenticated users, `auth.uid() = user_id`
- **UPDATE:** `auth.uid() = user_id` (own reviews only)
- **DELETE:** `auth.uid() = user_id` (own reviews only)

### `review_photo`
- **SELECT:** Public
- **INSERT:** Authenticated users, review belongs to `auth.uid()` via `review_id`
- **DELETE:** Photo belongs to a review where `auth.uid() = user_id`

### `review_helpful_vote`
- **SELECT:** Public
- **INSERT:** Authenticated users, `auth.uid() = user_id`
- **DELETE:** `auth.uid() = user_id` (can only remove own vote)

### `recipe_tip`
- **SELECT:** Public
- **INSERT:** Authenticated users, `auth.uid() = user_id`
- **UPDATE:** `auth.uid() = user_id`
- **DELETE:** `auth.uid() = user_id`

### `tip_helpful_vote`
- **SELECT:** Public
- **INSERT:** Authenticated users, `auth.uid() = user_id`
- **DELETE:** `auth.uid() = user_id`

### Storage: `review-photos`
- **Read:** Public
- **Upload:** Authenticated, path must start with `{auth.uid()}/`

## API Layer

### New file: `data/supabase-api/ReviewApi.ts`

**Reviews:**
- `fetchRecipeReviews(recipeId, page, sort)` — paginated list, sorted by `newest` or `most_helpful`. Returns reviews with photos and user identity.
- `fetchRecipeReviewSummary(recipeId)` — returns `{ avgRating, reviewCount, ratingDistribution: { 1: n, 2: n, ... 5: n } }`.
- `fetchUserReview(recipeId)` — returns the current user's review or null.
- `createReview(recipeId, { rating, title, body, photos })` — uploads photos to storage, then inserts review + photo rows in a transaction.
- `updateReview(reviewId, { rating, title, body, photos })` — updates review row, diffs photo changes (upload new, delete removed).
- `deleteReview(reviewId)` — cascade deletes photos and votes.

**Helpful Voting:**
- `toggleHelpful(reviewId)` — checks for existing vote, inserts or deletes. Optimistic UI on client.

**Tips:**
- `fetchRecipeTips(recipeId)` — all tips, sorted by helpful_count desc then created_at desc.
- `createTip(recipeId, { body })` — insert tip.
- `updateTip(tipId, { body })` — update own tip.
- `deleteTip(tipId)` — delete own tip.
- `toggleTipHelpful(tipId)` — same toggle pattern as review helpful votes. Requires a `tip_helpful_vote` table (same structure as `review_helpful_vote` but for tips).

### New file: `hooks/queries/reviewQueryKeys.ts`

```
reviews.detail(reviewId)
reviews.list(recipeId, sort, page)
reviews.userReview(recipeId)
reviews.summary(recipeId)
tips.list(recipeId)
```

### New file: `hooks/queries/useReviewQueries.ts`

**Query hooks:**
- `useRecipeReviews(recipeId, sort)` — paginated review list
- `useRecipeReviewSummary(recipeId)` — avg rating + count + distribution
- `useUserReview(recipeId)` — current user's review (for edit/delete state)
- `useRecipeTips(recipeId)` — tips list

**Mutation hooks:**
- `useCreateReview()` — invalidates reviews.list, reviews.summary, reviews.userReview on success
- `useUpdateReview()` — invalidates same keys
- `useDeleteReview()` — invalidates same keys
- `useToggleHelpful()` — optimistic update, increments/decrements helpful_count locally
- `useCreateTip()` — invalidates tips.list
- `useUpdateTip()` — invalidates tips.list
- `useDeleteTip()` — invalidates tips.list
- `useToggleTipHelpful()` — optimistic update

### Data Flow

```
Recipe Detail Screen
  → useRecipeReviewSummary(recipeId)  → ReviewApi → Supabase
  → useRecipeReviews(recipeId, sort)  → ReviewApi → Supabase
  → useRecipeTips(recipeId)           → ReviewApi → Supabase
  → useUserReview(recipeId)           → ReviewApi → Supabase
```

No WatermelonDB involvement. TanStack Query cache provides client-side caching.

## UI Components

### Recipe Detail Screen Changes (`app/recipes/[recipeId]/index.tsx`)

Three new sections inserted before the bottom spacer (`<View className="h-32" />`):

**1. Rating Summary Card**
- Large avg rating number (e.g., "4.2")
- Star display (filled/empty based on avg)
- Review count ("127 reviews")
- Horizontal bar chart showing rating distribution (5→1, right-aligned)
- "Write a Review" button (disabled if user already has a review → shows "Edit Your Review")

**2. Reviews List Section**
- Header: "Reviews" with sort toggle (Newest / Most Helpful)
- Each review card:
  - User avatar (first initial + generated color) and partial identity
  - Star rating (5 stars, filled/empty)
  - Title (bold, if provided)
  - Body text (collapsible after 3 lines, "Read more" to expand)
  - Photo thumbnails (up to 3, tappable to expand fullscreen)
  - "X found helpful" text + thumbs up button
  - "Edited" badge if updated_at > created_at + 1 minute
  - If current user's review: Edit (pencil icon) / Delete (trash icon) buttons
- Load more / pagination
- Empty state: "Be the first to review this recipe" with CTA

**3. Tips Section**
- Header: "Tips & Modifications" with "Add a Tip" button
- Each tip card:
  - User avatar and partial identity
  - Tip body text
  - "X found helpful" + thumbs up button
  - If own tip: Edit / Delete
- Empty state: "No tips yet. Share your modifications!"

### New Components

| Component | File | Purpose |
|---|---|---|
| `RatingSummary` | `components/Recipe/Details/RatingSummary.tsx` | Avg rating, stars, distribution bars |
| `ReviewCard` | `components/Recipe/Details/ReviewCard.tsx` | Single review display |
| `ReviewsList` | `components/Recipe/Details/ReviewsList.tsx` | Review list with sort and pagination |
| `WriteReviewModal` | `components/Recipe/Details/WriteReviewModal.tsx` | Create/edit review form |
| `ReviewPhotoPicker` | `components/Recipe/Details/ReviewPhotoPicker.tsx` | Photo selection (up to 3) |
| `TipCard` | `components/Recipe/Details/TipCard.tsx` | Single tip display |
| `TipsList` | `components/Recipe/Details/TipsList.tsx` | Tips section with add button |
| `WriteTipModal` | `components/Recipe/Details/WriteTipModal.tsx` | Create/edit tip form |
| `StarRating` | `components/ui/StarRating.tsx` | Reusable star display/selector |
| `HelpfulButton` | `components/ui/HelpfulButton.tsx` | Thumbs up + count |

### Existing Component Changes

- `RateRecipeModal` (`components/Recipe/Step/RateRecipeModal.tsx`) — After saving a personal rating via CookingHistory, show a prompt: "Want to share your review publicly?" that navigates to the WriteReviewModal pre-filled with the rating and notes.

### Recipe Browsing — Rating Filter

On recipe discovery/browse screens, add a rating filter chip (e.g., "4+ stars") that applies a server-side filter using the denormalized `avg_rating` and `review_count` columns on the recipe table (defined above in Denormalized Recipe Columns). These columns are updated by the `update_recipe_rating_stats` trigger whenever reviews are created, updated, or deleted. This enables efficient `WHERE avg_rating >= 4` queries without joining the reviews table.

## Auth & Security

- All write operations require authenticated user.
- `useUserReview(recipeId)` returns null for unauthenticated users; write buttons hidden.
- RLS enforces ownership on mutations (users can only modify their own content).
- Photo uploads validated for file type (jpg/png) and size (max 5MB).
- Storage paths scoped to user ID prefix.

## Error Handling

| Scenario | Handling |
|---|---|
| Offline | Show "You need to be online" message. Reviews/tips require network. |
| Photo upload failure | Upload photos before review creation. If review creation fails, orphaned photos accepted (negligible). |
| Duplicate review | Unique constraint returns 409. Client refreshes and switches to edit mode. |
| Review deleted by another session | Optimistic update rolls back on 404, refetch reviews. |
| Empty reviews | "Be the first to review" empty state with CTA. |
| Empty tips | "No tips yet" empty state with CTA. |
| Character limits | Client-side maxLength on inputs, server-side CHECK constraints as safety net. |
| Denormalized counts | Updated via database triggers. Never calculated client-side. |

## Testing Strategy

- **Unit tests:** ReviewApi functions (mocked Supabase client), query key factories, mutation invalidation logic.
- **Component tests:** ReviewCard, TipCard, WriteReviewModal, WriteTipModal rendering and interactions.
- **Integration tests:** Create review flow end-to-end (Supabase test instance), helpful vote toggle, photo upload.
- **RLS tests:** Verify unauthenticated read works, authenticated write restricted to own content, cross-user mutations blocked.

## Scope Exclusions (Deferred)

- Half-star rating increments
- Pre-moderation or content moderation
- Report/flag reviews
- Review sorting by "Most Recent" beyond newest/helpful
- Review search within a recipe
- Notifications for review responses
- Review translation
- Verified purchase/cooking badges
