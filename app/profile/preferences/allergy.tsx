import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AllergySection from "~/components/Preferences/AllergySection";
import Header from "~/components/Shared/Header";

export default function AllergyScreen() {
  const { bottom } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: bottom }}>
      <Header title="Food Allergies" />
      <AllergySection />
    </View>
  );
}
