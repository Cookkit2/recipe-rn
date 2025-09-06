import React, { useState, useEffect } from "react";
import { View, ScrollView, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRIAL_START_DATE_KEY } from "~/constants/storage-keys";
import Header from "~/components/Shared/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { H1, P, Muted, Large, H4 } from "~/components/ui/typography";
import {
  CheckIcon,
  XIcon,
  BookOpenIcon,
  HeartIcon,
  SparklesIcon,
  StarIcon,
  ClockIcon,
  ArrowLeftIcon,
} from "lucide-nativewind";
import PlanCard from "~/components/Subscription/PlanCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import TextShimmer from "~/components/ui/TextShimmer";
import PlanList from "~/components/Subscription/PlanList";

// Constants for trial management
const TRIAL_START_KEY = TRIAL_START_DATE_KEY;
const TRIAL_DURATION_DAYS = 30; // 1 month trial

// Trial utility functions
const getTrialStartDate = async (): Promise<Date | null> => {
  try {
    const startDateStr = await AsyncStorage.getItem(TRIAL_START_KEY);
    return startDateStr ? new Date(startDateStr) : null;
  } catch {
    return null;
  }
};

const setTrialStartDate = async (date: Date): Promise<void> => {
  try {
    await AsyncStorage.setItem(TRIAL_START_KEY, date.toISOString());
  } catch {
    // Silently fail - trial will still work without persistence
  }
};

const calculateDaysRemaining = (startDate: Date): number => {
  const now = new Date();
  const trialEndDate = new Date(startDate);
  trialEndDate.setDate(startDate.getDate() + TRIAL_DURATION_DAYS);

  const timeDiff = trialEndDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return Math.max(0, daysRemaining);
};

// Utility function for development/testing
const resetTrial = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TRIAL_START_KEY);
  } catch {
    // Silently fail
  }
};

interface PlanFeature {
  name: string;
  included: boolean;
}

const features: PlanFeature[] = [
  { name: "Access to 1000+ premium recipes", included: true },
  { name: "AI-powered ingredient substitutions", included: true },
  { name: "Smart pantry tracking", included: true },
  { name: "Save unlimited favorites", included: true },
  { name: "Offline recipe access", included: true },
  { name: "Personalized meal planning", included: true },
  { name: "Weekly curated recipe collections", included: true },
  { name: "Nutritional insights & analytics", included: true },
];

export default function SubscriptionPage() {
  const { bottom, top } = useSafeAreaInsets();
  const router = useRouter();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);

  // Initialize trial tracking
  useEffect(() => {
    const initializeTrial = async () => {
      let startDate = await getTrialStartDate();

      if (!startDate) {
        // Start trial automatically if not already started
        startDate = new Date();
        await setTrialStartDate(startDate);
      }

      const remaining = calculateDaysRemaining(startDate);
      setDaysRemaining(remaining);
      setIsTrialActive(remaining > 0);
    };

    initializeTrial();
  }, []);

  const handleContinue = () => {
    // Handle subscription logic here
    // Navigate to payment or success page
  };

  return (
    <View className="relative flex-1 bg-background">
      <ScrollView
        className="flex-1 px-6 pb-24"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottom + 240,
          paddingTop: top + 24,
        }}
      >
        {/* Hero Section */}
        <View className="mb-6 items-center justify-center w-full aspect-[4/3]">
          <BookOpenIcon size={80} className="text-primary" strokeWidth={1.5} />
        </View>

        {/* Main Heading */}
        <H1 className="text-center font-bowlby-one">
          Unlock your culinary potential
        </H1>

        {/* Subtitle */}
        <P className="mt-6 mb-8 text-center text-lg font-urbanist-regular px-12">
          Transform everyday ingredients into extraordinary meals
        </P>

        {/* Subscription Plans */}
        <PlanList />
      </ScrollView>

      {/* Bottom Action Button */}
      <View
        className="absolute left-6 right-6 p-4 pt-3 bg-background border border-border rounded-3xl border-continuous shadow-sm"
        style={{ bottom: bottom + 16 }}
      >
        <P className="text-center text-foreground/70 text-lg font-urbanist-semibold mb-3">
          {isTrialActive
            ? `${daysRemaining} ${
                daysRemaining === 1 ? "day" : "days"
              } remaining in your trial`
            : "Continue your cooking journey"}
        </P>
        <Button
          size="lg"
          variant="secondary"
          className="w-full rounded-2xl bg-foreground border-continuous"
          onPress={handleContinue}
        >
          <TextShimmer className="text-center">
            <H4 className="text-background font-urbanist-semibold">
              Upgrade Now
            </H4>
          </TextShimmer>
        </Button>
      </View>

      {/* Back Button */}
      <View className="absolute left-6" style={[{ top: top + 8 }]}>
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
    </View>
  );
}
