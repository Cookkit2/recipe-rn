import { View, Pressable } from "react-native";
import { P } from "~/components/ui/typography";
import {
  CheckIcon,
  SquareIcon,
  CheckSquareIcon,
  CircleIcon,
  CheckCircleIcon,
} from "lucide-uniwind";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { GroceryItem } from "~/hooks/queries/useGroceryList";
import { useToggleGroceryItemCheck } from "~/hooks/queries/useMealPlanQueries";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GroceryListItemProps {
  item: GroceryItem;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function GroceryListItem({
  item,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: GroceryListItemProps) {
  const toggleCheck = useToggleGroceryItemCheck();

  const handlePress = () => {
    if (isSelectionMode) {
      onToggleSelect?.();
    } else {
      // Toggle check state
      toggleCheck.mutate(item.normalizedName);
    }
  };

  const opacityStyle = useAnimatedStyle(() => {
    if (isSelectionMode) return { opacity: 1 };
    return {
      opacity: withTiming(item.isChecked || item.isCovered ? 0.6 : 1, {
        duration: 200,
      }),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      textDecorationLine: item.isChecked ? "line-through" : "none",
    };
  });

  // Format quantity display
  const quantityDisplay = item.isCovered
    ? "✓ You have enough!"
    : `${item.neededQuantity} ${item.unit}`;

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[opacityStyle]}
      className="flex-1 p-4 rounded-2xl mb-3 bg-card border border-border"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Animated.Text
            style={textStyle}
            className={`font-urbanist-bold text-base leading-tight ${
              item.isChecked || item.isCovered ? "text-muted-foreground" : "text-foreground"
            }`}
            numberOfLines={2}
          >
            {item.name}
          </Animated.Text>
        </View>
        <View>
          {/* Checkbox */}
          {isSelectionMode ? (
            isSelected ? (
              <CheckCircleIcon className="text-primary" size={20} strokeWidth={2.5} />
            ) : (
              <CircleIcon className="text-muted-foreground" size={20} strokeWidth={2} />
            )
          ) : item.isChecked ? (
            <CheckSquareIcon className="text-green-500" size={20} strokeWidth={2.5} />
          ) : item.isCovered ? (
            <CheckIcon className="text-green-500" size={20} strokeWidth={2.5} />
          ) : (
            <SquareIcon className="text-muted-foreground" size={20} strokeWidth={2} />
          )}
        </View>
      </View>

      <View className="mt-auto">
        <P
          className={`text-xs font-urbanist-medium ${
            item.isCovered ? "text-green-600" : "text-muted-foreground"
          }`}
        >
          {quantityDisplay}
        </P>

        {/* Pantry indicator */}
        {item.pantryQuantity > 0 && !item.isCovered && (
          <View className="bg-muted/50 self-start rounded-md px-1.5 py-0.5 mt-1">
            <P className="text-[10px] text-muted-foreground font-urbanist-semibold">
              have {item.pantryQuantity}
            </P>
          </View>
        )}

        {/* Recipe attribution */}
        {item.fromRecipes.length > 0 && !item.isCovered && (
          <P className="text-[10px] text-muted-foreground/50 mt-1" numberOfLines={1}>
            {item.fromRecipes.join(", ")}
          </P>
        )}
      </View>
    </AnimatedPressable>
  );
}
