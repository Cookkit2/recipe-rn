import { useState, useCallback } from "react";
import { Alert } from "react-native";
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
import type {
  ReviewWithAuthor,
  TipWithAuthor,
  ReviewSortOption,
  CreateReviewInput,
} from "~/types/Review";

export function useRecipeReviewsAndTips(recipeId: string) {
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
        createReview.mutate({ recipeId, input }, { onSuccess: () => setReviewModalVisible(false) });
      }
    },
    [editingReview, createReview, updateReview, recipeId]
  );

  const handleToggleReviewHelpful = useCallback(
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
        createTip.mutate({ recipeId, input }, { onSuccess: () => setTipModalVisible(false) });
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

  return {
    reviewsEnabled,
    reviewSort,
    setReviewSort,
    reviewModalVisible,
    setReviewModalVisible,
    editingReview,
    tipModalVisible,
    setTipModalVisible,
    editingTip,
    reviewSummary,
    hasMoreReviews,
    isFetchingMoreReviews,
    userReview,
    tips,
    allReviews,
    fetchMoreReviews,
    handleOpenWriteReview,
    handleEditReview,
    handleDeleteReview,
    handleSubmitReview,
    handleToggleReviewHelpful,
    handleAddTip,
    handleEditTip,
    handleDeleteTip,
    handleSubmitTip,
    handleToggleTipHelpful,
    isSubmittingReview: createReview.isPending || updateReview.isPending,
    isSubmittingTip: createTip.isPending || updateTip.isPending,
  };
}
