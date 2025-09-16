import React, { startTransition } from "react";
import {
  DicesIcon,
  IceCreamConeIcon,
  MartiniIcon,
  SoupIcon,
  XIcon,
} from "lucide-nativewind";
import { Button } from "../ui/button";
import { P } from "../ui/typography";
import { ScrollView } from "react-native";
import { usePantryStore } from "~/store/PantryContext";
import { useRecipeStore } from "~/store/RecipeContext";
import { useLightColors } from "~/hooks/useColor";

const RECIPE_TAGS: {
  label: string;
  icon: React.JSX.Element;
  tag: string;
}[] = [
  {
    label: "Meals",
    icon: <SoupIcon size={18} strokeWidth={3} />,
    tag: "meals",
  },
  {
    label: "Desserts",
    icon: <IceCreamConeIcon size={18} strokeWidth={3} />,
    tag: "desserts",
  },
  {
    label: "Drinks",
    icon: <MartiniIcon size={18} strokeWidth={3} />,
    tag: "drinks",
  },
];

export default function RecipeCategoryButtonGroup() {
  const { updateRecipeOpen: updateSelection } = usePantryStore();
  const lightColors = useLightColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-3 px-6"
    >
      <Button
        size="icon"
        variant="ghost"
        className="h-12 w-12"
        onPress={() => updateSelection(false)}
      >
        <XIcon className="text-white/80" />
      </Button>
      <Button
        variant="outline"
        className="rounded-2xl border-continuous flex-row items-center gap-2"
        style={{ backgroundColor: lightColors.background }}
      >
        <DicesIcon
          style={{ outlineColor: lightColors.mutedForeground }}
          size={18}
          strokeWidth={3}
        />
        <P
          className="text-lg text-muted-foreground font-urbanist-semibold leading-snug"
          style={{ color: lightColors.mutedForeground }}
        >
          Choose for me!
        </P>
      </Button>
      {RECIPE_TAGS.map(({ label, icon, tag }) => (
        <SegmentedButton key={tag} label={label} icon={icon} tag={tag} />
      ))}
    </ScrollView>
  );
}

const SegmentedButton = ({
  label,
  icon,
  tag,
}: {
  label: string;
  icon: React.JSX.Element;
  tag: string;
}) => {
  const { snapToExpanded } = usePantryStore();
  const { selectedRecipeTags, updateRecipeTag } = useRecipeStore();
  const lightColors = useLightColors();

  return (
    <Button
      variant="default"
      className={"rounded-2xl border-continuous flex-row gap-2 items-center"}
      style={{
        backgroundColor: selectedRecipeTags.includes(tag)
          ? lightColors.primary
          : lightColors.mutedForeground,
      }}
      onPress={() => {
        updateRecipeTag(tag);
        startTransition(() => snapToExpanded());
      }}
    >
      {React.cloneElement(icon, {
        style: {
          color: selectedRecipeTags.includes(tag)
            ? lightColors.primaryForeground
            : lightColors.background,
        },
      })}
      <P
        className={"text-lg font-urbanist-semibold leading-snug"}
        style={{
          color: selectedRecipeTags.includes(tag)
            ? lightColors.primaryForeground
            : lightColors.background,
        }}
      >
        {label}
      </P>
    </Button>
  );
};
