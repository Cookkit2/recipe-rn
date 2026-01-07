import React, { useEffect, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { H1, P } from "~/components/ui/typography";
import IngredientWrapper from "~/components/Ingredient/IngredientWrapper";
import SheetModalWrapper from "~/components/Shared/SheetModalWrapper";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { Button } from "~/components/ui/button";
import { IngredientDetailProvider } from "~/store/IngredientDetailContext";
import { setStatusBarStyle } from "expo-status-bar";

export default function IngredientPage() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const router = useRouter();
  const {
    data: filteredPantryItems = [],
    isLoading,
    error,
  } = usePantryItemsByType("all");

  const item = useMemo(() => {
    return filteredPantryItems.find((item) => item.id === ingredientId);
  }, [filteredPantryItems, ingredientId]);

  useEffect(() => {
    setStatusBarStyle("light", true);

    return () => setStatusBarStyle("auto", true);
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator size="large" />
        <P className="mt-1 text-muted-foreground">Loading ingredient...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center font-urbanist-black">
          Ingredient not found
        </H1>
        <P className="mt-2 text-muted-foreground text-center font-urbanist">
          The ingredient you're looking for doesn't exist.
        </P>
        <Button variant="ghost" className="mt-6" onPress={() => router.back()}>
          <P className="text-center font-urbanist">Go Back</P>
        </Button>
      </View>
    );
  }

  return (
    <IngredientDetailProvider item={item}>
      {Platform.OS === "ios" ? <WithSheetModal /> : <DefaultIngredientView />}
    </IngredientDetailProvider>
  );
}

const DefaultIngredientView = () => {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const ScrollComponent = (
    props: React.ComponentProps<typeof Animated.ScrollView>
  ) => <Animated.ScrollView {...props} ref={scrollRef} />;

  return (
    <IngredientWrapper
      ScrollComponent={ScrollComponent}
      scrollRef={scrollRef}
    />
  );
};

const WithSheetModal = () => {
  return (
    <SheetModalWrapper>
      {({ ScrollComponent, scrollRef }) => {
        return (
          <IngredientWrapper
            ScrollComponent={ScrollComponent}
            scrollRef={scrollRef}
          />
        );
      }}
    </SheetModalWrapper>
  );
};
