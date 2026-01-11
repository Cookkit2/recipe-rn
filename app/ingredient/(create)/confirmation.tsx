import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
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

export default function ConfirmationPage() {
  const { bottom } = useSafeAreaInsets();
  const { processPantryItems } = useCreateIngredientStore();

  const queryClient = useQueryClient();
  const router = useRouter();
  const addPantryItemsWithMetadata = useAddPantryItemsWithMetadata();

  const [isSavingIngredients, setIsSavingIngredients] = useState(false);

  useEffect(() => {
    setStatusBarStyle("auto", true);
  }, []);

  const completedItems = processPantryItems.filter(
    (item) => item.status === undefined
  );

  const onSaveAllIngredients = useCallback(async () => {
    try {
      setIsSavingIngredients(true);
      await presentPaywallIfNeeded();
      await addPantryItemsWithMetadata.mutateAsync(processPantryItems);
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      router.dismissTo("/");
    } catch {
      toast.error("Error saving ingredients");
    } finally {
      setIsSavingIngredients(false);
    }
  }, [processPantryItems]);

  return (
    <View className="flex-1 relative bg-background">
      <Header title="Confirmation" />
      <Animated.FlatList
        data={processPantryItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HorizontalIngredientItemCard item={item} />}
        itemLayoutAnimation={LinearTransition.springify()
          .damping(20)
          .mass(1)
          .stiffness(300)
          .overshootClamping(0)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 80 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        className="px-3 pb-3"
        ListHeaderComponent={() => (
          <H1 className="font-bowlby-one p-6 pb-4">Confirmation</H1>
        )}
        ListEmptyComponent={() => (
          <View className="py-16 items-center justify-center">
            <H4 className="text-muted-foreground text-center font-urbanist-semibold">
              There is nothing to be added
            </H4>
            <P className="text-muted-foreground text-center font-urbanist-regular text-sm mt-1">
              Go back to take more photos
            </P>
          </View>
        )}
      />
      <View
        className="absolute left-0 right-0 flex-row justify-center"
        style={{ bottom: bottom + 8 }}
      >
        <Button
          size="lg"
          variant="secondary"
          className="rounded-2xl border-continuous bg-foreground/80"
          onPress={onSaveAllIngredients}
          // on allow save when there are all completed items
          disabled={
            isSavingIngredients ||
            processPantryItems.length === 0 ||
            completedItems.length === 0
          }
        >
          <TextShimmer className="flex-row items-center gap-2 justify-center">
            {isSavingIngredients && <ActivityIndicator />}
            <H4 className="text-background font-urbanist font-semibold">
              Save
            </H4>
          </TextShimmer>
        </Button>
      </View>
    </View>
  );
}
