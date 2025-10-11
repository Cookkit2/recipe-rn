import React, { useEffect, useTransition } from "react";
import {
  View,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedRef,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import Header from "~/components/Shared/Header";
import { H1, H4, P } from "~/components/ui/typography";
import HorizontalIngredientItemCard from "~/components/Confirmation/HorizontalIngredientItemCard";
import { Button } from "~/components/ui/button";
import TextShimmer from "~/components/ui/TextShimmer";
import { setStatusBarStyle } from "expo-status-bar";
import { useAddPantryItemsWithMetadata } from "~/hooks/queries/usePantryQueries";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import { presentPaywallIfNeeded } from "~/utils/subscription-utils";
import { useQueryClient } from "@tanstack/react-query";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";
import { LegendList } from "@legendapp/list";

export default function ConfirmationPage() {
  const { bottom } = useSafeAreaInsets();
  const { processPantryItems } = useCreateIngredientStore();

  const queryClient = useQueryClient();
  const router = useRouter();
  const addPantryItemsWithMetadata = useAddPantryItemsWithMetadata();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useSharedValue(0);

  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    setStatusBarStyle("auto", true);
  }, []);

  const onSaveAllRecipe = () => {
    startTransition(async () => {
      await presentPaywallIfNeeded();

      try {
        await addPantryItemsWithMetadata.mutateAsync(processPantryItems);
        queryClient.invalidateQueries({
          queryKey: recipeQueryKeys.recommendations(),
        });
        router.dismissTo("/");
      } catch {
        toast.error("Error saving all recipe");
      }
    });
  };

  return (
    <View className="flex-1 relative bg-background">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottom }}
          ref={scrollRef}
          stickyHeaderIndices={[0]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={(e) => {
            scrollOffset.value = e.nativeEvent.contentOffset.y;
          }}
        >
          <Header title="Confirmation" scrollOffset={scrollOffset} />
          <View className="p-6 pb-4 flex-row items-center gap-3">
            <H1 className="font-bowlby-one pt-2">Confirmation</H1>
          </View>
          <LegendList
            keyExtractor={(item) => item.id.toString()}
            recycleItems
            numColumns={1}
            className="pb-3 pt-0 px-3"
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 64 + bottom }}
            showsVerticalScrollIndicator={false}
            data={processPantryItems}
            renderItem={({ item }) => (
              <HorizontalIngredientItemCard key={item.id} item={item} />
            )}
            ListEmptyComponent={
              <View className="py-16 items-center justify-center">
                <H4 className="text-muted-foreground text-center font-urbanist-semibold">
                  There is nothing to be added
                </H4>
                <P className="text-muted-foreground text-center font-urbanist-regular text-sm mt-1">
                  Go back to take more photos
                </P>
              </View>
            }
          />
        </Animated.ScrollView>
      </TouchableWithoutFeedback>
      <View
        className="absolute left-0 right-0 flex-row justify-center"
        style={[{ bottom: bottom + 8 }]}
      >
        <Button
          size="lg"
          variant="secondary"
          className="rounded-2xl border-continuous bg-foreground/80"
          onPress={onSaveAllRecipe}
          disabled={isLoading || processPantryItems.length === 0}
        >
          <TextShimmer className="flex-row items-center gap-2 justify-center">
            {isLoading && <ActivityIndicator />}
            <H4 className="text-background font-urbanist font-semibold">
              Save
            </H4>
          </TextShimmer>
        </Button>
      </View>
    </View>
  );
}
