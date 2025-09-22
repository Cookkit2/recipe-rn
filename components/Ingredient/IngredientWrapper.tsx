import React from "react";
import Animated, {
  useScrollViewOffset,
  type AnimatedRef,
} from "react-native-reanimated";
import IngredientQuantity from "./IngredientQuantity";
import useColors from "~/hooks/useColor";
import IngredientAppBar from "./IngredientAppBar";
import ListItem from "~/components/Shared/ListItem";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import useDeviceCornerRadius from "~/hooks/useDeviceCornerRadius";
import EditableTitle from "~/components/Shared/EditableTitle";
import HeroImage from "./IngredientHeroImage";
import IngredientMeta from "./IngredientMeta";
import DateSection from "./DateSection";
import { ScrollView, View } from "react-native";
import { Separator } from "~/components/ui/separator";
import { H4 } from "~/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIngredientDetailStore } from "~/store/IngredientDetailContext";

interface IngredientViewProps {
  ScrollComponent: (
    props: React.ComponentProps<typeof ScrollView>
  ) => React.ReactElement;
  scrollRef: AnimatedRef<Animated.ScrollView>;
}

export default function IngredientWrapper({
  ScrollComponent,
  scrollRef,
}: IngredientViewProps) {
  const { bottom } = useSafeAreaInsets();
  const { pantryItem: item, updatePantryItem } = useIngredientDetailStore();

  const borderRadius = useDeviceCornerRadius();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const colors = useColors();

  return (
    <View
      className="relative flex-1 bg-background overflow-hidden"
      style={{ borderRadius }}
    >
      {/* App Bar Section */}
      <IngredientAppBar
        id={item.id}
        scrollOffset={scrollOffset}
        title={item.name}
      />

      {/* Content Section */}
      <ScrollComponent
        showsVerticalScrollIndicator={false}
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
            updateQuantity={(quantity) =>
              updatePantryItem({ ...item, quantity })
            }
            updateUnit={(unit) => updatePantryItem({ ...item, unit })}
          />
        </View>

        <View className="px-6 bg-background">
          <DateSection />

          {item.steps_to_store.length > 0 && (
            <>
              <Separator className="my-8" />

              <View className="gap-4">
                <H4 className="font-bowlby-one text-foreground/70">
                  Steps to store
                </H4>
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
      </ScrollComponent>
    </View>
  );
}
