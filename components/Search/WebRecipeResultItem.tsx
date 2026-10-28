import { useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { H4, Small } from "~/components/ui/typography";
import type { WebRecipeSearchResult } from "~/types/WebRecipeSearch";
import Skeleton from "~/components/ui/skeleton";

export function WebRecipeResultSkeleton() {
  return (
    <View testID="web-recipe-skeleton" className="px-5 flex-row items-center gap-3">
      <Skeleton className="w-24 h-24 rounded-xl" />
      <View className="flex-1 min-h-32 justify-center gap-2 border-b border-border">
        <Skeleton className="h-5 w-4/5 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
      </View>
    </View>
  );
}

export function WebRecipeResultItem({
  result,
  onPress,
  isLast,
}: {
  result: WebRecipeSearchResult;
  onPress: (result: WebRecipeSearchResult) => void;
  isLast: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open recipe ${result.title} from ${result.source}`}
      onPress={() => onPress(result)}
      className="px-5 flex-row items-center gap-3 active:bg-muted"
    >
      <View className="w-24 h-24 rounded-xl bg-muted items-center justify-center overflow-hidden">
        {result.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: result.imageUrl }}
            style={{ width: 96, height: 96 }}
            contentFit="cover"
            transition={150}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Small className="text-muted-foreground">Recipe</Small>
        )}
      </View>
      <View
        className={`flex-1 min-h-32 py-4 justify-center gap-1 ${isLast ? "" : "border-b border-border"}`}
      >
        <H4 className="text-foreground font-urbanist-semibold" numberOfLines={2}>
          {result.title}
        </H4>
        <Small className="text-muted-foreground" numberOfLines={1}>
          {result.source}
        </Small>
        {result.description ? (
          <Small className="text-muted-foreground" numberOfLines={2}>
            {result.description}
          </Small>
        ) : null}
      </View>
    </Pressable>
  );
}
