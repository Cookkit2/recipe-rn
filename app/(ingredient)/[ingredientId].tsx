import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { dummyPantryItems } from "~/data/dummy-data";
import Animated, { FadeIn } from "react-native-reanimated";
import { H1, H2, H3, H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import {
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
} from "~/lib/icons/IngredientIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { Separator } from "~/components/ui/separator";

export default function IngredientDetailsPage() {
  const { top: pt } = useSafeAreaInsets();
  const router = useRouter();
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();

  const [isFav, setIsFav] = useState(false);

  const item = dummyPantryItems.find(
    (item) => item.id === parseInt(ingredientId, 10)
  ); // Fetch ingredient details based on ingredientId

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center">Ingredient not found</H1>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Hero Image Section */}
      <Animated.View sharedTransitionTag="pantry-item-image-container">
        <AspectRatio className="relative w-full rounded-2xl bg-muted flex items-center justify-center">
          <Animated.Image
            sharedTransitionTag="pantry-item-image"
            source={item.image_url}
            className="w-32 h-32"
            resizeMode="contain"
            style={{ marginTop: pt }}
          />
          {/* Navigation Buttons */}
          <Button
            size="icon"
            variant="secondary"
            className="absolute left-4 rounded-full"
            style={{ top: 16 + pt }}
          >
            <ArrowLeftIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
              onPress={() => router.back()}
            />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            className="absolute right-4 rounded-full"
            style={{ top: 16 + pt }}
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
        </AspectRatio>
      </Animated.View>

      {/* Content Section */}
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <Animated.Text
          entering={FadeIn}
          className="web:scroll-m-20 text-4xl text-foreground font-extrabold tracking-tight lg:text-5xl web:select-text mb-2 font-bold text-center"
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
          <Button size="icon" variant="ghost" className="rounded-full">
            <MinusIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
          <Separator orientation="vertical" />
          <H3 className="opacity-80">{item.quantity}</H3>
          <Separator orientation="vertical" />
          <Button size="icon" variant="ghost" className="rounded-full">
            <PlusIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
