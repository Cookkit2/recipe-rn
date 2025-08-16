import { Link } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { ChefHatIcon } from "lucide-nativewind";
import { H4 } from "../ui/typography";
import TextShimmer from "../ui/TextShimmer";

export default function RecipeButton() {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      className="absolute left-0 right-0 flex-row justify-center"
      style={{ bottom: bottom + 8 }}
    >
      <Link href="/recipes" push asChild>
        <Button
          size="lg"
          variant="secondary"
          className="rounded-2xl border-continuous bg-foreground/80 shadow-lg"
        >
          <TextShimmer className="flex-row items-center gap-2 justify-center">
            <>
              <ChefHatIcon
                className="text-background"
                size={18}
                strokeWidth={3}
              />
              <H4 className="text-background font-urbanist font-semibold">
                Let's Cook
              </H4>
            </>
          </TextShimmer>
        </Button>
      </Link>
    </View>
  );
}
