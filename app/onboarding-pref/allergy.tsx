import AllergySection from "~/components/Preferences/AllergySection";
import Header from "~/components/Shared/Header";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H4 } from "~/components/ui/typography";

export default function AllergyPage() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  const handleContinue = () => {
    router.dismissTo("/");
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: bottom }}>
      <Header />
      <AllergySection />
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
