import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import Animated, { Easing, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import { H4, P } from "~/components/ui/typography";
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
import {
  scheduleExpiryNotifications,
  requestNotificationPermissions,
  getNotificationPermissions,
} from "~/lib/notifications";

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

  const completedItems = processPantryItems.filter((item) => item.status === undefined);

  const onSaveAllIngredients = useCallback(async () => {
    try {
      setIsSavingIngredients(true);
      await presentPaywallIfNeeded();
      const savedItems = await addPantryItemsWithMetadata.mutateAsync(completedItems);

      // Schedule expiry notifications for saved items (using DB-assigned IDs)
      try {
        const { granted } = await getNotificationPermissions();
        if (!granted) {
          await requestNotificationPermissions();
        }
        await scheduleExpiryNotifications(savedItems);
      } catch {
        // Non-critical: don't block save flow if notifications fail
      }

      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      router.dismissTo("/");
    } catch {
      toast.error("Error saving ingredients");
    } finally {
      setIsSavingIngredients(false);
    }
  }, [addPantryItemsWithMetadata, completedItems, queryClient, router]);

  // Memoized render item to prevent re-creation on each render
  const renderItem = useCallback(
    ({ item }: { item: (typeof processPantryItems)[number] }) => (
      <HorizontalIngredientItemCard item={item} />
    ),
    []
  );

  return (
    <>
      <Animated.FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={processPantryItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        itemLayoutAnimation={LinearTransition.easing(Easing.out(Easing.cubic))}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 80 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        className="px-3 pb-3 bg-background"
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        windowSize={5}
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

      {/* Fixed footer button */}
      <View
        pointerEvents="box-none"
        className="absolute inset-0 justify-end items-center"
        style={{ paddingBottom: bottom + 8 }}
      >
        <Button
          size="lg"
          variant="secondary"
          className="rounded-2xl border-continuous bg-foreground/80"
          onPress={onSaveAllIngredients}
          disabled={
            isSavingIngredients || processPantryItems.length === 0 || completedItems.length === 0
          }
        >
          <TextShimmer className="flex-row items-center gap-2 justify-center">
            {isSavingIngredients && <ActivityIndicator />}
            <H4 className="text-background font-urbanist font-semibold">Save</H4>
          </TextShimmer>
        </Button>
      </View>
    </>
  );
}
