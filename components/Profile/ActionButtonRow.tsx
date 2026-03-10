import { CalendarIcon, ChefHatIcon, LeafIcon, ShoppingCartIcon } from "lucide-uniwind";
import React from "react";
import { Pressable, View } from "react-native";
import { CardContent } from "../ui/card";
import { P } from "../ui/typography";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActionButtonRow() {
  const router = useRouter();
  const {
    animatedStyle: cookedAnimatedStyle,
    roundedStyle: cookedRoundedStyle,
    onPressIn: onCookedPressIn,
    onPressOut: onCookedPressOut,
  } = useButtonAnimation(true, 24);

  const {
    animatedStyle: groceryAnimatedStyle,
    roundedStyle: groceryRoundedStyle,
    onPressIn: onGroceryPressIn,
    onPressOut: onGroceryPressOut,
  } = useButtonAnimation(true, 24);

  const {
    animatedStyle: analyticsAnimatedStyle,
    roundedStyle: analyticsRoundedStyle,
    onPressIn: onAnalyticsPressIn,
    onPressOut: onAnalyticsPressOut,
  } = useButtonAnimation(true, 24);

  const onCookedRecipesPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/profile/cooked-recipes");
  };

  const onGroceryListPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/grocery-list");
  };

  const onAnalyticsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/profile/analytics");
  };

  return (
    <View className="flex-row px-6 mt-6 gap-6 ">
      <AnimatedPressable
        className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none bg-card"
        onPressIn={onCookedPressIn}
        onPressOut={onCookedPressOut}
        onPress={onCookedRecipesPress}
        style={[cookedAnimatedStyle, cookedRoundedStyle]}
      >
        <CardContent className="py-6 flex gap-3">
          <ChefHatIcon className="text-foreground" size={32} strokeWidth={1.618} />
          <P className="font-urbanist-medium">Cooked Recipes</P>
        </CardContent>
      </AnimatedPressable>
      <AnimatedPressable
        className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none bg-card"
        onPressIn={onGroceryPressIn}
        onPressOut={onGroceryPressOut}
        onPress={onGroceryListPress}
        style={[groceryAnimatedStyle, groceryRoundedStyle]}
      >
        <CardContent className="py-6 flex gap-3">
          <ShoppingCartIcon className="text-foreground" size={32} strokeWidth={1.618} />
          <View className="flex flex-row gap-1 items-center">
            <P className="font-urbanist-medium">Grocery Lists</P>
          </View>
        </CardContent>
      </AnimatedPressable>
      {/* <AnimatedPressable
        className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none bg-card"
        onPressIn={onAnalyticsPressIn}
        onPressOut={onAnalyticsPressOut}
        onPress={onAnalyticsPress}
        style={[analyticsAnimatedStyle, analyticsRoundedStyle]}
      >
        <CardContent className="py-6 flex gap-3">
          <LeafIcon className="text-foreground" size={32} strokeWidth={1.618} />
          <P className="font-urbanist-medium">Analytics</P>
        </CardContent>
      </AnimatedPressable> */}
    </View>
  );
}
