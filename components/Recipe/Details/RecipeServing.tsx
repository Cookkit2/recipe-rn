import { MinusIcon, PlusIcon } from "lucide-uniwind";
import React from "react";
import { View } from "react-native";
import { SlidingNumber } from "~/components/Shared/SlidingNumber";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";

export default function RecipeServing() {
  const { servings, updateServings } = useRecipeDetailStore();
  return (
    <View className="flex-row items-center justify-center gap-4 mt-4">
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        disabled={servings <= 1}
        onPress={() => servings > 1 && updateServings(servings - 1)}
      >
        <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
      <Separator orientation="vertical" />
      <View className="flex-row gap-1">
        <SlidingNumber value={servings} />
        <P className="font-urbanist-semibold text-foreground/80 pt-1">servings</P>
      </View>
      <Separator orientation="vertical" />
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => updateServings(servings + 1)}
      >
        <PlusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
    </View>
  );
}
