import { MinusIcon, PlusIcon } from "lucide-nativewind";
import React from "react";
import { View } from "react-native";
import { SlidingNumber } from "~/components/SlidingNumber";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

export default function RecipeServing({
  serving,
  setServing,
}: {
  serving: number;
  setServing: (serving: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-4 mt-4">
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        disabled={serving <= 1}
        onPress={() => serving > 1 && setServing(serving - 1)}
      >
        <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
      <Separator orientation="vertical" />
      <View className="flex-row gap-1">
        <SlidingNumber value={serving} />
        <P className="font-urbanist-semibold text-foreground/80 pt-1">
          servings
        </P>
      </View>
      <Separator orientation="vertical" />
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => setServing(serving + 1)}
      >
        <PlusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
    </View>
  );
}
