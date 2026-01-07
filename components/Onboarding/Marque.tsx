import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { cn } from "~/lib/tw-merge";

const MeasureElement = ({
  onLayout,
  children,
}: {
  onLayout: (width: number) => void;
  children: React.ReactNode;
}) => (
  <Animated.ScrollView
    horizontal
    style={marqueeStyles.hidden}
    pointerEvents="box-none"
  >
    <View onLayout={(ev) => onLayout(ev.nativeEvent.layout.width)}>
      {children}
    </View>
  </Animated.ScrollView>
);

const TranslatedElement = ({
  index,
  children,
  offset,
  childrenWidth,
}: {
  index: number;
  children: React.ReactNode;
  offset: SharedValue<number>;
  childrenWidth: number;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      left: (index - 1) * childrenWidth,
      transform: [
        {
          translateX: -offset.value,
        },
      ],
    };
  });
  return (
    <Animated.View className="absolute" style={[animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const getIndicesArray = (length: number) => Array.from({ length }, (_, i) => i);

const Cloner = ({
  count,
  renderChild,
}: {
  count: number;
  renderChild: (index: number) => React.ReactNode;
}) => <>{getIndicesArray(count).map(renderChild)}</>;

const ChildrenScroller = ({
  duration,
  childrenWidth,
  parentWidth,
  reverse,
  children,
}: {
  duration: number;
  childrenWidth: number;
  parentWidth: number;
  reverse: boolean;
  children: React.ReactNode;
}) => {
  const offset = useSharedValue(0);
  const coeff = useSharedValue(reverse ? 1 : -1);

  React.useEffect(() => {
    coeff.value = reverse ? 1 : -1;
  }, [coeff, reverse]);

  useFrameCallback((i) => {
    // prettier-ignore
    offset.value += (coeff.value * ((i.timeSincePreviousFrame ?? 1) * childrenWidth)) / duration;
    offset.value = offset.value % childrenWidth;
  }, true);

  const count = Math.round(parentWidth / childrenWidth) + 2;
  const renderChild = (index: number) => (
    <TranslatedElement
      key={`clone-${index}`}
      index={index}
      offset={offset}
      childrenWidth={childrenWidth}
    >
      {children}
    </TranslatedElement>
  );

  return <Cloner count={count} renderChild={renderChild} />;
};

export const Marquee = ({
  duration = 10000,
  reverse = true,
  children,
  className,
}: {
  duration?: number;
  reverse?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  const [parentWidth, setParentWidth] = React.useState(0);
  const [childrenWidth, setChildrenWidth] = React.useState(0);

  return (
    <View
      className={cn(className)}
      onLayout={(ev) => {
        setParentWidth(ev.nativeEvent.layout.width);
      }}
      pointerEvents="box-none"
    >
      <View style={marqueeStyles.row} pointerEvents="box-none">
        <MeasureElement onLayout={setChildrenWidth}>{children}</MeasureElement>

        {childrenWidth > 0 && parentWidth > 0 && (
          <ChildrenScroller
            duration={duration}
            parentWidth={parentWidth}
            childrenWidth={childrenWidth}
            reverse={reverse}
          >
            {children}
          </ChildrenScroller>
        )}
      </View>
    </View>
  );
};

const marqueeStyles = StyleSheet.create({
  hidden: { opacity: 0, zIndex: -1 },
  row: { flexDirection: "row" },
});
