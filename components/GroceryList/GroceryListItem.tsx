import { View, Pressable } from "react-native";
import { P } from "~/components/ui/typography";
import {
  CheckIcon,
  SquareIcon,
  CheckSquareIcon,
  CircleIcon,
  CheckCircleIcon,
  TrashIcon,
} from "lucide-uniwind";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { GroceryItem } from "~/hooks/queries/useGroceryList";
import {
  useToggleGroceryItemCheck,
  useDeleteGroceryItem,
  useRestoreGroceryItem,
} from "~/hooks/queries/useMealPlanQueries";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { toast } from "sonner-native";

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
  const deleteItem = useDeleteGroceryItem();
  const restoreItem = useRestoreGroceryItem();

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

  const renderRightActions = (_: any, dragX: any) => {
    return (
      <View className="bg-destructive justify-center items-end px-6 rounded-xl mb-2 flex-1">
        <TrashIcon className="text-destructive-foreground" size={24} />
      </View>
    );
  };

  const onSwipeableOpen = () => {
    deleteItem.mutate(item.normalizedName, {
      onSuccess: () => {
        toast("Item deleted", {
          action: {
            label: "Undo",
            onClick: () => restoreItem.mutate(item.normalizedName),
          },
        });
      },
    });
  };

  return (
    <Swipeable
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableOpen={onSwipeableOpen}
      containerStyle={{ overflow: "visible" }}
    >
      <AnimatedPressable
        onPress={handlePress}
        style={[opacityStyle]}
        className="flex-row items-center py-3 px-5 rounded-xl mb-2 bg-background"
      >
        {/* Content */}
        <View className="flex-1">
          <Animated.Text
            style={textStyle}
            className={`font-urbanist-semibold text-base ${
              item.isChecked || item.isCovered ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {item.name}
          </Animated.Text>

          <View className="flex-row items-center gap-2 mt-0.5">
            <P className={`text-sm ${item.isCovered ? "text-green-600" : "text-muted-foreground"}`}>
              {quantityDisplay}
            </P>
          </View>

          {/* Recipe attribution */}
          {item.fromRecipes.length > 0 && !item.isCovered && (
            <P className="text-xs text-muted-foreground/60 mt-1" numberOfLines={1}>
              from: {item.fromRecipes.join(", ")}
            </P>
          )}
        </View>

        {/* Pantry indicator */}
        {item.pantryQuantity > 0 && !item.isCovered && (
          <View className="bg-muted rounded-lg px-2 py-1">
            <P className="text-xs text-muted-foreground">have {item.pantryQuantity}</P>
          </View>
        )}

        {/* Checkbox */}
        <View className="ml-3">
          {isSelectionMode ? (
            isSelected ? (
              <CheckCircleIcon className="text-primary" size={24} strokeWidth={2} />
            ) : (
              <CircleIcon className="text-muted-foreground" size={24} strokeWidth={2} />
            )
          ) : item.isChecked ? (
            <CheckSquareIcon className="text-green-500" size={24} strokeWidth={2} />
          ) : item.isCovered ? (
            <CheckIcon className="text-green-500" size={24} strokeWidth={2} />
          ) : (
            <SquareIcon className="text-muted-foreground" size={24} strokeWidth={2} />
          )}
        </View>
      </AnimatedPressable>
    </Swipeable>
  );
}
