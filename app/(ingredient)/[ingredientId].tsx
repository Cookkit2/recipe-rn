import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Dimensions } from "react-native";
import { dummyPantryItems } from "~/data/dummy-data";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { H1 } from "~/components/ui/typography";
import { useCallback, useEffect, useRef } from "react";
// import { SheetScreen } from "react-native-sheet-transitions";
import * as Haptics from "expo-haptics";
import { useRootScale } from "~/store/context/RootScaleContext";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import IngredientView from "~/components/Ingredient/IngredientView";

const SCALE_FACTOR = 0.83;
const DRAG_THRESHOLD = Math.min(Dimensions.get("window").height * 0.2, 150);
const HORIZONTAL_DRAG_THRESHOLD = Math.min(
  Dimensions.get("window").width * 0.51,
  80
);
const DIRECTION_LOCK_ANGLE = 45; // Angle in degrees to determine horizontal vs vertical movement
const ENABLE_HORIZONTAL_DRAG_CLOSE = true;

export default function IngredientDetailsPage() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const router = useRouter();

  const { setScale } = useRootScale();
  const translateY = useSharedValue(0);
  const isClosing = useRef(false);
  const scrollOffset = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const translateX = useSharedValue(0);
  const initialGestureX = useSharedValue(0);
  const initialGestureY = useSharedValue(0);
  const isHorizontalGesture = useSharedValue(false);
  const isScrolling = useSharedValue(false);
  const blurIntensity = useSharedValue(20);

  const numericId =
    typeof ingredientId === "string"
      ? parseInt(ingredientId, 10)
      : Array.isArray(ingredientId)
        ? parseInt(ingredientId[0], 10)
        : 0;
  const item = dummyPantryItems.find((item) => item.id === numericId);

  const handleHapticFeedback = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log("Haptics not available:", error);
    }
  }, []);

  const goBack = useCallback(() => {
    if (!isClosing.current) {
      isClosing.current = true;
      handleHapticFeedback();
      requestAnimationFrame(() => {
        router.back();
      });
    }
  }, [router, handleHapticFeedback]);

  const handleScale = useCallback(
    (newScale: number) => {
      try {
        setScale(newScale);
      } catch (error) {
        console.log("Scale error:", error);
      }
    },
    [setScale]
  );

  const calculateGestureAngle = (x: number, y: number) => {
    "worklet";
    const angle = Math.abs(Math.atan2(y, x) * (180 / Math.PI));
    return angle;
  };

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      "worklet";
      initialGestureX.value = event.x;
      initialGestureY.value = event.y;
      isHorizontalGesture.value = false;

      if (scrollOffset.value <= 0) {
        isDragging.value = true;
      }
    })
    .onUpdate((event) => {
      "worklet";
      const dx = event.translationX;
      const dy = event.translationY;
      const angle = calculateGestureAngle(dx, dy);

      if (
        ENABLE_HORIZONTAL_DRAG_CLOSE &&
        !isHorizontalGesture.value &&
        !isScrolling.value
      ) {
        if (Math.abs(dx) > 10) {
          if (angle < DIRECTION_LOCK_ANGLE) {
            isHorizontalGesture.value = true;
          }
        }
      }

      if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
        translateX.value = dx;
        translateY.value = dy;
        blurIntensity.value = Math.max(0, 20 - Math.abs(dx) / 10);
      } else if (scrollOffset.value <= 0 && isDragging.value) {
        translateY.value = Math.max(0, dy);
        blurIntensity.value = Math.max(0, 20 - dy / 20);
      }
    })
    .onEnd((event) => {
      "worklet";
      isDragging.value = false;

      if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
        const dx = event.translationX;
        const dy = event.translationY;
        const totalDistance = Math.sqrt(dx * dx + dy * dy);
        const shouldClose = totalDistance > HORIZONTAL_DRAG_THRESHOLD;

        if (shouldClose) {
          const exitX = dx * 2;
          const exitY = dy * 2;

          translateX.value = withTiming(exitX, { duration: 300 });
          translateY.value = withTiming(exitY, { duration: 300 });

          runOnJS(handleScale)(1);
          runOnJS(handleHapticFeedback)();
          runOnJS(goBack)();
        } else {
          translateX.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
          runOnJS(handleScale)(SCALE_FACTOR);
        }
      } else if (scrollOffset.value <= 0) {
        const shouldClose = event.translationY > DRAG_THRESHOLD;

        if (shouldClose) {
          translateY.value = withTiming(event.translationY + 100, {
            duration: 300,
          });
          runOnJS(handleScale)(1);
          runOnJS(handleHapticFeedback)();
          runOnJS(goBack)();
        } else {
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
          runOnJS(handleScale)(SCALE_FACTOR);
        }
      }
    })
    .onFinalize(() => {
      "worklet";
      isDragging.value = false;
      isHorizontalGesture.value = false;
    });

  const scrollGesture = Gesture.Native()
    .onBegin(() => {
      "worklet";
      isScrolling.value = true;
      if (!isDragging.value) {
        translateY.value = 0;
      }
    })
    .onEnd(() => {
      "worklet";
      isScrolling.value = false;
    });

  const composedGestures = Gesture.Simultaneous(panGesture, scrollGesture);

  const ScrollComponent = useCallback(
    (props: any) => {
      return (
        <GestureDetector gesture={composedGestures}>
          <Animated.ScrollView
            {...props}
            onScroll={(event) => {
              "worklet";
              scrollOffset.value = event.nativeEvent.contentOffset.y;
              if (!isDragging.value && translateY.value !== 0) {
                translateY.value = 0;
              }
              props.onScroll?.(event);
            }}
            scrollEventThrottle={16}
            // bounces={scrollOffset.value >= 0 && !isDragging.value}
            bounces={false}
          />
        </GestureDetector>
      );
    },
    [composedGestures, isDragging.value, scrollOffset, translateY]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: withSpring(1),
  }));

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        setScale(SCALE_FACTOR);
      } catch (error) {
        console.log("Initial scale error:", error);
      }
    }, 0);

    return () => {
      clearTimeout(timeout);
      try {
        setScale(1);
      } catch (error) {
        console.log("Cleanup scale error:", error);
      }
    };
  }, [setScale]);

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <H1 className="text-center">Ingredient not found</H1>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Animated.View className="flex-1" style={animatedStyle}>
        <IngredientView scrollComponent={ScrollComponent} ingredient={item} />
      </Animated.View>
    </View>
  );
}
