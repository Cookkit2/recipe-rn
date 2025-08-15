import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H1, H4, P } from "~/components/ui/typography";
import { Card } from "~/components/ui/card";
import { ArrowLeftIcon } from "lucide-nativewind";
import useColors from "~/hooks/useColor";

export default function OnboardingStep2() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const colors = useColors();

  const complete = () => {
    router.replace("/");
  };

  return (
    <View className="relative flex-1">
      <LinearGradient
        colors={[colors.border, colors.muted]}
        style={[StyleSheet.absoluteFill]}
      />

      <View className="absolute left-6" style={{ top }}>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          onPress={() => router.back()}
        >
          <ArrowLeftIcon
            className="text-foreground"
            size={20}
            strokeWidth={2.618}
          />
        </Button>
      </View>

      <View
        className="flex flex-1"
        style={{ paddingTop: top, paddingBottom: bottom }}
      >
        <View className="flex-1 justify-center items-center"></View>
        <Card className="p-6 mx-6 rounded-3xl border-continuous">
          <H1 className="text-center">Cook Recipes</H1>
          <P className="mt-4 text-foreground/80 px-4 text-center">
            We'll find recipes that match your ingredients and show you how to
            cook them
          </P>
        </Card>
      </View>
      <View className="px-6 pb-10">
        <Button
          size="lg"
          variant="outline"
          onPress={complete}
          className="mt-12 rounded-2xl"
        >
          <H4>Continue</H4>
        </Button>
      </View>
    </View>
  );
}
