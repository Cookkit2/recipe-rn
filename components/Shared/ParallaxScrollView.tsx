import type { PropsWithChildren, ReactElement } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from "react-native-reanimated";
import useHeaderAnimatedStyle from "~/hooks/animation/useHeaderAnimatedStyle";
import { useColorScheme } from "~/hooks/useColorScheme";

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const { colorScheme } = useColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const headerAnimatedStyle = useHeaderAnimatedStyle(scrollOffset, windowWidth);

  return (
    <View className="flex-1">
      <Animated.ScrollView ref={scrollRef} scrollEventThrottle={16}>
        <Animated.View
          className="overflow-hidden"
          style={[
            {
              backgroundColor: headerBackgroundColor[colorScheme],
              height: windowWidth,
            },
            headerAnimatedStyle,
          ]}
        >
          {headerImage}
        </Animated.View>
        <View className="flex-1 p-8 gap-4 overflow-hidden">{children}</View>
      </Animated.ScrollView>
    </View>
  );
}
