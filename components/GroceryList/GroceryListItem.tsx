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
import {
  useToggleGroceryItemCheck,
} from "~/hooks/queries/useMealPlanQueries";

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
    ? "✓ Have enough"
    : `${item.neededQuantity} ${item.unit}`;

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[opacityStyle]}
      className="flex-1 p-4 rounded-2xl mb-3 bg-card border border-border min-h-[110px] justify-between"
    >
      {/* Content */}
      <View>
        <Animated.Text
          style={textStyle}
          className={`font-urbanist-semibold text-base ${
            item.isChecked || item.isCovered ? "text-muted-foreground" : "text-foreground"
          }`}
          numberOfLines={2}
        >
          {item.name}
        </Animated.Text>

        <View className="flex-row items-center gap-2 mt-1">
          <P className={`text-xs ${item.isCovered ? "text-green-600" : "text-muted-foreground"}`}>
            {quantityDisplay}
          </P>
        </View>

        {/* Recipe attribution */}
        {item.fromRecipes.length > 0 && !item.isCovered && (
          <P className="text-[10px] text-muted-foreground/60 mt-1" numberOfLines={1}>
            from: {item.fromRecipes.join(", ")}
          </P>
        )}
      </View>

      <View className="flex-row items-center justify-between mt-2">
        {/* Pantry indicator */}
        <View className="flex-1 mr-2">
          {item.pantryQuantity > 0 && !item.isCovered && (
            <P className="text-[10px] text-muted-foreground" numberOfLines={1}>
              have {item.pantryQuantity}
            </P>
          )}
        </View>

        {/* Checkbox */}
        <View>
          {isSelectionMode ? (
            isSelected ? (
              <CheckCircleIcon className="text-primary" size={20} strokeWidth={2} />
            ) : (
              <CircleIcon className="text-muted-foreground" size={20} strokeWidth={2} />
            )
          ) : item.isChecked ? (
            <CheckSquareIcon className="text-green-500" size={20} strokeWidth={2} />
          ) : item.isCovered ? (
            <CheckIcon className="text-green-500" size={20} strokeWidth={2} />
          ) : (
            <SquareIcon className="text-muted-foreground" size={20} strokeWidth={2} />
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}
