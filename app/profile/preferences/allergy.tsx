import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AllergySection from "~/components/Preferences/AllergySection";

export default function AllergyScreen() {
  const { bottom } = useSafeAreaInsets();

  return (
    <Animated.ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
    >
      <AllergySection />
    </Animated.ScrollView>
  );
}
