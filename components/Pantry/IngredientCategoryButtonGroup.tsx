import React from "react";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { CURVES } from "~/constants/curves";
import { usePantryStore } from "~/store/PantryContext";
import { PANTRY_ITEM_TYPES } from "~/constants/pantry-item-type";
import useColors from "~/hooks/useColor";
import { cn } from "~/lib/utils";
import { Link } from "expo-router";

export default function IngredientCategoryButtonGroup() {
  const colors = useColors();
  const { selectedItemType, changeItemType, ingredientScrollY, isRecipeOpen } = usePantryStore();

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = withTiming(
      ingredientScrollY.value > 16 ? colors.border : colors.background,
      CURVES["expressive.fast.effects"]
    );
    return { borderBottomColor: borderColor, borderBottomWidth: 1 };
  }, [colors.border, colors.background]);

  return (
    <Animated.View
      className="flex flex-row gap-x-2 overflow-x-auto pb-3 px-3"
      // style={[borderAnimatedStyle]}
    >
      {PANTRY_ITEM_TYPES.map(({ type, label, icon }) => {
        const isSelected = selectedItemType === type;
        return (
          <Button
            key={type}
            size="sm"
            className={cn(
              "flex-row items-center gap-1 rounded-full border-continuous",
              isSelected ? "bg-foreground/80" : "bg-background border border-border"
            )}
            onPress={() => changeItemType(type)}
          >
            {React.cloneElement(icon, {
              className: cn(isSelected ? "text-background" : "text-foreground"),
            })}
            <P
              className={cn(
                "text-sm font-urbanist-medium tracking-wider",
                isSelected ? "text-background" : "text-foreground"
              )}
            >
              {label}
            </P>
          </Button>
        );
      })}
      {/* {__DEV__ && (
        <Link href={"/debug"} asChild>
          <Button
            size="sm"
            className={"flex-row items-center gap-1 rounded-full border-continuous"}
          >
            <P className={cn("text-sm font-urbanist-medium tracking-wider")}>Debug</P>
          </Button>
        </Link>
      )} */}
    </Animated.View>
  );
}
