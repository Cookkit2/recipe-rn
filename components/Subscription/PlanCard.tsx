import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Pressable, View } from "react-native";
import { P, H3, H4 } from "../ui/typography";
import type { SubscriptionPlan } from "./PlanList";
import { cn } from "~/lib/tw-merge";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import useColors from "~/hooks/useColor";
import { hslToHsla } from "~/utils/color-utils";
import { CURVES } from "~/constants/curves";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, isSelected, onSelect }: PlanCardProps) {
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();
  const colors = useColors();
  const primaryWithAlpha = hslToHsla(colors.primary, 0.5);
  const borderWithAlpha = hslToHsla(colors.border, 0.5);

  const selectionAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isSelected ? colors.primaryForeground : colors.muted,
        CURVES["expressive.default.effects"]
      ),
      borderColor: withTiming(
        isSelected ? primaryWithAlpha : borderWithAlpha,
        CURVES["expressive.default.effects"]
      ),
    };
  });

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onSelect}
    >
      <Animated.View
        style={selectionAnimatedStyle}
        className={cn("p-4 rounded-3xl border-continuous border-2")}
      >
        <View className="flex flex-row gap-2 items-baseline">
          <H3 className="font-urbanist font-black">{plan.price}</H3>
          <H4 className="font-urbanist font-bold">{plan.priceSubtext}</H4>
        </View>
        <P className="font-urbanist-regular text-foreground/70">
          {plan.description}
        </P>
      </Animated.View>
    </AnimatedPressable>
  );
}

export default PlanCard;
