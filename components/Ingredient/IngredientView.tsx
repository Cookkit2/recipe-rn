import React, { useMemo } from "react";
import { ScrollView, useWindowDimensions, View, Text } from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useScrollViewOffset,
  type AnimatedRef,
} from "react-native-reanimated";
import { H1, H4, P } from "~/components/ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import OutlinedImage from "../ui/outlined-image";
import IngredientQuantity from "./IngredientQuantity";
import useHeaderAnimatedStyle from "~/hooks/animation/useHeaderAnimatedStyle";
import useImageColors from "~/hooks/useImageColors";
import useColors from "~/hooks/useColor";
import IngredientAppBar from "./IngredientAppBar";
import { RefrigeratorIcon, SnowflakeIcon } from "lucide-nativewind";
import { titleCase } from "~/utils/text-formatter";
import { Separator } from "../ui/separator";
import ListItem from "../Shared/ListItem";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ShapeContainer from "../Shared/Shapes/ShapeContainer";
import { Card, CardContent } from "../ui/card";
import { format } from "date-fns";
import useDeviceCornerRadius from "~/hooks/useDeviceCornerRadius";
import CabinetIcon from "~/lib/icons/CabinetIcon";

const AnimatedH1 = Animated.createAnimatedComponent(H1);

interface IngredientViewProps {
  ScrollComponent: (
    props: React.ComponentProps<typeof ScrollView>
  ) => React.ReactElement;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  ingredient: PantryItem; // Replace with actual ingredient type
}

export default function IngredientView({
  ScrollComponent,
  scrollRef,
  ingredient: item,
}: IngredientViewProps) {
  const { bottom } = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const borderRadius = useDeviceCornerRadius();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const headerAnimatedStyle = useHeaderAnimatedStyle(scrollOffset, windowWidth);
  const color = useImageColors(item.image_url);
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

  const ingredientMeta = useMemo(() => getIngredientMeta(item), [item]);

  return (
    <View
      className="relative flex-1 bg-background overflow-hidden"
      style={{ borderRadius }}
    >
      {/* App Bar Section */}
      <IngredientAppBar
        id={item.id}
        scrollOffset={scrollOffset}
        title={item.name}
      />

      {/* Content Section */}
      <ScrollComponent
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 96 }}
      >
        {/* Hero Image Section */}
        <Animated.View
          sharedTransitionTag="pantry-item-image-container"
          className="relative overflow-hidden flex items-center justify-center"
          style={[
            {
              height: windowWidth,
              backgroundColor: color || colors.muted,
            },
            headerAnimatedStyle,
          ]}
        >
          {item.image_url ? (
            <OutlinedImage source={item.image_url} size={120} strokeWidth={4} />
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

        {/* Header */}
        <View className="flex-1 bg-background rounded-t-3xl -mt-8 px-6 pt-8 border-continuous shadow-sm">
          <AnimatedH1
            entering={FadeIn}
            className="font-bowlby-one pt-2 text-center"
          >
            {item.name}
          </AnimatedH1>
          <View className="flex-row items-center justify-center mb-12">
            {ingredientMeta}
          </View>
          <IngredientQuantity
            className="mb-4"
            initialQuantity={item.quantity}
            initialUnit={item.unit}
          />
        </View>

        <View className="px-6 bg-background">
          <Card className="flex-1 mx-12 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
            <CardContent className="flex gap-2 p-5 items-center">
              <H4 className="font-urbanist-semibold text-center">
                Expires on{" "}
                <Text className="text-primary">
                  {format(item.expiry_date || new Date(), "d MMM")}
                </Text>
              </H4>
              <P className="text-sm font-urbanist-regular tracking-wider text-foreground/80 text-center">
                Purchased on {format(item.created_at, "d MMM")}
              </P>
            </CardContent>
          </Card>

          {item.steps_to_store.length > 0 && (
            <>
              <Separator className="my-8" />

              <View className="gap-4">
                <H4 className="font-bowlby-one text-foreground/70">
                  Steps to store
                </H4>
                {item.steps_to_store.map((step, index) => (
                  <ListItem
                    key={step.id}
                    icon={
                      <ShapeContainer
                        width={28}
                        height={28}
                        color={colors.primary}
                        index={index}
                        text={index + 1 + ""}
                      />
                    }
                    title={step.title}
                    description={step.description}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollComponent>
    </View>
  );
}

function getIngredientMeta(item: PantryItem) {
  const meta = [];
  if (item.type) {
    switch (item.type) {
      case "fridge":
        meta.push(
          <RefrigeratorIcon
            key="fridge"
            size={16}
            strokeWidth={2}
            className="text-foreground/70"
          />
        );
        break;
      case "cabinet":
        meta.push(
          <CabinetIcon
            key="cabinet"
            size={16}
            strokeWidth={2}
            className="text-foreground/70"
          />
        );
        break;
      case "freezer":
        meta.push(
          <SnowflakeIcon
            key="freezer"
            size={16}
            strokeWidth={2}
            className="text-foreground/70"
          />
        );
        break;
    }
    meta.push(
      <P key="type" className="text-foreground/70 font-urbanist-medium">
        {" " + titleCase(item.type)}
      </P>
    );
    // meta.push(
    //   <P key="separator" className="text-foreground/70 font-urbanist-medium">
    //     {"  •  "}
    //   </P>
    // );
  }

  // if (item.category) {
  //   meta.push(
  //     <P key="category" className="text-foreground/70 font-urbanist-medium">
  //       {item.category}
  //     </P>
  //   );
  // }
  return meta;
}
