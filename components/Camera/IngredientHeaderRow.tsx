import React from "react";
import { Alert, Pressable, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import IngredientThumbnail from "../Ingredient/IngredientThumbnail";
import { Button } from "../ui/button";
import { XIcon } from "lucide-uniwind";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import { P } from "../ui/typography";

export default function IngredientHeaderRow() {
  const router = useRouter();
  const { processPantryItems } = useCreateIngredientStore();

  // needs_review and finished items go to confirmation, where the inline
  // correction UI (HorizontalIngredientItemCard) lets the user fix a
  // hallucinated/missed name before saving — this keeps the correction
  // affordance prominent (#728). A manual-entry fallback is always one tap away.
  const onConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/ingredient/confirmation");
  };

  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (processPantryItems.length > 0) {
      Alert.alert(
        "Discard Items?",
        "Are you sure you want to go back? Your captured images won't be saved.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            },
          },
        ]
      );
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    }
  };
  return (
    <View className="w-full flex flex-row justify-between items-center py-4">
      {processPantryItems.length === 0 && (
        <P className="text-white pl-4 font-urbanist-regular">Logged ingredients will appear here</P>
      )}
      <Animated.FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="pl-4"
        fadingEdgeLength={10}
        data={processPantryItems}
        keyExtractor={(item) => item.id}
        itemLayoutAnimation={LinearTransition.springify()
          .damping(15)
          .mass(1)
          .stiffness(150)
          .overshootClamping(0)}
        renderItem={({ item }) => (
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={
              item.status === "needs_review"
                ? "Review low-confidence ingredient"
                : "Select ingredient"
            }
          >
            <IngredientThumbnail key={item.id} item={item} />
          </Pressable>
        )}
      />
      <View className="flex-row items-center">
        <Button
          size="icon-sm"
          variant="ghost"
          className="rounded-full mx-4"
          onPress={onBack}
          accessibilityLabel="Close camera"
        >
          <XIcon className="text-white" size={20} />
        </Button>
      </View>
    </View>
  );
}
