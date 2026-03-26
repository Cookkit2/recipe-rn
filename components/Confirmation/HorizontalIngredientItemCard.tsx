import React, { useCallback } from "react";
import { View } from "react-native";
import useColors from "~/hooks/useColor";
import { useCreateIngredientStore, type CreatePantryItem } from "~/store/CreateIngredientContext";
import IngredientQuantity from "~/components/Ingredient/IngredientQuantity";
import EditableTitle from "~/components/Shared/EditableTitle";
import OutlinedImage from "~/components/ui/outlined-image";
import { Button } from "~/components/ui/button";
import { Trash2Icon, RefreshCwIcon } from "lucide-uniwind";
import { H3, Muted } from "~/components/ui/typography";
import Skeleton from "../ui/skeleton";

function HorizontalIngredientItemCard({ item }: { item: CreatePantryItem }) {
  const { image_url, name, quantity, unit, status } = item;
  const { updateProcessPantryItems, deleteProcessPantryItems, retryItem } =
    useCreateIngredientStore();

  // Memoized callbacks to prevent re-renders
  const handleNameChange = useCallback(
    (text: string) => {
      updateProcessPantryItems({ ...item, name: text });
    },
    [item, updateProcessPantryItems]
  );

  const handleQuantityChange = useCallback(
    (newQuantity: number) => {
      updateProcessPantryItems({ ...item, quantity: newQuantity });
    },
    [item, updateProcessPantryItems]
  );

  const handleUnitChange = useCallback(
    (newUnit: string) => {
      updateProcessPantryItems({ ...item, unit: newUnit });
    },
    [item, updateProcessPantryItems]
  );

  const handleDelete = useCallback(() => {
    deleteProcessPantryItems(item.id);
  }, [item.id, deleteProcessPantryItems]);

  const handleRetry = useCallback(() => {
    retryItem(item.id);
  }, [item.id, retryItem]);

  // Show loading skeleton for processing/classifying states
  if (status === "processing" || status === "classifying") {
    return <LoadingState />;
  }

  // Show failed state with retry option
  if (status === "failed") {
    return <FailedState onRetry={handleRetry} onDelete={handleDelete} />;
  }

  return (
    <View className="flex-1 flex-row items-start gap-4 p-3">
      <View
        className="w-36 relative rounded-3xl flex items-center justify-center border-continuous aspect-square bg-muted"
        style={[{ backgroundColor: item.background_color }]}
      >
        <OutlinedImage source={image_url} size={64} />
      </View>
      <View className="mt-2 flex-1 flex-column">
        <EditableTitle
          value={name}
          onChangeText={handleNameChange}
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
            updateQuantity={handleQuantityChange}
            updateUnit={handleUnitChange}
          />
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onPress={handleDelete}
            accessibilityLabel="Delete ingredient"
          >
            <Trash2Icon className="text-destructive" size={20} strokeWidth={2.618} />
          </Button>
        </View>
      </View>
    </View>
  );
}

export default React.memo(HorizontalIngredientItemCard, (prevProps, nextProps) => {
  // Custom comparison - only re-render if item properties actually changed
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.unit === nextProps.item.unit &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.item.image_url === nextProps.item.image_url &&
    prevProps.item.background_color === nextProps.item.background_color
  );
});

function LoadingState() {
  return (
    <View className="flex-1 flex-row items-start gap-4 p-3">
      <Skeleton className="w-36 rounded-3xl aspect-square bg-muted" />
      <View className="mt-2 flex-1 flex-column gap-2">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <View className="flex-1" />
        <View className="flex-row justify-between items-center">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </View>
      </View>
    </View>
  );
}

function FailedState({ onRetry, onDelete }: { onRetry: () => void; onDelete: () => void }) {
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
        <Muted className="text-sm">Unknown error</Muted>
        <View className="flex-1" />
        <View className="flex-row gap-2">
          <Button size="sm" variant="outline" className="flex-1" onPress={onRetry}>
            <Muted>Retry</Muted>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onPress={onDelete}
            accessibilityLabel="Delete ingredient"
          >
            <Trash2Icon className="text-destructive" size={20} strokeWidth={2.618} />
          </Button>
        </View>
      </View>
    </View>
  );
}
