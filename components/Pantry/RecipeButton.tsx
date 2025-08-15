import { Link } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { ChefHatIcon } from "lucide-nativewind";
import { H4 } from "../ui/typography";
import TextShimmer from "../ui/TextShimmer";

export default function RecipeButton() {
  const { bottom: pb } = useSafeAreaInsets();
  return (
    <View
      className="absolute left-0 right-0 flex-row justify-center"
      style={{ bottom: 16 + pb }}
    >
      <Link href="/recipes" push asChild>
        <Button
          size="lg"
          variant="default"
          className="flex-row gap-2 rounded-full"
        >
          <ChefHatIcon
            className="text-background"
            size={20}
            strokeWidth={2.618}
          />
          <TextShimmer
            className="text-primary-foreground text-center"
            component={H4}
          >
            Let's Cook
          </TextShimmer>
          {/* <H4 className="text-primary-foreground text-center">Let's Cook</H4> */}
        </Button>
      </Link>
    </View>
  );
}
