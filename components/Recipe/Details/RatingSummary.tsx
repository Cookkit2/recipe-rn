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
        <H2 className="font-urbanist-bold text-xl">Ratings &amp; Reviews</H2>
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
          <View className="items-center justify-center min-w-[80px]">
            <H2 className="font-bowlby-one text-3xl">{avgRating.toFixed(1)}</H2>
            <StarRating rating={avgRating} size={16} />
            <Small className="text-muted-foreground mt-1">
              {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </Small>
          </View>

          <View className="flex-1 justify-center gap-1">
            {[5, 4, 3, 2, 1].map((star) => (
              <View key={star} className="flex-row items-center gap-2">
                <Small className="w-3 text-right text-muted-foreground">{star}</Small>
                <View className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <View
                    className="h-full rounded-full bg-yellow-500"
                    style={{ width: `${((dist[star] ?? 0) / maxCount) * 100}%` }}
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
