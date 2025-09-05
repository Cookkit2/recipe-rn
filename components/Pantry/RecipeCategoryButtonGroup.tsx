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
import { cn } from "~/lib/tw-merge";
import { usePantryStore } from "~/store/PantryContext";
import { useRecipeStore } from "~/store/RecipeContext";

const RECIPE_TAGS = [
  {
    label: "Meals",
    icon: <SoupIcon className="text-background" size={18} strokeWidth={3} />,
    tag: "meals",
  },
  {
    label: "Desserts",
    icon: (
      <IceCreamConeIcon className="text-background" size={18} strokeWidth={3} />
    ),
    tag: "desserts",
  },
  {
    label: "Drinks",
    icon: <MartiniIcon className="text-background" size={18} strokeWidth={3} />,
    tag: "drinks",
  },
];

export default function RecipeCategoryButtonGroup() {
  const { updateRecipeOpen: updateSelection } = usePantryStore();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-3 px-6"
    >
      <Button
        size="icon"
        variant="secondary"
        className="bg-foreground/80 h-12 w-12"
        onPress={() => updateSelection(false)}
      >
        <XIcon className="text-background/80" />
      </Button>
      <Button
        variant="outline"
        className="rounded-2xl border-continuous flex-row items-center gap-2"
      >
        <DicesIcon
          className="text-muted-foreground"
          size={18}
          strokeWidth={3}
        />
        <P className="text-lg text-muted-foreground font-urbanist-semibold leading-snug">
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
  icon: React.ReactNode;
  tag: string;
}) => {
  const { snapToExpanded } = usePantryStore();
  const { selectedRecipeTags, updateRecipeTag } = useRecipeStore();

  return (
    <Button
      variant="default"
      className={cn(
        "rounded-2xl border-continuous flex-row gap-2 items-center",
        selectedRecipeTags.includes(tag) ? "bg-primary" : "bg-muted-foreground"
      )}
      onPress={() => {
        updateRecipeTag(tag);
        startTransition(() => snapToExpanded());
      }}
    >
      {icon}
      <P
        className={cn(
          "text-lg font-urbanist-semibold leading-snug",
          selectedRecipeTags.includes(tag)
            ? "text-primary-foreground"
            : "text-background"
        )}
      >
        {label}
      </P>
    </Button>
  );
};
