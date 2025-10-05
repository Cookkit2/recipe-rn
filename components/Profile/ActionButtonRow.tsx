import { ChefHatIcon, ReceiptIcon } from "lucide-nativewind";
import React from "react";
import { Pressable, View } from "react-native";
import { CardContent } from "../ui/card";
import { P } from "../ui/typography";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActionButtonRow() {
  const router = useRouter();
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
    useButtonAnimation(true, 24);

  return (
    <View className="flex-row px-6 mt-6 gap-6 ">
      <AnimatedPressable
        className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none bg-card"
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push("/profile/cooked-recipes")}
        style={[animatedStyle, roundedStyle]}
      >
        <CardContent className="py-6 flex gap-3">
          <ChefHatIcon size={32} strokeWidth={1.618} />
          <P className="font-urbanist-medium">Cooked Recipes</P>
        </CardContent>
      </AnimatedPressable>
      <AnimatedPressable className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none bg-card">
        <CardContent className="py-6 flex gap-3">
          <ReceiptIcon size={32} strokeWidth={1.618} />
          <View className="flex flex-row gap-1 items-center">
            <P className="font-urbanist-medium">Receipts</P>
            <View className="rounded-full bg-primary/10 px-3 ml-2">
              <P className="text-sm text-primary font-urbanist-medium">Soon</P>
            </View>
          </View>
        </CardContent>
      </AnimatedPressable>
    </View>
  );
}
