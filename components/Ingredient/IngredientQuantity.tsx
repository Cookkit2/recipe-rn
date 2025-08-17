import React, { useState } from "react";
import { View } from "react-native";
import { SlidingNumber } from "~/components/SlidingNumber";
import { Separator } from "~/components/ui/separator";
import { Button } from "../ui/button";
import { MinusIcon, PlusIcon } from "lucide-nativewind";
import { P } from "../ui/typography";

export default function IngredientQuantity({
  initialQuantity,
  initialUnit,
}: {
  initialQuantity: number;
  initialUnit: string;
}) {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [unit] = useState<string>(initialUnit);

  return (
    <View className="flex-row items-center justify-center gap-4 mb-4">
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => setQuantity(Math.max(0, quantity - 1))}
      >
        <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
      <Separator orientation="vertical" />
      <View className="flex-row gap-1">
        <SlidingNumber
          value={quantity}
          onValueChange={(newValue) => setQuantity(Math.max(0, newValue))}
        />
        <P className="font-urbanist-semibold text-foreground/80 pt-0.5">
          {unit}
        </P>
      </View>
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
