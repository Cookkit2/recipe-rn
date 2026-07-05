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
    "#EF4444",
    "#F97316",
    "#F59E0B",
    "#84CC16",
    "#22C55E",
    "#14B8A6",
    "#06B6D4",
    "#3B82F6",
    "#6366F1",
    "#8B5CF6",
    "#A855F7",
    "#EC4899",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length]!;
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

function mapReviewRow(
  row: ReviewRow,
  photos: ReviewPhotoRow[],
  authorInitial: string,
  authorColor: string
): ReviewWithAuthor {
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

async function uploadReviewPhotos(
  userId: string,
  reviewId: string,
  photos: Array<{ uri: string; position: number }>
): Promise<ReviewPhotoRow[]> {
  if (!supabase) return [];

  const uploadPromises = photos.map(async (photo) => {
    const path = `${userId}/${reviewId}/${photo.position}.jpg`;
    const { error: uploadError } = await supabase!.storage.from("review-photos").upload(path, {
      uri: photo.uri,
      type: "image/jpeg",
      name: `${photo.position}.jpg`,
    } as unknown as Blob);

    if (uploadError) {
      log.error("[ReviewApi] Photo upload failed:", uploadError);
      return null;
    }

    const { data: publicUrl } = supabase!.storage.from("review-photos").getPublicUrl(path);

    return {
      review_id: reviewId,
      photo_url: publicUrl.publicUrl,
      position: photo.position,
    };
  });

  const uploadResults = await Promise.all(uploadPromises);
  const validPhotos = uploadResults.filter((p): p is NonNullable<typeof p> => p !== null);

  if (validPhotos.length > 0) {
    const { data: insertedPhotos } = await supabase!
      .from("review_photo")
      .insert(validPhotos)
      .select();

    if (insertedPhotos) {
      return insertedPhotos as unknown as ReviewPhotoRow[];
    }
  }

  return [];
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

  createReview: async (recipeId: string, input: CreateReviewInput): Promise<Review> => {
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

    // ⚡ Bolt Performance Optimization: Parallelize photo uploads and bulk-insert records
    // Impact: Reduces sequential network latencies and N+1 database queries
    const photoRows: ReviewPhotoRow[] =
      input.photos && input.photos.length > 0
        ? await uploadReviewPhotos(userId, data.id, input.photos)
        : [];

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

  updateReview: async (reviewId: string, input: UpdateReviewInput): Promise<void> => {
    if (!guardSupabase()) throw new Error("Supabase not available");

    const updateData: {
      rating?: number;
      title?: string | null;
      body?: string;
    } = {};
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.body !== undefined) updateData.body = input.body;

    const { error } = await supabase!.from("recipe_review").update(updateData).eq("id", reviewId);

    if (error) throw error;

    // Handle photo changes if provided
    if (input.photos) {
      // Delete existing photos
      await supabase!.from("review_photo").delete().eq("review_id", reviewId);

      // ⚡ Bolt Performance Optimization: Replaced sequential await for photo uploads with Promise.all to enable concurrent uploading, reducing total upload latency.
      // Additionally bulk insert the database records instead of running N+1 queries.
      const userId = await getCurrentUserId();
      if (userId && input.photos.length > 0) {
        await uploadReviewPhotos(userId, reviewId, input.photos);
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
    const { error } = await supabase!
      .from("recipe_tip")
      .update({ body: input.body })
      .eq("id", tipId);
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
