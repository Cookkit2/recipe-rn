import { Pressable, ActivityIndicator } from "react-native";
import Animated, { BounceIn } from "react-native-reanimated";
import { AlertCircleIcon } from "lucide-uniwind";
import { Image } from "expo-image";
import { useCreateIngredientStore, type CreatePantryItem } from "~/store/CreateIngredientContext";

const size = 28;

interface IngredientThumbnailProps {
  item: CreatePantryItem;
}

export default function IngredientThumbnail({ item }: IngredientThumbnailProps) {
  const { status, id, image_url } = item;
  const { removeItem, retryItem } = useCreateIngredientStore();

  const renderItem = () => {
    switch (status) {
      case "processing":
        return <ActivityIndicator size="small" color="white" />;
      case "failed":
        return (
          <Pressable onPress={() => retryItem(id)} onLongPress={() => removeItem(id)}>
            <AlertCircleIcon className="text-red-400" size={16} />
          </Pressable>
        );
      default:
        return (
          <Image
            source={image_url}
            style={{ width: size, height: size }}
            contentFit="contain"
            contentPosition="center"
          />
        );
    }
  };

  return (
    <Animated.View
      entering={BounceIn.springify().damping(15).mass(1).stiffness(150)}
      style={[{ width: size, height: size }]}
      className="ml-3 items-center justify-center"
    >
      {renderItem()}
    </Animated.View>
  );
}
