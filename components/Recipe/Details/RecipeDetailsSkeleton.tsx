import { ScrollView, View, useWindowDimensions } from "react-native";
import Skeleton from "~/components/ui/skeleton";
import { P } from "~/components/ui/typography";

/** Same hero, title, metadata and ingredient layout used by the recipe detail screen. */
export default function RecipeDetailsSkeleton({
  message = "Loading recipe…",
}: {
  message?: string;
}) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      className="flex-1 bg-background"
      accessibilityLabel={message}
      accessibilityState={{ busy: true }}
      testID="recipe-details-skeleton"
    >
      <Skeleton style={{ width, height: width }} />
      <View className="-mt-8 rounded-t-3xl bg-background px-6 py-8">
        <Skeleton className="h-10 w-4/5 self-center rounded-xl" />
        <Skeleton className="mt-3 h-10 w-3/5 self-center rounded-xl" />
        <View className="mt-6 flex-row justify-center gap-4">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </View>
        <Skeleton className="mt-6 h-10 w-32 self-center rounded-full" />
        <P className="mt-6 text-center text-muted-foreground" accessibilityLiveRegion="polite">
          {message}
        </P>
        <View className="my-8 h-px bg-border" />
        <View className="flex-row gap-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-14 w-14 rounded-full" />
          ))}
        </View>
        <Skeleton className="mt-8 h-4 w-full rounded" />
        <Skeleton className="mt-3 h-4 w-4/5 rounded" />
      </View>
    </ScrollView>
  );
}
