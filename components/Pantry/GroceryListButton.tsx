import { View } from "react-native";
import { Button } from "~/components/ui/button";
import { ShoppingCartIcon } from "lucide-uniwind";
import { Link, router } from "expo-router";
import { useGroceryItemCount } from "~/hooks/queries/useGroceryList";
import { P } from "~/components/ui/typography";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export default function GroceryListButton() {
  const { count, isLoading } = useGroceryItemCount();

  return (
    <View className="relative">
      <Link href="/grocery-list" asChild>
        <Button size="icon-sm" variant="ghost">
          <ShoppingCartIcon className="text-foreground" size={18} strokeWidth={3} />
        </Button>
      </Link>

      {/* Badge showing count of items to buy */}
      {!isLoading && count > 0 && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="absolute -top-1.5 -right-1.5 bg-destructive rounded-full min-w-5 h-5 items-center justify-center px-1"
        >
          <P className="text-destructive-foreground text-xs font-urbanist-bold">
            {count > 99 ? "99+" : count}
          </P>
        </Animated.View>
      )}
    </View>
  );
}
