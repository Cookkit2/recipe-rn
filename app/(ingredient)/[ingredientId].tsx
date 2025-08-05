import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View, StyleSheet } from "react-native";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { dummyPantryItems } from "~/data/dummy-data";
import Animated, { FadeIn } from "react-native-reanimated";
import { H1, P } from "~/components/ui/typography";
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
import { SlidingNumber } from "~/components/SlidingNumber";
import { SheetScreen } from "react-native-sheet-transitions";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import useImageColors from "~/hooks/useImageColors";
import { LinearGradient } from "expo-linear-gradient";

export default function IngredientDetailsPage() {
  const { top: pt } = useSafeAreaInsets();
  const router = useRouter();
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();

  const [isFav, setIsFav] = useState(false);

  const [quantity, setQuantity] = useState(1);

  const item = dummyPantryItems.find(
    (item) => item.id === parseInt(ingredientId, 10)
  ); // Fetch ingredient details based on ingredientId

  // const color = useImageColors(item?.image_url.toString());

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center">Ingredient not found</H1>
      </View>
    );
  }

  return (
    <GestureHandlerRootView>
      <SheetScreen
        onClose={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        }}
        dragDirections={{
          toBottom: true,
          toLeft: true,
          toRight: true,
          toTop: false,
        }}
        customBackground={
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        }
        disableRootScale
        // opacityOnGestureMove={true}
        containerRadiusSync={true}
        initialBorderRadius={24}
        onCloseStart={() => {
          // Warn user they can release to close
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}
      >
        <View className="flex-1 bg-background">
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
              className="relative w-full bg-muted flex items-center justify-center rounded-b-2xl"
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
          </View>
        </View>
      </SheetScreen>
    </GestureHandlerRootView>
  );
}
