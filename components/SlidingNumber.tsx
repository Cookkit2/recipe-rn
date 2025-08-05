import React, { useEffect, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { H4 } from "./ui/typography";

const SPRING_CONFIG = {
  stiffness: 280,
  damping: 18,
  mass: 0.3,
};

function Digit({ value, place }: { value: number; place: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10;
  const animatedValue = useSharedValue(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.value = withSpring(valueRoundedToPlace, SPRING_CONFIG);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <View className="relative overflow-hidden w-5 h-6">
      <View className="invisible opacity-0">
        <H4 className="text-center">0</H4>
      </View>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </View>
  );
}

function Number({ mv, number }: { mv: SharedValue<number>; number: number }) {
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBounds({ width, height });
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (!bounds?.height)
      return {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform: [{ translateY: 0 }],
      };

    const latest = mv.value;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * bounds.height;
    if (offset > 5) {
      memo -= 10 * bounds.height;
    }

    return {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      transform: [{ translateY: memo }],
    };
  });

  // Render invisible measurement text first
  if (!bounds?.height) {
    return (
      <H4
        onLayout={handleLayout}
        className="absolute top-0 left-0 right-0 opacity-0 text-center"
      >
        {number}
      </H4>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <H4 className="text-center">{number}</H4>
    </Animated.View>
  );
}

export function SlidingNumber({
  value,
  padStart = false,
  decimalSeparator = ".",
}: {
  value: number;
  padStart?: boolean;
  decimalSeparator?: string;
}) {
  const absValue = Math.abs(value);
  const [integerPart, decimalPart] = absValue.toString().split(".");
  const integerValue = parseInt(integerPart ?? "0", 10);

  const paddedInteger =
    padStart && integerValue < 10 ? `0${integerPart}` : integerPart;

  const integerDigits = paddedInteger?.split("");
  const integerPlaces = integerDigits?.map((_, i) =>
    Math.pow(10, integerDigits.length - i - 1)
  );

  return (
    <View className="flex flex-row items-center justify-center">
      {value < 0 && <H4 className="text-center">-</H4>}
      {integerDigits?.map((_, index) => (
        <Digit
          key={`pos-${integerPlaces ? integerPlaces[index] : 0}`}
          value={integerValue}
          place={integerPlaces ? integerPlaces[index]! : 1}
        />
      ))}
      {decimalPart && (
        <>
          <H4 className="text-center">{decimalSeparator}</H4>
          {decimalPart.split("").map((_, index) => (
            <Digit
              key={`decimal-${index}`}
              value={parseInt(decimalPart, 10)}
              place={Math.pow(10, decimalPart.length - index - 1)}
            />
          ))}
        </>
      )}
    </View>
  );
}
