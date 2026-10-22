import { Stack } from "expo-router";

export function getMiscScreens({
  commonHeaderOptions,
  backgroundColor,
}: {
  commonHeaderOptions: React.ComponentProps<typeof Stack.Screen>["options"];
  backgroundColor: string;
}) {
  return [
    <Stack.Screen
      key="onboarding/index"
      name="onboarding/index"
      options={{ headerShown: false }}
    />,
    <Stack.Screen
      key="onboarding/tutorial"
      name="onboarding/tutorial"
      options={{
        presentation: "card",
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        headerBackButtonDisplayMode: "minimal",
      }}
    />,
    <Stack.Screen
      key="preferences/index"
      name="preferences/index"
      options={{ presentation: "modal", headerShown: false }}
    />,
    <Stack.Screen key="meal-plan" name="meal-plan" options={{ headerShown: false }} />,
    <Stack.Screen
      key="grocery-list/index"
      name="grocery-list/index"
      options={{ ...commonHeaderOptions, headerTitle: "Grocery List" }}
    />,
    <Stack.Screen
      key="leftovers/index"
      name="leftovers/index"
      options={{ ...commonHeaderOptions, headerTitle: "Leftovers" }}
    />,
    <Stack.Screen
      key="assistant/index"
      name="assistant/index"
      options={{
        ...commonHeaderOptions,
        headerTitle: "Assistant",
        headerTransparent: false,
        headerStyle: { backgroundColor },
        // A large title keeps resizing the iOS 26 navigation bar. The screen is
        // laid out under that bar, and safe-area insets lag the bar's frame.
        headerLargeTitleEnabled: false,
      }}
    />,
    <Stack.Screen
      key="(misc)/search"
      name="(misc)/search"
      options={{
        headerShown: false,
        headerTransparent: true,
        headerTitle: "",
        presentation: "card",
        animation: "fade",
        animationDuration: 100,
        headerBackVisible: false,
      }}
    />,
    <Stack.Screen key="(misc)/debug" name="(misc)/debug" options={{ headerShown: false }} />,
    <Stack.Screen key="+not-found" name="+not-found" />,
  ];
}
