import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  interpolate,
  ReduceMotion,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { Portal } from "@rn-primitives/portal";
import { FullWindowOverlay } from "react-native-screens";
import { useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView, type BlurViewProps } from "expo-blur";
import { XIcon } from "lucide-uniwind";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import OutlinedImage from "~/components/ui/outlined-image";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { stableThumbRotation } from "~/components/Shared/RotationCard";
import useColors from "~/hooks/useColor";
import { titleCase } from "~/utils/text-formatter";
import type { IngredientPreviewData } from "~/utils/ingredient-preview";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import {
  ingredientOverlayLayout,
  INGREDIENT_IMAGE_SIZE,
  type IngredientSourceFrame,
} from "./ingredient-preview-layout";

interface RecipeIngredientsOverlayProps {
  visible: boolean;
  onClose: () => void;
  ingredients: RecipeIngredient[];
  ingredientPreviewData: IngredientPreviewData;
  missingIngredientPalette: string[];
  findMatch: (ingredient: RecipeIngredient) => PantryItem | null;
  blurTarget?: BlurViewProps["blurTarget"];
  sourceFrame: SharedValue<IngredientSourceFrame>;
  sourceScrollOffset: SharedValue<number>;
  parentScrollOffset?: SharedValue<number>;
  portalHostName?: string;
}

type GalleryLayout = ReturnType<typeof ingredientOverlayLayout>;
interface GalleryItem {
  ingredient: RecipeIngredient;
  index: number;
  image: NonNullable<PantryItem["image_url"]> | null;
  previewIndex: number | null;
  color: string;
}

/** One mounted set of images: opening changes their frames, never their parent or keys. */
export default function RecipeIngredientsOverlay({
  visible,
  onClose,
  ingredients,
  ingredientPreviewData,
  missingIngredientPalette,
  findMatch,
  blurTarget,
  sourceFrame,
  sourceScrollOffset,
  parentScrollOffset,
  portalHostName,
}: RecipeIngredientsOverlayProps) {
  const id = useId();
  const colors = useColors();
  const focused = useIsFocused();
  const expanded = visible && focused;
  const { width, height, fontScale } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const [labelHeights, setLabelHeights] = useState<Record<number, number>>({});
  const layout = ingredientOverlayLayout(
    width,
    height,
    { top, bottom },
    ingredients.length,
    labelHeights,
    fontScale
  );
  const progress = useDerivedValue<number>(() =>
    withSpring(expanded ? 1 : 0, {
      damping: 28,
      stiffness: 260,
      mass: 1,
      overshootClamping: true,
      reduceMotion: ReduceMotion.System,
    })
  );
  const scrollRef = useAnimatedRef<ScrollView>();
  const scrollOffset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });
  useAnimatedReaction(
    () => progress.value,
    (value, previous) => {
      // Reset only once the return transition ends. Closing from a scrolled row must not jump.
      if (value === 0 && previous !== null && previous !== 0) {
        scrollTo(scrollRef, 0, 0, false);
        scrollOffset.value = 0;
      }
    }
  );
  useEffect(() => {
    if (!expanded) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [expanded, onClose]);
  useEffect(() => {
    if (!focused && visible) onClose();
  }, [focused, visible, onClose]);
  const measureLabel = useCallback((index: number, value: number) => {
    setLabelHeights((previous) =>
      Math.abs((previous[index] ?? 0) - value) < 0.5 ? previous : { ...previous, [index]: value }
    );
  }, []);
  const items = useMemo(() => {
    const rows = ingredients.map((ingredient, index) => ({
      ingredient,
      index,
      image: findMatch(ingredient)?.image_url || null,
    }));
    const selected = [
      ...rows.filter((row) => row.image).slice(0, ingredientPreviewData.matched.length),
      ...rows.filter((row) => !row.image).slice(0, ingredientPreviewData.missing.length),
    ];
    const previewIndices = new Map(selected.map((row, index) => [row.index, index]));
    let missingIndex = 0;
    return rows.map((row) => ({
      ...row,
      previewIndex: previewIndices.get(row.index) ?? null,
      color: row.image
        ? colors.border
        : (missingIngredientPalette[
            missingIndex++ % Math.max(1, missingIngredientPalette.length)
          ] ?? colors.border),
    }));
  }, [ingredients, findMatch, ingredientPreviewData, missingIngredientPalette, colors.border]);
  const previewCount = items.filter((item) => item.previewIndex !== null).length;
  const fade = useAnimatedStyle(() => ({ opacity: progress.value }));
  const canvasClip = useAnimatedStyle(() => ({
    top: interpolate(progress.value, [0, 1], [layout.sourceClipTop, 0]),
    bottom: interpolate(progress.value, [0, 1], [layout.sourceClipBottom, 0]),
  }));
  const viewport = useAnimatedStyle(() => {
    const source = sourceFrame.value;
    const clipTop = interpolate(progress.value, [0, 1], [layout.sourceClipTop, 0]);
    return {
      left: interpolate(progress.value, [0, 1], [source.x - 12, layout.left]),
      top: interpolate(progress.value, [0, 1], [source.y, layout.gridTop]) - clipTop,
      width: interpolate(progress.value, [0, 1], [source.width + 24, layout.width]),
      height: interpolate(progress.value, [0, 1], [source.height, layout.viewportHeight]),
    };
  });
  // Follow scrolling with transforms without triggering layout work on every frame.
  const followSourceScroll = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          -((parentScrollOffset?.value ?? 0) - sourceScrollOffset.value) * (1 - progress.value),
      },
    ],
  }));
  const content = (
    <View
      key={id}
      style={[StyleSheet.absoluteFill, !focused && { display: "none" }]}
      pointerEvents={expanded ? "box-none" : "none"}
      testID="recipe-ingredients-layer"
      accessibilityViewIsModal={expanded}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
      onAccessibilityEscape={onClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, fade]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        <BlurView
          intensity={20}
          tint="dark"
          blurTarget={blurTarget}
          blurMethod={blurTarget ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss ingredients"
        />
      </Animated.View>
      {/* The native scroll view owns the pan gesture. Read-only images share one stable canvas above it. */}
      <Animated.ScrollView
        ref={scrollRef}
        testID="recipe-ingredients-scroll"
        pointerEvents={expanded ? "auto" : "none"}
        scrollEnabled={expanded}
        onScroll={onScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled
        showsVerticalScrollIndicator={expanded}
        indicatorStyle="white"
        contentInsetAdjustmentBehavior="never"
        accessibilityLabel="Recipe ingredients"
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height,
          },
          fade,
        ]}
      >
        <View
          testID="recipe-ingredients-content"
          style={{ height: layout.contentHeight }}
          pointerEvents="none"
        />
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { overflow: "hidden" }, canvasClip]}
      >
        <Animated.View
          testID="recipe-ingredients-canvas"
          style={[{ position: "absolute", overflow: "hidden" }, viewport, followSourceScroll]}
        >
          {items.map((item) => (
            <IngredientTile
              key={`${item.ingredient.relatedIngredientId}-${item.index}`}
              item={item}
              layout={layout}
              progress={progress}
              scrollOffset={scrollOffset}
              sourceFrame={sourceFrame}
              previewCount={previewCount}
              onLabelLayout={measureLabel}
            />
          ))}
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents={expanded ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            right: layout.left,
            top: layout.top + (layout.headerHeight - 44) / 2,
            width: 44,
            height: 44,
          },
          fade,
        ]}
      >
        <Button
          variant="ghost"
          size="icon"
          onPress={onClose}
          accessibilityLabel="Close ingredients"
        >
          <XIcon size={22} className="text-white" />
        </Button>
      </Animated.View>
    </View>
  );
  return (
    <Portal name={`recipe-ingredients-${id}`} hostName={portalHostName}>
      {Platform.OS === "ios" ? (
        <FullWindowOverlay key={id} unstable_accessibilityContainerViewIsModal={expanded}>
          {content}
        </FullWindowOverlay>
      ) : (
        content
      )}
    </Portal>
  );
}

function IngredientTile({
  item,
  layout,
  progress,
  scrollOffset,
  sourceFrame,
  previewCount,
  onLabelLayout,
}: {
  item: GalleryItem;
  layout: GalleryLayout;
  progress: SharedValue<number>;
  scrollOffset: SharedValue<number>;
  sourceFrame: SharedValue<IngredientSourceFrame>;
  previewCount: number;
  onLabelLayout: (index: number, height: number) => void;
}) {
  const { ingredient, index, image, previewIndex, color } = item;
  const rotation = stableThumbRotation(previewIndex ?? previewCount, previewCount);
  const frame = useAnimatedStyle(() => {
    const source = sourceFrame.value;
    const step = Math.max(0, Math.min(24, (source.width - 48) / Math.max(1, previewCount - 1)));
    const closedX =
      12 + 24 + (previewIndex ?? Math.max(0, previewCount - 1)) * step - layout.columnWidth / 2;
    const closedY = (source.height - INGREDIENT_IMAGE_SIZE) / 2;
    return {
      opacity: previewIndex === null ? progress.value : 1,
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [closedX, layout.gridPadding + (index % 3) * layout.columnWidth]
          ),
        },
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [closedY, (layout.rowTops[index] ?? 8) - scrollOffset.value]
          ),
        },
      ],
    };
  });
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.75, 1]) },
      { rotate: `${interpolate(progress.value, [0, 1], [rotation, 0])}deg` },
    ],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: progress.value * progress.value }));
  return (
    <Animated.View
      testID={`recipe-ingredient-tile-${index}`}
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: layout.columnWidth,
          alignItems: "center",
          zIndex: previewIndex ?? 0,
        },
        frame,
      ]}
    >
      <Animated.View
        style={[{ width: INGREDIENT_IMAGE_SIZE, height: INGREDIENT_IMAGE_SIZE }, imageStyle]}
      >
        {image ? (
          <OutlinedImage source={image} size={INGREDIENT_IMAGE_SIZE} strokeWidth={2.618} />
        ) : (
          <ShapeContainer
            index={index % 21}
            width={INGREDIENT_IMAGE_SIZE}
            height={INGREDIENT_IMAGE_SIZE}
            text="?"
            textClassname="text-3xl text-foreground/70 leading-[2]"
            color={color}
          />
        )}
      </Animated.View>
      <Animated.View
        style={[{ alignSelf: "stretch", paddingHorizontal: 4, marginTop: 8 }, labelStyle]}
        testID={`recipe-ingredient-label-${index}`}
        onLayout={(event) => onLabelLayout(index, event.nativeEvent.layout.height)}
      >
        <P
          className="text-white/80 text-sm font-urbanist-semibold text-center"
          style={{ lineHeight: 18 }}
        >
          {titleCase(ingredient.name)}
        </P>
        <P
          className="text-white text-xs tracking-wider font-urbanist-bold text-center mt-0.5"
          style={{ lineHeight: 16 }}
        >
          {ingredient.quantity} {ingredient.unit}
        </P>
      </Animated.View>
    </Animated.View>
  );
}
