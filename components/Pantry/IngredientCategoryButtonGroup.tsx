import React from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { CookingPotIcon } from "lucide-uniwind";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { usePantryStore } from "~/store/PantryContext";
import { PANTRY_ITEM_TYPES } from "~/constants/pantry-item-type";
import { cn } from "~/lib/utils";

export default function IngredientCategoryButtonGroup() {
  const router = useRouter();
  const { selectedItemType, changeItemType } = usePantryStore();

  return (
    <View className="flex-row items-center gap-x-2 pb-3 px-3">
      <ScrollView
        horizontal
        className="flex-1 min-w-0"
        contentContainerClassName="flex-row gap-x-2"
        showsHorizontalScrollIndicator={false}
        alwaysBounceHorizontal={false}
      >
        {PANTRY_ITEM_TYPES.map(({ type, label, icon }) => {
          const isSelected = selectedItemType === type;
          return (
            <Button
              key={type}
              size="sm"
              className={cn(
                "flex-row items-center gap-1 rounded-full border-continuous",
                isSelected ? "bg-foreground/80" : "bg-background border border-border"
              )}
              onPress={() => changeItemType(type)}
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
            >
              {React.cloneElement(icon, {
                className: cn(isSelected ? "text-background" : "text-foreground"),
              })}
              <P
                className={cn(
                  "text-sm font-urbanist-medium tracking-wider",
                  isSelected ? "text-background" : "text-foreground"
                )}
              >
                {label}
              </P>
            </Button>
          );
        })}
      </ScrollView>
      <Button
        size="sm"
        containerClassName="shrink-0"
        className="flex-row items-center gap-1 rounded-full border-continuous bg-background border border-border"
        accessibilityLabel="Leftovers"
        onPress={() => router.push("/leftovers")}
      >
        <CookingPotIcon className="text-foreground" size={18} />
        <P className="text-sm font-urbanist-medium tracking-wider text-foreground">Leftovers</P>
      </Button>
    </View>
  );
}
