import React from "react";
import useColors from "~/hooks/useColor";
import { P } from "~/components/ui/typography";
import { Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";

const RECIPE_TAGS: {
  label: string;
  icon: React.JSX.Element;
  tag: string;
}[] = [
  {
    label: "Meal",
    icon: <SymbolView name="fork.knife" size={18} />,
    tag: "meal",
  },
  {
    label: "Dessert",
    icon: <SymbolView name="cup.and.saucer" size={18} />,
    tag: "dessert",
  },
  {
    label: "Drink",
    icon: <SymbolView name="wineglass" size={18} />,
    tag: "drink",
  },
];

export default function RecipeCategoryButtonGroup({
  selectedRecipeTags,
  updateRecipeTag,
}: {
  selectedRecipeTags: string[];
  updateRecipeTag: (tag: string) => void;
}) {
  const colors = useColors();

  return (
    <View className="flex-row gap-3 px-6">
      {RECIPE_TAGS.map(({ label, icon, tag }) => (
        <Pressable
          key={tag}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: selectedRecipeTags.includes(tag) }}
          className={"border-continuous flex-row items-center gap-2 rounded-2xl"}
          style={{
            backgroundColor: selectedRecipeTags.includes(tag)
              ? colors.primary
              : colors.mutedForeground,
          }}
          onPress={() => updateRecipeTag(tag)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${label} category`}
        >
          {React.cloneElement(icon, {
            style: {
              color: selectedRecipeTags.includes(tag)
                ? colors.primaryForeground
                : colors.background,
            },
          })}
          <P
            className={"font-urbanist-semibold text-lg leading-snug"}
            style={{
              color: selectedRecipeTags.includes(tag)
                ? colors.primaryForeground
                : colors.background,
            }}
          >
            {label}
          </P>
        </Pressable>
      ))}
    </View>
  );
}
