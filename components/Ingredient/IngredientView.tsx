import { router } from "expo-router";

import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useScrollViewOffset,
  type AnimatedRef,
} from "react-native-reanimated";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PantryItem } from "~/types/PantryItem";
import { ArrowLeftIcon, StarIcon } from "~/lib/icons/IngredientIcons";
import OutlinedImage from "../ui/outlined-image";
import IngredientQuantity from "./IngredientQuantity";

interface IngredientViewProps {
  ScrollComponent: (
    props: React.ComponentProps<typeof ScrollView>
  ) => React.ReactElement;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  ingredient: PantryItem; // Replace with actual ingredient type
}

export default function IngredientView({
  ScrollComponent,
  scrollRef,
  ingredient: item,
}: IngredientViewProps) {
  const scrollOffset = useScrollViewOffset(scrollRef);
  const { top: pt } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const HEADER_HEIGHT = width;

  const [isFav, setIsFav] = useState(false);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [2, 1, 1]
          ),
        },
      ],
    };
  });

  return (
    <View className="relative flex-1 bg-background rounded-t-3xl overflow-hidden">
      {/* App Bar Section */}
      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-6 pt-4 z-10"
        style={{ top: pt }}
      >
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          onPress={() => router.back()}
        >
          <ArrowLeftIcon
            className="text-foreground"
            size={20}
            strokeWidth={2.618}
          />
        </Button>

        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          onPress={() => setIsFav(!isFav)}
        >
          {isFav ? (
            <StarIcon
              className="text-warning"
              fill="currentColor"
              size={20}
              strokeWidth={2.618}
            />
          ) : (
            <StarIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
            />
          )}
        </Button>
      </View>

      {/* Content Section */}
      <ScrollComponent
        // scrollEventThrottle={16}
        className="h-full flex-1 bg-background"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <Animated.View
          sharedTransitionTag="pantry-item-image-container"
          className="overflow-hidden flex items-center justify-center bg-muted"
          style={[
            {
              height: HEADER_HEIGHT,
            },
            headerAnimatedStyle,
          ]}
        >
          <OutlinedImage source={item.image_url} size={100} />
        </Animated.View>

        <View
          className="flex-1 bg-background rounded-t-3xl -mt-8 px-6 py-8"
          style={styles.borderCurve}
        >
          {/* Header */}
          <Animated.Text
            entering={FadeIn}
            className="web:scroll-m-20 text-4xl text-foreground font-bold tracking-tight lg:text-5xl web:select-text mb-2 text-center"
          >
            {item.name}
          </Animated.Text>
          {/* <H1 className="mb-2 font-bold text-center">{item.name}</H1> */}
          <View className="flex-row items-center justify-center gap-2 mb-12">
            <P className="text-muted-foreground">{item.type}</P>
            <P className="text-muted-foreground">•</P>
            <P className="text-muted-foreground">{item.category}</P>
          </View>
          <IngredientQuantity />
        </View>
      </ScrollComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  borderCurve: {
    borderCurve: "continuous",
  },
});
