import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { MotiView, MotiText, AnimatePresence } from "moti";
import { View, type ViewStyle } from "react-native";
import { cn } from "~/lib/utils";
import { Text } from "../ui/text";

export interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

export interface RotatingTextProps {
  texts: string[];
  transition?: {
    type?: "timing" | "spring";
    duration?: number;
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  initial?: {
    translateY?: number;
    opacity?: number;
    scale?: number;
  };
  animate?: {
    translateY?: number;
    opacity?: number;
    scale?: number;
  };
  exit?: {
    translateY?: number;
    opacity?: number;
    scale?: number;
  };
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random" | number;
  loop?: boolean;
  auto?: boolean;
  splitBy?: "characters" | "words" | "lines";
  onNext?: (index: number) => void;
  className?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
  style?: ViewStyle;
  testID?: string;
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>(
  (
    {
      texts,
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { translateY: 20, opacity: 0 },
      animate = { translateY: 0, opacity: 1 },
      exit = { translateY: -20, opacity: 0 },
      rotationInterval = 2000,
      staggerDuration = 50,
      staggerFrom = "first",
      loop = true,
      auto = true,
      splitBy = "characters",
      onNext,
      className,
      splitLevelClassName,
      elementLevelClassName,
      style,
      testID,
    },
    ref
  ) => {
    const [currentTextIndex, setCurrentTextIndex] = useState<number>(0);

    // React Native compatible character splitting
    const splitIntoCharacters = (text: string): string[] => {
      // For React Native, we'll use a simpler approach
      // that works across all platforms
      return Array.from(text);
    };

    const elements = useMemo(() => {
      const currentText: string = texts[currentTextIndex] || "";
      if (splitBy === "characters") {
        const words = currentText.split(" ");
        return words.map((word, i) => ({
          characters: splitIntoCharacters(word),
          needsSpace: i !== words.length - 1,
        }));
      }
      if (splitBy === "words") {
        return currentText.split(" ").map((word, i, arr) => ({
          characters: [word],
          needsSpace: i !== arr.length - 1,
        }));
      }
      if (splitBy === "lines") {
        return currentText.split("\n").map((line, i, arr) => ({
          characters: [line],
          needsSpace: i !== arr.length - 1,
        }));
      }

      return currentText.split(splitBy).map((part, i, arr) => ({
        characters: [part],
        needsSpace: i !== arr.length - 1,
      }));
    }, [texts, currentTextIndex, splitBy]);

    const getStaggerDelay = useCallback(
      (index: number, totalChars: number): number => {
        const total = totalChars;
        if (staggerFrom === "first") return index * staggerDuration;
        if (staggerFrom === "last")
          return (total - 1 - index) * staggerDuration;
        if (staggerFrom === "center") {
          const center = Math.floor(total / 2);
          return Math.abs(center - index) * staggerDuration;
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * total);
          return Math.abs(randomIndex - index) * staggerDuration;
        }
        return Math.abs((staggerFrom as number) - index) * staggerDuration;
      },
      [staggerFrom, staggerDuration]
    );

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex);
        if (onNext) onNext(newIndex);
      },
      [onNext]
    );

    const next = useCallback(() => {
      const nextIndex =
        currentTextIndex === texts.length - 1
          ? loop
            ? 0
            : currentTextIndex
          : currentTextIndex + 1;
      if (nextIndex !== currentTextIndex) {
        handleIndexChange(nextIndex);
      }
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const previous = useCallback(() => {
      const prevIndex =
        currentTextIndex === 0
          ? loop
            ? texts.length - 1
            : currentTextIndex
          : currentTextIndex - 1;
      if (prevIndex !== currentTextIndex) {
        handleIndexChange(prevIndex);
      }
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, texts.length - 1));
        if (validIndex !== currentTextIndex) {
          handleIndexChange(validIndex);
        }
      },
      [texts.length, currentTextIndex, handleIndexChange]
    );

    const reset = useCallback(() => {
      if (currentTextIndex !== 0) {
        handleIndexChange(0);
      }
    }, [currentTextIndex, handleIndexChange]);

    useImperativeHandle(
      ref,
      () => ({
        next,
        previous,
        jumpTo,
        reset,
      }),
      [next, previous, jumpTo, reset]
    );

    useEffect(() => {
      if (!auto) return;
      const intervalId = setInterval(next, rotationInterval);
      return () => clearInterval(intervalId);
    }, [next, rotationInterval, auto]);

    const motiTransition = useMemo(() => {
      if (transition.type === "timing") {
        return {
          type: "timing" as const,
          duration: transition.duration || 300,
        };
      }
      return {
        type: "spring" as const,
        damping: transition.damping || 25,
        stiffness: transition.stiffness || 300,
        mass: transition.mass || 1,
      };
    }, [transition]);

    return (
      <MotiView
        className={cn("flex flex-row flex-wrap", className)}
        style={style}
        testID={testID}
      >
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={currentTextIndex}
            className={cn(
              splitBy === "lines"
                ? "flex flex-col w-full"
                : "flex flex-row flex-wrap"
            )}
          >
            {elements.map((wordObj, wordIndex, array) => {
              const previousCharsCount = array
                .slice(0, wordIndex)
                .reduce((sum, word) => sum + word.characters.length, 0);

              return (
                <View
                  key={`word-${wordIndex}`}
                  className={cn("flex flex-row", splitLevelClassName)}
                >
                  {wordObj.characters.map((char, charIndex) => {
                    const globalIndex = previousCharsCount + charIndex;
                    const totalChars = array.reduce(
                      (sum, word) => sum + word.characters.length,
                      0
                    );
                    const delay = getStaggerDelay(globalIndex, totalChars);

                    return (
                      <MotiText
                        key={`char-${charIndex}`}
                        from={initial}
                        animate={animate}
                        exit={exit}
                        transition={{
                          ...motiTransition,
                          delay,
                        }}
                        className={cn("", elementLevelClassName)}
                      >
                        {char}
                      </MotiText>
                    );
                  })}
                  {wordObj.needsSpace && <Text className=""> </Text>}
                </View>
              );
            })}
          </MotiView>
        </AnimatePresence>
      </MotiView>
    );
  }
);

RotatingText.displayName = "RotatingText";
export default RotatingText;
