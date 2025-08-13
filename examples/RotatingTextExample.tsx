import React, { useRef } from "react";
import { View, Pressable } from "react-native";
import RotatingText, {
  type RotatingTextRef,
} from "~/components/ui/RotatingText";
import { Text } from "~/components/ui/text";

export default function RotatingTextExample() {
  const rotatingTextRef = useRef<RotatingTextRef>(null);

  const sampleTexts = [
    "Welcome to our app",
    "Discover amazing recipes",
    "Cook with confidence",
    "Share your creations",
  ];

  const handleNext = () => {
    rotatingTextRef.current?.next();
  };

  const handlePrevious = () => {
    rotatingTextRef.current?.previous();
  };

  const handleReset = () => {
    rotatingTextRef.current?.reset();
  };

  const handleJumpTo = (index: number) => {
    rotatingTextRef.current?.jumpTo(index);
  };

  return (
    <View className="flex-1 items-center justify-center p-6 bg-background">
      <Text className="text-2xl font-bold mb-8 text-center">
        RotatingText Examples
      </Text>

      {/* Auto-rotating text with character animation */}
      <View className="mb-8">
        <Text className="text-lg font-semibold mb-4 text-center">
          Auto Character Animation
        </Text>
        <RotatingText
          texts={sampleTexts}
          splitBy="characters"
          className="text-xl font-bold text-primary text-center"
          staggerDuration={50}
          rotationInterval={3000}
          auto={true}
        />
      </View>

      {/* Manual control with word animation */}
      <View className="mb-8">
        <Text className="text-lg font-semibold mb-4 text-center">
          Manual Word Animation
        </Text>
        <RotatingText
          ref={rotatingTextRef}
          texts={sampleTexts}
          splitBy="words"
          className="text-lg text-center"
          staggerDuration={50}
          auto={true}
          initial={{ translateY: 30, opacity: 0, scale: 0.8 }}
          animate={{ translateY: 0, opacity: 1, scale: 1 }}
          exit={{ translateY: -30, opacity: 0, scale: 0.8 }}
        />

        <View className="flex-row justify-center gap-4 mt-4">
          <Pressable
            onPress={handlePrevious}
            className="bg-secondary px-4 py-2 rounded-lg"
          >
            <Text className="text-secondary-foreground">Previous</Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            className="bg-primary px-4 py-2 rounded-lg"
          >
            <Text className="text-primary-foreground">Next</Text>
          </Pressable>

          <Pressable
            onPress={handleReset}
            className="bg-destructive px-4 py-2 rounded-lg"
          >
            <Text className="text-destructive-foreground">Reset</Text>
          </Pressable>
        </View>
      </View>

      {/* Line animation example */}
      <View className="mb-8">
        <Text className="text-lg font-semibold mb-4 text-center">
          Line Animation
        </Text>
        <RotatingText
          texts={[
            "Line one\nLine two\nLine three",
            "First line\nSecond line\nThird line",
            "Top line\nMiddle line\nBottom line",
          ]}
          splitBy="lines"
          className="text-base text-center"
          staggerDuration={200}
          rotationInterval={4000}
          auto={true}
          staggerFrom="center"
        />
      </View>

      {/* Quick jump buttons */}
      <View>
        <Text className="text-lg font-semibold mb-4 text-center">
          Jump to Index
        </Text>
        <View className="flex-row justify-center gap-2">
          {sampleTexts.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => handleJumpTo(index)}
              className="bg-accent px-3 py-2 rounded-lg"
            >
              <Text className="text-accent-foreground">{index + 1}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
