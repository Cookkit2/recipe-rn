import { useWindowDimensions } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import useHeaderAnimatedStyle from "~/hooks/animation/useHeaderAnimatedStyle";
import useColors from "~/hooks/useColor";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import OutlinedImage from "~/components/ui/outlined-image";
import { useIngredientDetailStore } from "~/store/IngredientDetailContext";

const HeroImage = ({ scrollOffset }: { scrollOffset: SharedValue<number> }) => {
  const { pantryItem } = useIngredientDetailStore();
  const { width: windowWidth } = useWindowDimensions();
  const headerAnimatedStyle = useHeaderAnimatedStyle(scrollOffset, windowWidth);
  const colors = useColors();

  const opacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [0, windowWidth * 0.3, windowWidth * 0.7],
      [0, 0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  return (
    <Animated.View
      key={`hero-image-${pantryItem.image_url}`}
      className="relative overflow-hidden flex items-center justify-center"
      style={[
        {
          height: windowWidth,
          backgroundColor: pantryItem.background_color || colors.muted,
        },
        headerAnimatedStyle,
      ]}
    >
      {pantryItem.image_url ? (
        <OutlinedImage
          source={pantryItem.image_url}
          size={120}
          strokeWidth={4}
        />
      ) : (
        <ShapeContainer
          index={0}
          width={100}
          height={100}
          text="?"
          textClassname="text-3xl text-foreground/70 leading-[2]"
          color={colors.border}
        />
      )}
      <Animated.View
        style={[opacityStyle, { height: windowWidth }]}
        className="absolute inset-0 bg-background w-full"
      />
    </Animated.View>
  );
};

export default HeroImage;
