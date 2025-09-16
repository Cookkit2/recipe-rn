import { View, Pressable, Alert } from "react-native";
import { SlidingNumber } from "~/components/SlidingNumber";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { H4 } from "~/components/ui/typography";
import { MinusIcon, PlusIcon } from "lucide-nativewind";
import { cn } from "~/lib/tw-merge";
import { UNIT_OPTIONS } from "~/constants/ingredient-units";
import { storage } from "~/data";
import { PREF_UNIT_SYSTEM_KEY } from "~/constants/storage-keys";

export default function IngredientQuantity({
  quantity,
  unit,
  updateQuantity,
  updateUnit,
  className,
  size = "default",
}: {
  quantity: number;
  unit: string;
  updateQuantity: (newQuantity: number) => void;
  updateUnit: (newUnit: string) => void;
  className?: string;
  size?: "default" | "sm";
}) {
  const currentUnit = (storage.get(PREF_UNIT_SYSTEM_KEY) || "si") as
    | "si"
    | "imperial";

  const showUnitPicker = () => {
    const buttons = [
      ...UNIT_OPTIONS[currentUnit].map((option) => ({
        text: option.label,
        onPress: () => updateUnit(option.value),
      })),
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Select Unit", undefined, buttons);
  };

  return (
    <View
      className={cn("flex-row items-center justify-center gap-4", className)}
    >
      <Button
        size={size === "default" ? "icon" : "icon-sm"}
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => updateQuantity(Math.max(0, quantity - 1))}
      >
        <MinusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
      {size === "default" && <Separator orientation="vertical" />}
      <View className="flex-row gap-1">
        <SlidingNumber
          value={quantity}
          onValueChange={(newValue) => updateQuantity(Math.max(0, newValue))}
        />
        <Pressable onPress={showUnitPicker} className="min-w-[24px]">
          <H4 className="text-center font-urbanist-medium">{unit}</H4>
        </Pressable>
      </View>

      {size === "default" && <Separator orientation="vertical" />}
      <Button
        size={size === "default" ? "icon" : "icon-sm"}
        variant="ghost"
        className="rounded-full"
        enableDebounce={false}
        onPress={() => updateQuantity(quantity + 1)}
      >
        <PlusIcon className="text-foreground" size={20} strokeWidth={2.618} />
      </Button>
    </View>
  );
}
