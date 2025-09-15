import React, { useState } from "react";
import { View } from "react-native";
import { SlidingNumber } from "~/components/SlidingNumber";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { H4, P } from "~/components/ui/typography";
import { MinusIcon, PlusIcon } from "lucide-nativewind";
import { cn } from "~/lib/tw-merge";

export default function IngredientQuantity({
  initialQuantity,
  initialUnit,
  className,
  size = "default",
}: {
  initialQuantity: number;
  initialUnit: string;
  className?: string;
  size?: "default" | "sm";
}) {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [unit] = useState<string>(initialUnit);

  return (
    <View
      className={cn("flex-row items-center justify-center gap-4", className)}
    >
      <Button
        size={size === "default" ? "icon" : "icon-sm"}
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => setQuantity(Math.max(0, quantity - 1))}
      >
        <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
      {size === "default" && <Separator orientation="vertical" />}
      <View className="flex-row gap-1">
        <SlidingNumber
          value={quantity}
          onValueChange={(newValue) => setQuantity(Math.max(0, newValue))}
        />
        {size === "default" ? (
          <P className="font-urbanist-semibold text-foreground/80 pt-0.5">
            {unit}
          </P>
        ) : (
          <H4 className="text-center font-urbanist-medium">{unit}</H4>
        )}
      </View>
      {size === "default" && <Separator orientation="vertical" />}
      <Button
        size={size === "default" ? "icon" : "icon-sm"}
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
