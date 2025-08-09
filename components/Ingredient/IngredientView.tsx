import { router } from "expo-router";

import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SlidingNumber } from "~/components/SlidingNumber";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PantryItem } from "~/types/PantryItem";
import { BlurView } from "expo-blur";
import {
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
} from "~/lib/icons/IngredientIcons";

interface IngredientViewProps {
  scrollComponent: (props: any) => React.ReactElement;
  ingredient: PantryItem; // Replace with actual ingredient type
}

export default function IngredientView({
  scrollComponent,
  ingredient: item,
}: IngredientViewProps) {
  const ScrollComponentToUse = scrollComponent || ScrollView;
  const { top: pt } = useSafeAreaInsets();

  const [isFav, setIsFav] = useState(false);
  const [quantity, setQuantity] = useState(1);

  return (
    <BlurView
      intensity={85}
      tint="systemThickMaterialDark"
      className="flex-1 h-full w-full rounded-t-3xl overflow-hidden bg-background"
    >
      {/* App Bar Section */}
      <View
        className="flex-row items-center justify-between px-6 pt-4 bg-muted"
        style={{ paddingTop: pt }}
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

      {/* Hero Image Section */}
      <Animated.View sharedTransitionTag="pantry-item-image-container">
        <AspectRatio
          className="relative w-full bg-muted flex items-center justify-center rounded-b-2xl -mt-1"
          ratio={4 / 3}
        >
          <Animated.Image
            sharedTransitionTag="pantry-item-image"
            source={item.image_url}
            className="w-32 h-32"
            resizeMode="contain"
            style={{ marginBottom: pt }}
          />
          {/* {color && (
                <LinearGradient
                  // Background Linear Gradient
                  colors={[color, "transparent"]}
                  className="absolute left-0 top-0 bottom-0"
                />
              )} */}
        </AspectRatio>
      </Animated.View>

      {/* Content Section */}
      <ScrollComponentToUse
        className="flex-1 px-6 py-8 bg-background rounded-t-3xl -mt-8"
        showsVerticalScrollIndicator={false}
        style={{ borderCurve: "continuous" }}
      >
        {/* Header */}
        <Animated.Text
          entering={FadeIn}
          className="web:scroll-m-20 text-4xl text-foreground font-bold tracking-tight lg:text-5xl web:select-text mb-2 font-bold text-center"
        >
          {item.name}
        </Animated.Text>
        {/* <H1 className="mb-2 font-bold text-center">{item.name}</H1> */}
        <View className="flex-row items-center justify-center gap-2 mb-12">
          <P className="text-muted-foreground">{item.type}</P>
          <P className="text-muted-foreground">•</P>
          <P className="text-muted-foreground">{item.category}</P>
        </View>
        <View className="flex-row items-center justify-center gap-4 mb-4">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onPress={() => setQuantity(quantity - 1)}
          >
            <MinusIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
          <Separator orientation="vertical" />
          <SlidingNumber value={quantity} />
          {/* <H3 className="opacity-80">{item.quantity}</H3> */}
          <Separator orientation="vertical" />
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onPress={() => setQuantity(quantity + 1)}
          >
            <PlusIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
        </View>
      </ScrollComponentToUse>
    </BlurView>
  );
}
