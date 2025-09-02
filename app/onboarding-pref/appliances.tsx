import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppliancesSection from "~/components/Preferences/AppliancesSection";
import UnitSection from "~/components/Preferences/UnitSection";
import Header from "~/components/Shared/Header";
import { Button } from "~/components/ui/button";
import { H4 } from "~/components/ui/typography";

export default function CookingAppliances() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  const handleContinue = () => {
    router.push("/onboarding-pref/dietary-preference");
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: bottom }}>
      <Header />
      <UnitSection />
      <AppliancesSection />
      <View className="flex-1" />
      <View className="px-6 pb-10 mt-12">
        <Button
          size="lg"
          variant="default"
          onPress={handleContinue}
          className="w-full rounded-2xl bg-foreground"
        >
          <H4 className="text-background font-urbanist font-semibold">
            Continue
          </H4>
        </Button>
      </View>
    </View>
  );
}
