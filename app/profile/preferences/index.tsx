import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MilkIcon, SaladIcon, SpeakerIcon } from "lucide-uniwind";
import { useRouter } from "expo-router";
import ListButton from "~/components/Shared/ListButton";
import UnitSection from "~/components/Preferences/UnitSection";
import ThemeSection from "~/components/Preferences/ThemeSection";
import AppliancesSection from "~/components/Preferences/AppliancesSection";

export default function PreferenceScreen() {
  const router = useRouter();

  return (
    <Animated.ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      showsVerticalScrollIndicator={false}
    >
      <ThemeSection />

      <UnitSection />

      <AppliancesSection />

      <View className="flex mx-6 mt-4 p-0 py-2 rounded-2xl bg-muted/50 overflow-hidden border-continuous">
        <ListButton
          title="Dietary Preference"
          icon={SaladIcon}
          onPress={() => router.push("/profile/preferences/dietary-preference")}
        />
        <ListButton
          title="Food Allergies"
          icon={MilkIcon}
          onPress={() => router.push("/profile/preferences/allergy")}
        />
        <ListButton
          title="Voice Settings"
          icon={SpeakerIcon}
          onPress={() => router.push("/profile/preferences/voice-settings")}
        />
      </View>

      <View className="mb-8" />
    </Animated.ScrollView>
  );
}
