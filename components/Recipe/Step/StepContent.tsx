import React from "react";
import { View, StyleSheet } from "react-native";
import type { RecipeStep } from "~/types/Recipe";
import { H2 } from "~/components/ui/typography";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import HighlightedText from "~/components/Shared/HighlightedText";
import useColors from "~/hooks/useColor";
import { LinearGradient } from "expo-linear-gradient";
import { dummyPantryItems } from "~/data/dummy/dummy-data";
import OutlinedImage from "~/components/ui/outlined-image";
import RotationCard from "~/components/Shared/RotationCard";
import {
  SEED_INDEX_MULTIPLIER,
  SEED_TOTAL_MULTIPLIER,
} from "~/constants/seeds";

const StepContent: React.FC<{ step: RecipeStep; totalSteps: number }> = ({
  step,
  totalSteps,
}) => {
  const colors = useColors();

  const gradientCoords = React.useMemo(
    () => angleToCoordinates(stableGradientAngle(step.step, totalSteps)),
    [step.step, totalSteps]
  );

  return (
    <View className="flex-1 h-full rounded-3xl border-continuous p-4 overflow-hidden">
      <LinearGradient
        colors={[colors.primary, colors.primaryForeground]}
        style={[StyleSheet.absoluteFill]}
        start={gradientCoords.start as [number, number]}
        end={gradientCoords.end as [number, number]}
      />
      <View className="flex-1 rounded-2xl border-continuous overflow-hidden">
        <LinearGradient
          colors={[colors.background, colors.muted]}
          style={StyleSheet.absoluteFill}
        />

        <View className="flex-1 justify-center items-center px-4">
          <H2 className="text-center text-foreground font-bowlby-one tracking-wide">
            {step.title}
          </H2>

          <View className="flex-row justify-center my-3">
            <View className="w-12 h-1 bg-primary/30 rounded-full" />
            <View className="w-2 h-2 bg-primary/50 rounded-full mx-2 -mt-0.5" />
            <View className="w-12 h-1 bg-primary/30 rounded-full" />
          </View>

          <HighlightedText
            text={step.description}
            className="font-urbanist-medium leading-8 text-foreground/80 text-center"
          />

          <View className="flex-row justify-center mt-4">
            <View className="w-8 h-1 bg-primary/30 rounded-full" />
          </View>

          <View className="absolute top-3 left-3 z-10">
            <ShapeContainer
              index={step.step % 21}
              text={step.step.toString()}
              width={80}
              height={80}
              textClassname="text-3xl leading-[2]"
              color={colors.primary}
            />
          </View>
          <View className="absolute bottom-3 right-3 scale-[-1] z-10">
            <ShapeContainer
              index={step.step % 21}
              text={step.step.toString()}
              width={80}
              height={80}
              textClassname="text-3xl leading-[2]"
              color={colors.primary}
            />
          </View>
          <View className="absolute bottom-6 left-6 z-10 flex-row gap-2">
            {step.relatedIngredientIds.map((id, index) => (
              <RelatedIngredients key={id} id={id} index={index} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default StepContent;

const RelatedIngredients = ({ id, index }: { id: string; index: number }) => {
  const currentIngredient = dummyPantryItems.find((item) => item.id === id);

  if (!currentIngredient) return null;

  return (
    <RotationCard
      key={`${currentIngredient.image_url}-${index}`}
      index={index}
      total={10}
      style={{ zIndex: index }}
      scaleEnabled={false}
    >
      <OutlinedImage size={48} source={currentIngredient.image_url} />
    </RotationCard>
  );
};

const stableGradientAngle = (index: number, total: number): number => {
  // Simple seeded pseudo-random based on index + total for stability
  const seed =
    (index + 1) * SEED_INDEX_MULTIPLIER + total * SEED_TOTAL_MULTIPLIER;
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  const deg = rand * 40 - 20; // -20..20
  return parseFloat(deg.toFixed(2));
};

// Convert angle to [0,0] [1,1] format for LinearGradient
const angleToCoordinates = (angle: number) => {
  const radians = (angle * Math.PI) / 180;
  const startX = 0.5 - Math.cos(radians) * 0.5;
  const startY = 0.5 - Math.sin(radians) * 0.5;
  const endX = 0.5 + Math.cos(radians) * 0.5;
  const endY = 0.5 + Math.sin(radians) * 0.5;

  return {
    start: [startX, startY],
    end: [endX, endY],
  };
};
