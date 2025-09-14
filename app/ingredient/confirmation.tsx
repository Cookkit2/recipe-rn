import React, { useEffect } from "react";
import { View, Keyboard, TouchableWithoutFeedback } from "react-native";
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCameraStore } from "~/store/CameraContext";
import Header from "~/components/Shared/Header";
import { H1, H4 } from "~/components/ui/typography";
import HorizontalIngredientItemCard from "~/components/Confirmation/HorizontalIngredientItemCard";
import { Button } from "~/components/ui/button";
import TextShimmer from "~/components/ui/TextShimmer";
import { SystemBars } from "react-native-edge-to-edge";

export default function ConfirmationPage() {
  const { bottom } = useSafeAreaInsets();
  const { processPantryItems } = useCameraStore();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  

  useEffect(() => {
    // Push a new system bar style when the screen mounts
    const entry = SystemBars.pushStackEntry({
      style: "auto",
    });

    // Pop it back when leaving (to restore previous settings)
    return () => {
      SystemBars.popStackEntry(entry);
    };
  }, []);

  const onSaveAllRecipe = () => {
    // TODO: Implement save all recipe logic
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
        >
          <Header title="Confirmation" scrollOffset={scrollOffset} />
          <View className="p-6 pb-4 flex-row items-center gap-3">
            <H1 className="font-bowlby-one pt-2">Confirmation</H1>
          </View>
          <Animated.FlatList
            numColumns={1}
            className="pb-3 pt-0 px-3"
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 64 + bottom }}
            showsVerticalScrollIndicator={false}
            data={processPantryItems}
            // data={processedImages}
            renderItem={({ item }) => (
              <HorizontalIngredientItemCard
                key={item.id}
                item={item}
                onBeginTitleEditing={() => {}}
                onEndTitleEditing={() => {}}
              />
            )}
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
        >
          <TextShimmer className="flex-row items-center gap-2 justify-center">
            <H4 className="text-background font-urbanist font-semibold">
              Save
            </H4>
          </TextShimmer>
        </Button>
      </View>
    </View>
  );
}
