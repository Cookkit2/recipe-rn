import { Stack } from "expo-router";

export function getProfileScreens({
  commonHeaderOptions,
}: {
  commonHeaderOptions: React.ComponentProps<typeof Stack.Screen>["options"];
}) {
  return [
    <Stack.Screen
      key="profile/index"
      name="profile/index"
      options={{ ...commonHeaderOptions, headerTitle: "Profile" }}
    />,
    <Stack.Screen
      key="profile/cooked-recipes"
      name="profile/cooked-recipes"
      options={{ ...commonHeaderOptions, headerTitle: "Cooked Recipes" }}
    />,
    <Stack.Screen
      key="profile/analytics"
      name="profile/analytics"
      options={{ ...commonHeaderOptions, headerTitle: "Analytics" }}
    />,
    <Stack.Screen
      key="profile/nutrition-report"
      name="profile/nutrition-report"
      options={{ ...commonHeaderOptions, headerTitle: "Nutrition Report" }}
    />,
    <Stack.Screen
      key="profile/achievements"
      name="profile/achievements"
      options={{ ...commonHeaderOptions, headerTitle: "Achievements" }}
    />,
    <Stack.Screen
      key="profile/notification"
      name="profile/notification"
      options={{ ...commonHeaderOptions, headerTitle: "Notification" }}
    />,
    <Stack.Screen
      key="profile/preferences/index"
      name="profile/preferences/index"
      options={{ ...commonHeaderOptions, headerTitle: "Preferences" }}
    />,
    <Stack.Screen
      key="profile/preferences/dietary-preference"
      name="profile/preferences/dietary-preference"
      options={{ ...commonHeaderOptions, headerTitle: "Dietary Preference" }}
    />,
    <Stack.Screen
      key="profile/preferences/allergy"
      name="profile/preferences/allergy"
      options={{ ...commonHeaderOptions, headerTitle: "Food Allergies" }}
    />,
    <Stack.Screen
      key="profile/preferences/voice-settings"
      name="profile/preferences/voice-settings"
      options={{ ...commonHeaderOptions, headerTitle: "Voice Settings" }}
    />,
  ];
}
