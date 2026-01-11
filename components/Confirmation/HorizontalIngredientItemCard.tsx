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
import { H3, Muted } from "~/components/ui/typography";
import Skeleton from "../ui/skeleton";

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
    return <LoadingState />;
  }

  // Show failed state with retry option
  if (status === "failed") {
    return (
      <FailedState
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

function LoadingState() {
  const colors = useColors();

  return (
    <View className="flex-1 flex-row items-start gap-4 p-3">
      <Skeleton
        className="w-36 rounded-3xl aspect-square"
        style={{ backgroundColor: colors.muted }}
      />
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

function FailedState({
  onRetry,
  onDelete,
}: {
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
        <Muted className="text-sm">Unknown error</Muted>
        <View className="flex-1" />
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onPress={onRetry}
          >
            <RefreshCwIcon size={20} strokeWidth={2.618} />
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
