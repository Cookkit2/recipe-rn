import { View } from "react-native";
import { H4, P } from "~/components/ui/typography";
import GroceryListItem from "./GroceryListItem";
import type { GroceryListSection as GroceryListSectionType } from "~/hooks/queries/useGroceryList";
import Animated, { FadeInDown } from "react-native-reanimated";

interface GroceryListSectionProps {
  section: GroceryListSectionType;
  index: number;
}

export default function GroceryListSection({
  section,
  index,
}: GroceryListSectionProps) {
  const isPurchased = section.category === "purchased";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify().damping(20)}
      className={`mb-6 ${isPurchased ? "opacity-70" : ""}`}
    >
      {/* Grocery List Header */}
      <View className="flex-row items-center gap-2 mb-3">
        <P className="text-xl">{section.emoji}</P>
        <H4
          className={`font-urbanist-bold ${
            isPurchased ? "text-muted-foreground" : "text-foreground/80"
          }`}
        >
          {section.title}
        </H4>
        <View
          className={`flex-1 h-px ml-2 ${
            isPurchased ? "bg-muted-foreground/30" : "bg-border"
          }`}
        />
        <P
          className={`text-sm ${
            isPurchased ? "text-muted-foreground/70" : "text-muted-foreground"
          }`}
        >
          {section.items.length} {section.items.length === 1 ? "item" : "items"}
        </P>
      </View>

      {/* Section Items */}
      <View>
        {section.items.map((item) => (
          <GroceryListItem key={item.normalizedName} item={item} />
        ))}
      </View>
    </Animated.View>
  );
}
