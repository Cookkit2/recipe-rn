import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H1, P, H4 } from "~/components/ui/typography";
import TextShimmer from "~/components/ui/TextShimmer";
import useColors from "~/hooks/useColor";

export default function OnboardingPref() {
  const router = useRouter();
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();

  const handleContinue = () => {
    router.push("/onboarding-pref/appliances");
  };

  const handleSkip = () => {
    router.back();
  };

  return (
    <View className="relative flex-1">
      <LinearGradient
        colors={[colors.border, colors.muted]}
        style={[StyleSheet.absoluteFill]}
      />

      <View
        className="flex flex-1"
        style={{ paddingTop: top, paddingBottom: bottom }}
      >
        <View className="relative flex-1 justify-around px-10 pb-10">
          <View className="absolute inset-0 flex-1 justify-end">
            <H1 className="text-5xl font-bowlby-one text-center pt-4 tracking-wider">
              Preferences
            </H1>
            <P className="font-urbanist-medium text-foreground/80 px-4 text-center text-xl">
              Fill in your preferences to get better recommendations
            </P>
          </View>
        </View>
        <View className="px-6 pb-10 mt-12">
          <Button
            size="lg"
            variant="default"
            onPress={handleContinue}
            className="w-full rounded-2xl bg-foreground"
          >
            <TextShimmer className="text-center">
              <H4 className="text-background font-urbanist font-semibold">
                Continue
              </H4>
            </TextShimmer>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onPress={handleSkip}
            className="w-full rounded-2xl"
          >
            <H4 className="text-foreground/60 font-urbanist font-semibold">
              Skip
            </H4>
          </Button>
        </View>
      </View>
    </View>
  );
}
