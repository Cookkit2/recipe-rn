import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { P, H4 } from "~/components/ui/typography";
import { CheckIcon } from "lucide-uniwind";
import type { RecipeStep as RecipeStepType } from "~/types/Recipe";

interface RecipeStepProps {
  step: RecipeStepType;
  isLast?: boolean;
}

export function RecipeStep({ step, isLast }: RecipeStepProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  return (
    <Pressable
      onPress={() => setIsCompleted(!isCompleted)}
      className={`py-4 ${!isLast ? "border-b border-border/40" : ""}`}
    >
      <View className="flex-row items-start gap-4">
        {/* Step Number Circle */}
        <View
          className={`w-8 h-8 rounded-full items-center justify-center border ${
            isCompleted ? "bg-primary border-primary" : "bg-background border-muted-foreground/30"
          }`}
        >
          {isCompleted ? (
            <CheckIcon size={16} className="text-primary-foreground" />
          ) : (
            <P className="font-bowlby-one text-sm text-foreground/70">{step.step}</P>
          )}
        </View>

        {/* Step Content */}
        <View className="flex-1">
          <H4
            className={`font-urbanist-bold mb-1 ${
              isCompleted ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {step.title}
          </H4>
          <P
            className={`font-urbanist-regular leading-6 ${
              isCompleted ? "text-muted-foreground/60" : "text-foreground/80"
            }`}
          >
            {step.description}
          </P>
        </View>
      </View>
    </Pressable>
  );
}
