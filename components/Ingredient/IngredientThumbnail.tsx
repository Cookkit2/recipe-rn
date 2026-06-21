import { Pressable, ActivityIndicator, View } from "react-native";
import Animated, { BounceIn } from "react-native-reanimated";
import { AlertCircleIcon, HelpCircleIcon } from "lucide-uniwind";
import { Image } from "expo-image";
import { useCreateIngredientStore, type CreatePantryItem } from "~/store/CreateIngredientContext";
import { P } from "../ui/typography";

const size = 28;

interface IngredientThumbnailProps {
  item: CreatePantryItem;
}

/**
 * Renders the per-item thumbnail in the camera header row. Three recognition
 * states are visually distinct:
 *  - processing: spinner
 *  - failed: red alert (tap to retry, long-press to remove)
 *  - needs_review: amber "Review" badge over the AI's best-guess image, so the
 *    user spots a low-confidence/hallucinated recognition at scan time and
 *    corrects it inline instead of letting it enter the pantry silently (#728).
 */
export default function IngredientThumbnail({ item }: IngredientThumbnailProps) {
  const { status, id, image_url } = item;
  const { removeItem, retryItem } = useCreateIngredientStore();

  const renderItem = () => {
    switch (status) {
      case "processing":
        return <ActivityIndicator size="small" color="white" />;
      case "failed":
        return (
          <Pressable
            onPress={() => retryItem(id)}
            onLongPress={() => removeItem(id)}
            accessibilityRole="button"
            accessibilityLabel="Retry or remove ingredient"
          >
            <AlertCircleIcon className="text-red-400" size={16} />
          </Pressable>
        );
      case "needs_review":
        // Show the AI's best guess behind an amber review badge so the user
        // knows this recognition is low-confidence and should be checked.
        return (
          <View className="relative items-center justify-center">
            <Image
              source={image_url}
              style={{ width: size, height: size, opacity: 0.6 }}
              contentFit="contain"
              contentPosition="center"
            />
            <View className="absolute -bottom-2 -right-2 bg-amber-500 rounded-full p-[1px]">
              <HelpCircleIcon className="text-white" size={12} />
            </View>
          </View>
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

// Re-exported so consumers can render the small "Review" label affordance
// without duplicating the badge styling.
export function NeedsReviewLabel() {
  return (
    <P className="text-amber-400 text-[10px] font-urbanist-bold uppercase tracking-wide">Review</P>
  );
}
