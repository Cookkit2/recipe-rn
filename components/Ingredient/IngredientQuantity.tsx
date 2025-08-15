import React, { useState } from "react";
import { View } from "react-native";
import { SlidingNumber } from "~/components/SlidingNumber";
import { Separator } from "~/components/ui/separator";
import { Button } from "../ui/button";
import { MinusIcon, PlusIcon } from "lucide-nativewind";

export default function IngredientQuantity() {
  const [quantity, setQuantity] = useState(1);

  return (
    <View className="flex-row items-center justify-center gap-4 mb-4">
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => setQuantity(quantity - 1)}
      >
        <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
      <Separator orientation="vertical" />
      <SlidingNumber value={quantity} />
      <Separator orientation="vertical" />
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => setQuantity(quantity + 1)}
      >
        <PlusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
    </View>
  );
}
