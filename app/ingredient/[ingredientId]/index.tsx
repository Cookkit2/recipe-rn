import React, { useEffect } from "react";
import Animated, { useAnimatedRef, useScrollOffset } from "react-native-reanimated";
import useColors from "~/hooks/useColor";
import ListItem from "~/components/Shared/ListItem";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import EditableTitle from "~/components/Shared/EditableTitle";
import { View } from "react-native";
import { Separator } from "~/components/ui/separator";
import { H4 } from "~/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIngredientDetailStore } from "~/store/IngredientDetailContext";
import { setStatusBarStyle } from "expo-status-bar";
import DateSection from "~/components/Ingredient/DateSection";
import HeroImage from "~/components/Ingredient/IngredientHeroImage";
import IngredientMeta from "~/components/Ingredient/IngredientMeta";
import IngredientQuantity from "~/components/Ingredient/IngredientQuantity";
import IngredientDiscardButton from "~/components/Ingredient/IngredientDiscardButton";

export default function IngredientPage() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const { bottom } = useSafeAreaInsets();
  const { pantryItem: item, updatePantryItem } = useIngredientDetailStore();

  const scrollOffset = useScrollOffset(scrollRef);
  const colors = useColors();

  useEffect(() => {
    setStatusBarStyle("light", true);
    return () => setStatusBarStyle("auto", true);
  }, []);

  return (
    <Animated.ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      className="bg-background"
      contentContainerStyle={{ paddingBottom: bottom + 96 }}
    >
      {/* Hero Image Section */}
      <HeroImage scrollOffset={scrollOffset} />

      {/* Header */}
      <View className="flex-1 bg-background rounded-t-3xl -mt-8 px-6 pt-8 border-continuous shadow-sm">
        <EditableTitle
          value={item.name}
          onChangeText={(text) => updatePantryItem({ ...item, name: text })}
          placeholder="Enter title"
          TextComponent="Title"
          textClassName="text-center"
          onEndEditing={() => updatePantryItem({ ...item, name: item.name })}
        />

        <IngredientMeta />

        <IngredientQuantity
          className="mb-4"
          quantity={item.quantity}
          unit={item.unit}
          updateQuantity={(quantity) => updatePantryItem({ ...item, quantity })}
          updateUnit={(unit) => updatePantryItem({ ...item, unit })}
        />
      </View>

      <View className="px-6 bg-background">
        <DateSection />

        {/* <IngredientDiscardButton /> */}

        {item.steps_to_store.length > 0 && (
          <>
            <Separator className="my-8" />

            <View className="gap-4">
              <H4 className="font-bowlby-one text-foreground/70">Steps to store</H4>
              {item.steps_to_store.map((step, index) => (
                <ListItem
                  key={step.id}
                  icon={
                    <ShapeContainer
                      width={28}
                      height={28}
                      color={colors.primary}
                      index={index}
                      text={index + 1 + ""}
                    />
                  }
                  title={step.title}
                  description={step.description}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </Animated.ScrollView>
  );
}
