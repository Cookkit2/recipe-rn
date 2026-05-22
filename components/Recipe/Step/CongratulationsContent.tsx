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

        <Button className="rounded-2xl bg-primary" onPress={() => setRateModalVisible(true)}>
          <Small className="font-urbanist-semibold text-primary-foreground">Rate This Recipe</Small>
        </Button>
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
  fill: {
    width: "100%",
    height: "100%",
  },
});
