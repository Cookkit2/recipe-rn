import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { CookingPotIcon } from "lucide-uniwind";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { usePantryStore } from "~/store/PantryContext";
import { PANTRY_ITEM_TYPES } from "~/constants/pantry-item-type";
import { cn } from "~/lib/utils";
import { paginateFilterChips } from "./filter-pages";

const CHIP_GAP = 6;
const PAGE_INSET = 4;
type FilterType = (typeof PANTRY_ITEM_TYPES)[number]["type"];

export default function IngredientCategoryButtonGroup() {
  const router = useRouter();
  const { selectedItemType, changeItemType } = usePantryStore();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [chipWidths, setChipWidths] = useState<Partial<Record<FilterType, number>>>({});
  const measured = viewportWidth > 0 && PANTRY_ITEM_TYPES.every(({ type }) => chipWidths[type]);
  const pages = measured
    ? paginateFilterChips(
        PANTRY_ITEM_TYPES.map((item) => ({ value: item, width: chipWidths[item.type] ?? 0 })),
        viewportWidth - PAGE_INSET * 2,
        CHIP_GAP
      )
    : [PANTRY_ITEM_TYPES];

  return (
    <View className="flex-row items-center gap-x-2 pb-3 px-3">
      <ScrollView
        key={viewportWidth}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        className="flex-1 min-w-0"
        style={{ opacity: measured ? 1 : 0 }}
        contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        onLayout={({ nativeEvent }) => setViewportWidth(nativeEvent.layout.width)}
      >
        {pages.map((page) => (
          <View
            key={page[0]?.type}
            style={{
              width: measured ? viewportWidth : undefined,
              flexDirection: "row",
              alignItems: "center",
              gap: CHIP_GAP,
              padding: PAGE_INSET,
            }}
          >
            {page.map(({ type, label, icon }) => {
              const isSelected = selectedItemType === type;
              return (
                <Button
                  key={type}
                  size="sm"
                  containerClassName="shrink-0"
                  onLayout={({ nativeEvent }) => {
                    const width = nativeEvent.layout.width;
                    setChipWidths((previous) =>
                      previous[type] === width ? previous : { ...previous, [type]: width }
                    );
                  }}
                  className={cn(
                    "flex-row items-center gap-1 rounded-full border-continuous border border-transparent",
                    isSelected ? "bg-foreground/80" : "bg-background border-border"
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
          </View>
        ))}
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
