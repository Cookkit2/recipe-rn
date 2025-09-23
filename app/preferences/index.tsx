import { useRouter } from "expo-router";
import { XIcon } from "lucide-nativewind";
import React from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AllergySection from "~/components/Preferences/AllergySection";
// import AppliancesSection from "~/components/Preferences/AppliancesSection";
import DietarySection from "~/components/Preferences/DietarySection";
import { Button } from "~/components/ui/button";
import { H1, H4, P } from "~/components/ui/typography";
import { PREFERENCE_COMPLETED_KEY } from "~/constants/storage-keys";
import { storage } from "~/data";

export default function PreferencePage() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  const onComplete = () => {
    storage.set(PREFERENCE_COMPLETED_KEY, true);
    router.back();
  };

  return (
    <View className="flex-1 bg-background relative">
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 72 + 24 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
      >
        <View className="mt-24 mb-4 px-6">
          <H1 className="font-bowlby-one pt-2">Preferences</H1>
          <P className="font-urbanist-regular text-muted-foreground">
            Fill in your preferences to get a tailored recipes.
          </P>
        </View>
        {/* <AppliancesSection /> */}
        <DietarySection />
        <AllergySection />
      </Animated.ScrollView>
      <View className="absolute right-6 top-6">
        <Button size="icon" variant="ghost" onPress={() => router.back()}>
          <XIcon className="text-foreground" size={20} strokeWidth={2.618} />
        </Button>
      </View>
      <View
        className="absolute left-0 right-0 bottom-0 border-t border-border py-3 px-6 bg-background shadow-md"
        style={{ paddingBottom: bottom }}
      >
        <View className="flex-row items-center justify-between">
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-6"
            onPress={() => router.back()}
          >
            <H4 className="font-urbanist-semibold text-foreground">Skip</H4>
          </Button>
          <Button size="lg" className="rounded-full px-6" onPress={onComplete}>
            <H4 className="font-urbanist-semibold text-primary-foreground">
              Cook
            </H4>
          </Button>
        </View>
      </View>
    </View>
  );
}
