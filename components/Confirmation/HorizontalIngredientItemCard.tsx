import { View } from "react-native";
import useColors from "~/hooks/useColor";
import {
  useCreateIngredientStore,
  type CreatePantryItem,
} from "~/store/CreateIngredientContext";
import IngredientQuantity from "~/components/Ingredient/IngredientQuantity";
import EditableTitle from "~/components/Shared/EditableTitle";
import OutlinedImage from "~/components/ui/outlined-image";
import { Button } from "~/components/ui/button";
import { Trash2Icon, RefreshCwIcon } from "lucide-nativewind";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { H3, Muted } from "~/components/ui/typography";

function SkeletonBox({
  className,
  style,
}: {
  className?: string;
  style?: object;
}) {
  const colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={className}
      style={[{ backgroundColor: colors.muted }, style, animatedStyle]}
    />
  );
}

function LoadingState({ status }: { status: "processing" | "classifying" }) {
  const colors = useColors();

  return (
    <View className="flex-1 flex-row items-start gap-4 p-3">
      <SkeletonBox
        className="w-36 rounded-3xl aspect-square"
        style={{ backgroundColor: colors.muted }}
      />
      <View className="mt-2 flex-1 flex-column gap-2">
        <SkeletonBox className="h-6 w-3/4 rounded-lg" />
        <View className="flex-1" />
        <View className="flex-row justify-between items-center">
          <SkeletonBox className="h-8 w-24 rounded-full" />
          <SkeletonBox className="h-10 w-10 rounded-full" />
        </View>
      </View>
    </View>
  );
}

function FailedState({
  item,
  onRetry,
  onDelete,
}: {
  item: CreatePantryItem;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();

  return (
    <View className="flex-1 flex-row items-start gap-4 p-3">
      <View
        className="w-36 rounded-3xl aspect-square items-center justify-center"
        style={{ backgroundColor: colors.destructive + "20" }}
      >
        <RefreshCwIcon className="text-destructive" size={32} strokeWidth={2} />
      </View>
      <View className="mt-2 flex-1 flex-column gap-1">
        <H3 className="text-destructive">Processing Failed</H3>
        <Muted className="text-sm">{item.error || "Unknown error"}</Muted>
        <View className="flex-1" />
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onPress={onRetry}
          >
            <RefreshCwIcon size={16} strokeWidth={2.5} />
            <Muted>Retry</Muted>
          </Button>
          <Button size="icon" variant="ghost" onPress={onDelete}>
            <Trash2Icon
              className="text-destructive"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
        </View>
      </View>
    </View>
  );
}

export default function HorizontalIngredientItemCard({
  item,
}: {
  item: CreatePantryItem;
}) {
  const colors = useColors();
  const { image_url, name, quantity, unit, status } = item;
  const { updateProcessPantryItems, deleteProcessPantryItems, retryItem } =
    useCreateIngredientStore();

  // Show loading skeleton for processing/classifying states
  if (status === "processing" || status === "classifying") {
    return <LoadingState status={status} />;
  }

  // Show failed state with retry option
  if (status === "failed") {
    return (
      <FailedState
        item={item}
        onRetry={() => retryItem(item.id)}
        onDelete={() => deleteProcessPantryItems(item.id)}
      />
    );
  }

  return (
    <View className="flex-1 flex-row items-start gap-4 p-3">
      <View
        className="w-36 relative rounded-3xl flex items-center justify-center border-continuous aspect-square"
        style={[{ backgroundColor: item.background_color || colors.muted }]}
      >
        <OutlinedImage source={image_url} size={64} />
      </View>
      <View className="mt-2 flex-1 flex-column">
        <EditableTitle
          value={name}
          onChangeText={(text: string) => {
            const newItem = { ...item, name: text };
            updateProcessPantryItems(newItem);
          }}
          placeholder="Enter title"
          TextComponent="H3"
          textClassName="opacity-80 font-urbanist-bold"
        />
        <View className="flex-1" />
        <View className="flex-row justify-between">
          <IngredientQuantity
            size="sm"
            quantity={quantity}
            unit={unit}
            className="justify-start gap-1"
            updateQuantity={(quantity) =>
              updateProcessPantryItems({ ...item, quantity })
            }
            updateUnit={(unit) => updateProcessPantryItems({ ...item, unit })}
          />
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onPress={() => deleteProcessPantryItems(item.id)}
          >
            <Trash2Icon
              className="text-destructive"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
        </View>
      </View>
    </View>
  );
}
