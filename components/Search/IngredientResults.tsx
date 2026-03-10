import React from "react";
import { View, Animated } from "react-native";
import { H4, Small } from "~/components/ui/typography";
import OutlinedImage from "~/components/ui/outlined-image";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import useColors from "~/hooks/useColor";
import { useSearchPantryItems } from "~/hooks/queries/usePantryQueries";
import { SearchResultSection, SearchResultRow } from "./SearchResultPrimitives";

type Item = NonNullable<ReturnType<typeof useSearchPantryItems>["data"]>[number];

type IngredientResultItemProps = {
  item: Item;
  index: number;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
};

function IngredientResultItem({ item, index, isLast, colors }: IngredientResultItemProps) {
  return (
    <SearchResultRow
      href={`/ingredient/${item.id}`}
      isLast={isLast}
      media={
        <Animated.View
          className="w-24 rounded-xl flex items-center justify-center border-continuous aspect-square"
          style={{ backgroundColor: item.background_color || colors.muted }}
        >
          {item.image_url ? (
            <OutlinedImage source={item.image_url} size={32} />
          ) : (
            <ShapeContainer
              index={index}
              width={32}
              height={32}
              text="?"
              textClassname="text-xl text-foreground/70 leading-[2]"
              color={colors.border}
              collapsable={false}
            />
          )}
        </Animated.View>
      }
    >
      <H4 className="text-foreground font-urbanist-semibold">{item.name}</H4>
      <Small className="mt-1 text-muted-foreground font-urbanist-medium capitalize">
        {item.type} · {item.quantity} {item.unit}
      </Small>
    </SearchResultRow>
  );
}

type IngredientResultsProps = {
  items: ReturnType<typeof useSearchPantryItems>["data"];
  colors: ReturnType<typeof useColors>;
};

export function IngredientResults({ items, colors }: IngredientResultsProps) {
  if (!items || items.length === 0) return null;
  return (
    <SearchResultSection title="Pantry">
      {items.map((item, index) => (
        <IngredientResultItem
          key={item.id}
          item={item}
          index={index}
          isLast={index === items.length - 1}
          colors={colors}
        />
      ))}
    </SearchResultSection>
  );
}
