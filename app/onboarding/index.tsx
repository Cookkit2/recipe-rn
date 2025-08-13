import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { storageFacade, createMMKVStorage } from "~/data/storage";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import { Button } from "~/components/ui/button";
import { H4, P } from "~/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextShimmer from "~/components/ui/TextShimmer";
import { dummyPantryItems } from "~/data/dummy-data";
import useColors from "~/hooks/useColor";
import RotationCard from "~/components/onboarding/RotationCard";
import OutlinedImage from "~/components/ui/outlined-image";
import RotatingTextExample from "~/examples/RotatingTextExample";

// Take first 10 items and assign different coordinates (0-100 scale)
const previewImages = dummyPantryItems.slice(0, 10).map((item, index) => ({
  image: item.image_url,
  name: item.name,
  x: [15, 75, 40, 85, 20, 60, 90, 10, 50, 80][index] || 50, // x coordinates 0-100
  y: [20, 30, 70, 15, 60, 45, 80, 90, 25, 50][index] || 50, // y coordinates 0-100
}));

export default function OnboardingScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const colors = useColors();
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // useEffect(() => {
  //   RNImage.prefetch(previewImages.map((item) => item.image));
  // }, [containerDimensions]);

  const convertToAbsWrapper = (x: number, y: number) => {
    return convertToAbsolutePosition(
      x,
      y,
      containerDimensions.width,
      containerDimensions.height
    );
  };

  const complete = () => {
    // createMMKVStorage({ id: "app" });
    // storageFacade.set<boolean>(ONBOARDING_COMPLETED_KEY, true);
    router.replace("/");
  };

  return (
    <View className="relative flex-1">
      <LinearGradient
        colors={[colors.border, colors.muted]}
        style={[StyleSheet.absoluteFill]}
      />

      <View
        className="flex flex-1 "
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
        </View>
        <View className="px-6 pb-10">
          <Button
            size="lg"
            variant="default"
            onPress={complete}
            className="mt-12 rounded-2xl"
          >
            <TextShimmer className="text-center" component={H4}>
              Continue
            </TextShimmer>
          </Button>
          <P className="text-center text-foreground/80 mt-8 px-10">
            By using Recipe, you agree to our{" "}
            <Text
              className="underline"
              onPress={() => router.push("/misc/terms")}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              className="underline"
              onPress={() => router.push("/misc/privacy")}
            >
              Privacy Policy
            </Text>
            .
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
