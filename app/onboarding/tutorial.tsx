import { LinearGradient } from "expo-linear-gradient";
import { View, StyleSheet } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "~/hooks/useColor";
import { Button } from "~/components/ui/button";
import { H1, H4, P } from "~/components/ui/typography";
import { Card } from "~/components/ui/card";
import { TextLoop, type TextLoopRef } from "~/components/ui/TextLoop";
import { ArrowLeftIcon } from "lucide-uniwind";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { CURVES } from "~/constants/curves";
import DisplayCards from "~/components/Onboarding/DisplayCards";
import { useRouter } from "expo-router";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";

// Step data extracted for easier maintenance / localization.
//
// The "Skip What You Have" step heroes Cookkit's pantry-aware grocery dedup:
// the grocery list subtracts on-hand pantry stock (synonyms + unit conversion
// + coverage) so you only buy what you're actually missing. Copy is drawn from
// docs/aso-store-listing.md (the off-repo store-listing artifact for #722) and
// must stay truthful to free-tier behavior — no Pro-only or on-device-AI claims.
//
// Defensibility mapping (keep this in sync if copy changes):
//   dedup claim -> hooks/queries/useGroceryList.ts (isCovered / neededQuantity / pantryQuantity)
//                  utils/unit-converter.ts + utils/quantity-comparison.ts
//                  data/db/models/IngredientSynonym.ts (synonym matching)
//   offline     -> data/db/ (WatermelonDB local store; Supabase is a sync layer)
// lib/function-gemma/ is now a built on-device AI assistant (FRIDGIT_TOOLS,
// function-calling), dark-launched behind the `on_device_ai` feature flag
// (default off). This onboarding card intentionally does not depend on it.
const STEP_TITLES = ["Snap Groceries", "Skip What You Have", "Manage Ingredients", "Cook Recipes"];

const STEP_CONTENT = [
  "Take a photo of your grocery list and we'll keep your ingredients",
  "Your grocery list, minus what you already have. Other apps add everything — Cookkit checks your pantry first.",
  "Keep track of your ingredients, their quantities and expiry dates",
  "Cook your loved recipes that match your ingredients",
];

const BUTTON_LABELS = ["Continue", "Continue", "Continue", "Let's Start"];

export default function Tutorial() {
  const colors = useColors();
  const router = useRouter();

  const titleLoopRef = useRef<TextLoopRef | null>(null);
  const contentLoopRef = useRef<TextLoopRef | null>(null);
  const buttonLoopRef = useRef<TextLoopRef | null>(null);

  const { top, bottom } = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = STEP_TITLES.length;

  useEffect(() => {
    const completed = storage.get<boolean>(ONBOARDING_COMPLETED_KEY);
    if (completed) {
      router.replace("/");
      return;
    }
  }, [router]);

  const onBack = () => {
    setCurrentStep((prev) => {
      if (prev <= 1) return 1; // already at first step
      const targetIndex = prev - 2; // new step will be prev-1; zero-based index = (prev-1)-1
      titleLoopRef.current?.animateToIndex(targetIndex);
      setTimeout(() => contentLoopRef.current?.animateToIndex(targetIndex), 50);
      setTimeout(() => buttonLoopRef.current?.animateToIndex(targetIndex), 100);
      return prev - 1;
    });
  };

  const onNext = async () => {
    setCurrentStep((prev) => {
      if (prev >= TOTAL_STEPS) {
        return prev;
      }
      titleLoopRef.current?.animateToNext();
      setTimeout(() => contentLoopRef.current?.animateToNext(), 50);
      setTimeout(() => buttonLoopRef.current?.animateToNext(), 100);
      return prev + 1;
    });
    if (currentStep === TOTAL_STEPS) {
      // Completed onboarding - persist flag and route to main app
      storage.set(ONBOARDING_COMPLETED_KEY, true);
      router.replace("/ingredient/create");
    }
  };

  const opacityStyle = useAnimatedStyle(() => ({
    opacity: withTiming(currentStep > 1 ? 1 : 0, CURVES["expressive.slow.effects"]),
  }));

  return (
    <View className="relative flex-1">
      <LinearGradient colors={[colors.border, colors.muted]} style={[StyleSheet.absoluteFill]} />

      <Animated.View className="absolute left-6" style={[{ top }, opacityStyle]}>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          onPress={onBack}
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon className="text-foreground" size={20} strokeWidth={2.618} />
        </Button>
      </Animated.View>

      <View className="flex flex-1" style={{ paddingTop: top, paddingBottom: bottom + 8 }}>
        <View className="flex-1 justify-center items-center">
          <DisplayCards />
        </View>
        <Card className="p-6 mx-6 rounded-4xl border-continuous">
          <TextLoop ref={titleLoopRef} trigger={false}>
            {STEP_TITLES.map((title, i) => (
              <H1 key={`title-${i}`} className="font-urbanist-medium text-center">
                {title}
              </H1>
            ))}
          </TextLoop>
          <TextLoop ref={contentLoopRef} trigger={false}>
            {STEP_CONTENT.map((content, i) => (
              <P key={`content-${i}`} className="mt-4 text-foreground/80 px-4 text-center">
                {content}
              </P>
            ))}
          </TextLoop>
        </Card>
        <Button
          size="lg"
          variant="default"
          onPress={onNext}
          className="rounded-2xl bg-foreground mx-6"
          style={{ marginTop: bottom + 8 }}
        >
          <TextLoop ref={buttonLoopRef} trigger={false}>
            {BUTTON_LABELS.map((label, i) => (
              <H4 key={`btn-${i}`} className="text-background font-urbanist-bold">
                {label}
              </H4>
            ))}
          </TextLoop>
        </Button>
      </View>
    </View>
  );
}
