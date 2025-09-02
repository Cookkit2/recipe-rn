import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Button } from "~/components/ui/button";
import { H1, H4, P } from "~/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextShimmer from "~/components/ui/TextShimmer";
import { dummyPantryItems } from "~/data/dummy-data";
import useColors from "~/hooks/useColor";
import RotationCard from "~/components/Onboarding/RotationCard";
import OutlinedImage from "~/components/ui/outlined-image";
import { SparkleIcon } from "lucide-nativewind";

// Take first 10 items and assign different coordinates (0-100 scale)
const previewImages = dummyPantryItems.slice(0, 10).map((item, index) => ({
  image: item.image_url,
  name: item.name,
  x: [15, 75, 40, 85, 15, 60, 90, 10, 50, 80][index] || 50,
  y: [20, 30, 45, 15, 60, 66, 73, 90, 25, 50][index] || 50,
}));

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const convertToAbsWrapper = (x: number, y: number) => {
    return convertToAbsolutePosition(
      x,
      y,
      containerDimensions.width,
      containerDimensions.height
    );
  };

  const complete = () => {
    router.replace("/onboarding/tutorial");
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
        <View
          className="relative flex-1 justify-around px-10 pb-10"
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setContainerDimensions({ width, height });
          }}
        >
          {containerDimensions.width > 0 &&
            containerDimensions.height > 0 &&
            previewImages.map((item, index) => {
              const position = convertToAbsWrapper(item.x, item.y);

              return (
                <RotationCard
                  key={`${item.name}-${index}`}
                  index={index}
                  total={previewImages.length}
                  className="absolute"
                  style={{
                    left: position.left,
                    top: position.top,
                  }}
                >
                  <OutlinedImage source={item.image} size={100} />
                </RotationCard>
              );
            })}
          <View className="absolute inset-0 flex-1 justify-end">
            <H1 className="text-5xl font-bowlby-one text-center pt-4 tracking-wider">
              Cookkit
            </H1>
            <P className="font-urbanist-medium text-foreground/80 px-4 text-center text-xl">
              Track your ingredients {"\n"}
              Discover tailored recipes
            </P>
            <View className="relative flex-row items-center justify-center mt-1 gap-2 shadow-sm">
              <P className="font-urbanist-bold text-foreground/70">
                Powered by
              </P>
              <View className="rounded-full px-3 py-[2] overflow-hidden border-border border-2 flex-row gap-1 items-center">
                <LinearGradient
                  colors={[colors.primary, "#FF6F4B"]}
                  start={[0.1, 0.4]}
                  end={[0.8, 0.9]}
                  style={StyleSheet.absoluteFill}
                />
                <P className="font-urbanist-extrabold text-primary-foreground">
                  AI
                </P>
                <SparkleIcon
                  size={14}
                  color={colors.primaryForeground}
                  fill="#FFFFFF"
                />
              </View>
            </View>
          </View>
        </View>
        <View className="px-6 pb-10">
          <Button
            size="lg"
            variant="default"
            onPress={complete}
            className="mt-12 rounded-2xl bg-foreground"
          >
            <TextShimmer className="text-center">
              <H4 className="text-background font-urbanist font-semibold">
                Continue
              </H4>
            </TextShimmer>
          </Button>
          <P className="font-urbanist-regular text-center text-foreground/80 mt-8 px-10">
            By using Cookkit, you agree to our{"\n"}
            <Text
              className="underline"
              accessibilityRole="link"
              accessibilityLabel="Terms of Service"
              accessibilityHint="Opens the Terms of Service page"
              onPress={() => router.push("/misc/terms")}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              className="underline"
              accessibilityRole="link"
              accessibilityLabel="Privacy Policy"
              accessibilityHint="Opens the Privacy Policy page"
              onPress={() => router.push("/misc/privacy")}
            >
              Privacy Policy
            </Text>
          </P>
        </View>
      </View>
    </View>
  );
}

// Coordinate conversion function
const convertToAbsolutePosition = (
  x: number, // 0-100
  y: number, // 0-100
  containerWidth: number,
  containerHeight: number,
  imageSize: number = 100
) => ({
  left: (x / 100) * containerWidth - imageSize / 2,
  top: (y / 100) * containerHeight - imageSize / 2,
});
