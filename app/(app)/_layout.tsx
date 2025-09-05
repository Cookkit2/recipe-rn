import React, { useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useRootScale } from "~/store/context/RootScaleContext";
import { useColorScheme } from "~/hooks/useColorScheme";

export default function AppLayout() {
  const { scale } = useRootScale();
  const [isModalActive, setIsModalActive] = useState(false);
  const [canBlur, setCanBlur] = useState(false);
  const { isDarkColorScheme } = useColorScheme();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        {
          translateY: (1 - scale.value) * -150,
        },
      ],
    };
  });

  return (
    <View className="flex-1 bg-background">
      {isModalActive && canBlur && (
        <BlurView
          intensity={50}
          className="absolute inset-0 z-1"
          tint={isDarkColorScheme ? "dark" : "light"}
        />
      )}
      <Animated.View
        className="flex-1 overflow-hidden rounded-sm"
        style={[animatedStyle]}
      >
        <Stack>
          <Stack.Screen
            name="(ingredient)/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(ingredient)/[ingredientId]"
            options={{
              headerShown: false,
              presentation: "transparentModal",
              contentStyle: { backgroundColor: "transparent" },
            }}
            listeners={{
              focus: () => {
                setIsModalActive(true);
                setCanBlur(true);
              },
              beforeRemove: () => {
                setIsModalActive(false);
                setCanBlur(false);
              },
            }}
          />
          <Stack.Screen
            name="(ingredient)/create"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen
            name="recipes/index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="recipes/[recipeId]/index"
            options={{
              presentation: "card",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="recipes/[recipeId]/steps"
            options={{
              presentation: "card",
            }}
          />
        </Stack>
      </Animated.View>
    </View>
  );
}
