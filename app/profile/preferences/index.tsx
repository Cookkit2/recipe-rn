import { View } from "react-native";
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "~/components/Shared/Header";
import { MilkIcon, SaladIcon } from "lucide-nativewind";
import { useRouter } from "expo-router";
import ListButton from "~/components/Shared/ListButton";
import AppliancesSection from "~/components/Preferences/AppliancesSection";
import UnitSection from "~/components/Preferences/UnitSection";
import ThemeSection from "~/components/Preferences/ThemeSection";

export default function PreferenceScreen() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  return (
    <Animated.ScrollView
      className="bg-background"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottom }}
      ref={scrollRef}
      stickyHeaderIndices={[0]}
    >
      <Header title="Preferences" scrollOffset={scrollOffset} />

      {/* Theme */}
      <ThemeSection />

      {/* Units */}
      <UnitSection />

      {/* Appliances */}
      <AppliancesSection />

      {/* Navigation to Diet and Allergy screens */}
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
      </View>

      <View className="mb-8" />
    </Animated.ScrollView>
  );
}
