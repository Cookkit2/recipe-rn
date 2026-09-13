import React, { useState, useEffect } from "react";
import { View, TextInput, ActivityIndicator, Alert } from "react-native";
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
      photos: [],
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

        <View className="items-center mb-4">
          <StarRating rating={rating} size={36} interactive onRatingChange={setRating} />
          {rating > 0 && (
            <Small className="text-muted-foreground mt-2">
              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
            </Small>
          )}
        </View>

        <View className="mb-3">
          <P className="text-sm font-urbanist-medium text-foreground mb-1">Title (optional)</P>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Summarize your experience"
            placeholderTextColor="#999"
            maxLength={MAX_TITLE_LENGTH}
            className="w-full rounded-lg bg-muted px-3 py-2 text-base font-urbanist-regular border-continuous"
            editable={!isSubmitting}
            accessibilityLabel="Title (optional)"
          />
        </View>

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
            accessibilityLabel="Review"
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
