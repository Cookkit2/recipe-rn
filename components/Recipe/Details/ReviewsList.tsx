import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Small } from "~/components/ui/typography";
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
    return null;
  }

  return (
    <View className="mb-6">
      <View className="flex-row gap-2 mb-4">
        {(["newest", "most_helpful"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => onSortChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: sort === option }}
            accessibilityLabel={`Sort by ${option === "newest" ? "Newest" : "Most Helpful"}`}
            className={`px-3 py-1.5 rounded-full border ${
              sort === option ? "bg-foreground border-foreground" : "bg-transparent border-border"
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

      {hasMore && (
        <Pressable
          onPress={onLoadMore}
          className="py-4 items-center"
          disabled={isFetchingNextPage}
          accessibilityRole="button"
          accessibilityLabel="Load more reviews"
          accessibilityState={{ disabled: isFetchingNextPage, busy: isFetchingNextPage }}
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
