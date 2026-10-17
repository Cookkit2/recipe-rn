import React, { useState } from "react";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import { H2, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import { Image } from "expo-image";
import MaskedView from "@expo/ui/community/masked-view";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { formatDuration } from "~/utils/time-formatter";
import RateRecipeModal from "./RateRecipeModal";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";
import { useCreateReview } from "~/hooks/queries/useReviewQueries";
import WriteReviewModal from "~/components/Recipe/Details/WriteReviewModal";
import { useRecordCooking } from "~/hooks/queries/useCookingHistoryQueries";

const CongratulationsContent = () => {
  const { recipe, duration } = useRecipeSteps();
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [pendingRating, setPendingRating] = useState<number | undefined>(undefined);
  const [pendingNotes, setPendingNotes] = useState("");
  const { enabled: reviewsEnabled } = useFeatureFlag("ratings_and_reviews");

  const recordCooking = useRecordCooking();
  const createReview = useCreateReview();

  const handleSaveRating = (rating: number | undefined, notes: string) => {
    if (!recipe?.id) return;

    recordCooking.mutate(
      {
        recipeId: recipe.id,
        data: { rating: rating ?? undefined, notes: notes || undefined },
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

  const handleSubmitPublicReview = (input: {
    rating: number;
    title?: string;
    body: string;
    photos: Array<{ uri: string; position: number }>;
  }) => {
    if (!recipe?.id) return;
    createReview.mutate(
      { recipeId: recipe.id, input },
      { onSuccess: () => setReviewModalVisible(false) }
    );
  };

  return (
    <>
      <View className="flex-1 bg-black rounded-3xl border-continuous overflow-hidden border-2 border-foreground">
        <ScrollView className="flex-1" contentContainerStyle={styles.content}>
          <View className="w-full items-center gap-2">
            <P className="text-center text-white/90 font-urbanist-medium">You've completed</P>
            <H2 className="text-2xl leading-8 text-primary font-bowlby-one text-center pb-0">
              {recipe.title}
            </H2>
          </View>

          <View style={styles.image}>
            <MaskedView
              style={styles.fill}
              maskElement={<ShapeContainer index={12} text="" width="100%" height="100%" />}
            >
              <Image source={{ uri: recipe.imageUrl }} style={styles.fill} contentFit="cover" />
            </MaskedView>
          </View>

          <View className="items-center gap-2">
            <P className="text-center text-white/90 font-urbanist-semibold">
              Completed in{" "}
              <P className="text-primary font-urbanist-semibold">
                {duration ? formatDuration(duration) : "..."}
              </P>
              !
            </P>
            <P className="text-sm text-center text-white/70 font-urbanist-regular">
              Great job following and enjoy your dishes!
            </P>
          </View>

          <Button variant="link" size="sm" onPress={() => setRateModalVisible(true)}>
            <Text className="text-sm font-urbanist-semibold text-white/70 underline">
              Rate this recipe
            </Text>
          </Button>
        </ScrollView>
      </View>

      <RateRecipeModal
        modalVisible={rateModalVisible}
        onCancel={() => setRateModalVisible(false)}
        onSave={handleSaveRating}
        onSkip={() => setRateModalVisible(false)}
        isSaving={recordCooking.isPending}
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
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  image: {
    width: "70%",
    maxWidth: 200,
    aspectRatio: 1,
    flexShrink: 0,
  },
  fill: {
    width: "100%",
    height: "100%",
  },
});
