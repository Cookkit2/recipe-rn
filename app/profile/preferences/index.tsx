import { View } from "react-native";
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "~/components/Shared/Header";
import { H4 } from "~/components/ui/typography";
import {
  MilkIcon,
  MonitorIcon,
  MoonIcon,
  SaladIcon,
  SunIcon,
} from "lucide-nativewind";
import { useCallback, useEffect } from "react";
import { useColorScheme } from "~/hooks/useColorScheme";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { Card, CardContent } from "~/components/ui/card";
import { useRouter } from "expo-router";
import type { GroupButton } from "~/components/Shared/SegmentedButtons";
import SegmentedButtons from "~/components/Shared/SegmentedButtons";
import ListButton from "~/components/Shared/ListButton";
import AppliancesSection from "~/components/Preferences/AppliancesSection";
import UnitSection from "~/components/Preferences/UnitSection";

type Theme = "light" | "dark" | "system";

const THEME_BUTTONS: GroupButton<Theme>[] = [
  {
    label: "Light",
    icon: <SunIcon />,
    value: "light",
  },
  {
    label: "Dark",
    icon: <MoonIcon />,
    value: "dark",
  },
  {
    label: "System",
    icon: <MonitorIcon />,
    value: "system",
  },
];

export default function PreferenceScreen() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  // TODO: Persist preferences to storage (e.g., MMKV) once ready
  // Theme
  const { colorScheme, isDarkColorScheme, setColorScheme } = useColorScheme();
  const handleSelectTheme = useCallback(
    (scheme: "light" | "dark" | "system") => {
      // Only set the scheme here; update system UI in an effect after mount.
      setColorScheme(scheme);
    },
    [setColorScheme]
  );

  // Reflect theme change to Android nav bar after mount to avoid pre-mount updates
  useEffect(() => {
    setAndroidNavigationBar(isDarkColorScheme ? "light" : "dark");
  }, [isDarkColorScheme]);

  return (
    <Animated.ScrollView
      className="bg-background"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottom }}
      ref={scrollRef}
      stickyHeaderIndices={[0]}
    >
      <Header title="Preferences" scrollOffset={scrollOffset} />
      <Card className="mx-6 mt-4 border-none shadow-none">
        <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
          <View className="gap-1">
            <H4 className="font-urbanist-bold">Appearance</H4>
          </View>
          <SegmentedButtons
            buttons={THEME_BUTTONS}
            value={colorScheme}
            onValueChange={handleSelectTheme}
          />
        </CardContent>
      </Card>

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
