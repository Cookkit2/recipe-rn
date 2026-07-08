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
  const [hasVoted, setHasVoted] = useState(false);

  const isEdited =
    new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 60_000;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleToggleHelpful = () => {
    setHasVoted(!hasVoted);
    onToggleHelpful(review.id);
  };

  return (
    <View className="py-4 border-b border-border/50">
      <View className="flex-row items-center gap-3 mb-2">
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
            {isEdited && <Small className="text-muted-foreground/60">(edited)</Small>}
          </View>
          <Small className="text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString()}
          </Small>
        </View>
      </View>

      {review.title && <P className="font-urbanist-semibold mb-1">{review.title}</P>}

      <Pressable
        onPress={toggleExpand}
        disabled={!review.body}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Collapse review" : "Expand review"}
        accessibilityState={{ expanded }}
      >
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

      {review.photos.length > 0 && (
        <View className="flex-row gap-2 mt-3">
          {review.photos.map((photo) => (
            <Pressable
              key={photo.id}
              onPress={() => onPhotoPress(photo.photoUrl)}
              accessibilityRole="button"
              accessibilityLabel="View full size photo"
            >
              <Image
                source={{ uri: photo.photoUrl }}
                className="w-20 h-20 rounded-lg"
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
      )}

      <View className="flex-row items-center justify-between mt-3">
        <HelpfulButton
          count={review.helpfulCount + (hasVoted ? 1 : 0)}
          isVoted={hasVoted}
          onPress={handleToggleHelpful}
        />

        {isOwnReview && (
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => onEdit(review)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit review"
            >
              <Small className="text-primary">Edit</Small>
            </Pressable>
            <Pressable
              onPress={() => onDelete(review.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Delete review"
            >
              <Small className="text-destructive">Delete</Small>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
