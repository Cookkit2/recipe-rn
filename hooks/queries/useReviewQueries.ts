import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { reviewQueryKeys } from "./reviewQueryKeys";
import { reviewApi } from "~/data/supabase-api/ReviewApi";
import type {
  ReviewSortOption,
  CreateReviewInput,
  UpdateReviewInput,
  CreateTipInput,
  UpdateTipInput,
} from "~/types/Review";
import { invalidateReviewCaches } from "./queryInvalidationUtils";

const PAGE_SIZE = 10;

export function useRecipeReviews(recipeId: string, sort: ReviewSortOption = "newest") {
  return useInfiniteQuery({
    queryKey: reviewQueryKeys.list(recipeId, sort, 0),
    queryFn: ({ pageParam = 0 }) =>
      reviewApi.fetchRecipeReviews(recipeId, pageParam as number, sort, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
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
      invalidateReviewCaches(queryClient, variables.recipeId);
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      input,
      recipeId: parentRecipeId,
    }: {
      reviewId: string;
      input: UpdateReviewInput;
      recipeId: string;
    }) => reviewApi.updateReview(reviewId, input),
    onSuccess: (_data, variables) => {
      invalidateReviewCaches(queryClient, variables.recipeId);
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.detail(variables.reviewId) });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, recipeId: parentRecipeId }: { reviewId: string; recipeId: string }) =>
      reviewApi.deleteReview(reviewId),
    onSuccess: (_data, variables) => {
      invalidateReviewCaches(queryClient, variables.recipeId);
    },
  });
}

export function useToggleHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, recipeId: parentRecipeId }: { reviewId: string; recipeId: string }) =>
      reviewApi.toggleHelpful(reviewId),
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
      recipeId: parentRecipeId,
    }: {
      tipId: string;
      input: UpdateTipInput;
      recipeId: string;
    }) => reviewApi.updateTip(tipId, input),
    onSuccess: (_data, variables) => {
      const { recipeId } = variables;
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.tips(recipeId) });
    },
  });
}

export function useDeleteTip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tipId, recipeId: parentRecipeId }: { tipId: string; recipeId: string }) =>
      reviewApi.deleteTip(tipId),
    onSuccess: (_data, variables) => {
      const { recipeId } = variables;
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.tips(recipeId) });
    },
  });
}

export function useToggleTipHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tipId, recipeId: parentRecipeId }: { tipId: string; recipeId: string }) =>
      reviewApi.toggleTipHelpful(tipId),
    onSuccess: (_data, variables) => {
      const { recipeId } = variables;
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.tips(recipeId) });
    },
  });
}
