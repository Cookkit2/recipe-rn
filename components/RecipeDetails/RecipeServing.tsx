import { MinusIcon, PlusIcon } from "lucide-nativewind";
import React from "react";
import { View } from "react-native";
import { SlidingNumber } from "../SlidingNumber";
import { H4 } from "../ui/typography";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

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
        onPress={() => setServing(serving - 1)}
      >
        <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
      <Separator orientation="vertical" />
      <View className="flex-row gap-2">
        <SlidingNumber value={serving} />
        <H4 className="text-foreground/80 text-center pt-[2px]">servings</H4>
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
