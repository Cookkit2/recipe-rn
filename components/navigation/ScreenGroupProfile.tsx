import { Stack } from "expo-router";

export function ScreenGroupProfile({ commonHeaderOptions }: { commonHeaderOptions: any }) {
  return (
    <>
      <Stack.Screen
        name="profile/index"
        options={{ ...commonHeaderOptions, headerTitle: "Profile" }}
      />
      <Stack.Screen
        name="profile/cooked-recipes"
        options={{ ...commonHeaderOptions, headerTitle: "Cooked Recipes" }}
      />
      <Stack.Screen
        name="profile/analytics"
        options={{ ...commonHeaderOptions, headerTitle: "Analytics" }}
      />
      <Stack.Screen
        name="profile/nutrition-report"
        options={{ ...commonHeaderOptions, headerTitle: "Nutrition Report" }}
      />
      <Stack.Screen
        name="profile/achievements"
        options={{ ...commonHeaderOptions, headerTitle: "Achievements" }}
      />
      <Stack.Screen
        name="profile/notification"
        options={{ ...commonHeaderOptions, headerTitle: "Notification" }}
      />
      <Stack.Screen
        name="profile/preferences/index"
        options={{ ...commonHeaderOptions, headerTitle: "Preferences" }}
      />
      <Stack.Screen
        name="profile/preferences/dietary-preference"
        options={{ ...commonHeaderOptions, headerTitle: "Dietary Preference" }}
      />
      <Stack.Screen
        name="profile/preferences/allergy"
        options={{ ...commonHeaderOptions, headerTitle: "Food Allergies" }}
      />
      <Stack.Screen
        name="profile/preferences/voice-settings"
        options={{ ...commonHeaderOptions, headerTitle: "Voice Settings" }}
      />
    </>
  );
}
