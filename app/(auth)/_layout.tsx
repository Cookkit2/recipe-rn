import React from "react";
import { Stack } from "expo-router";
import { APP_HEADER_APPEARANCE } from "~/components/navigation/native-header-appearance";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ ...APP_HEADER_APPEARANCE, headerShown: false }}>
      <Stack.Screen name="loading" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
