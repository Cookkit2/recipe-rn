import React from "react";
import { View, StyleSheet } from "react-native";
import { H2, P } from "~/components/ui/typography";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import { Image } from "expo-image";
import MaskedView from "@react-native-masked-view/masked-view";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { formatDuration } from "~/utils/time-formatter";

const CongratulationsContent = () => {
  const { recipe, duration } = useRecipeSteps();

  return (
    <>
      <View className="flex-1 flex bg-black rounded-3xl border-continuous p-4 justify-center items-center">
        <P className="text-lg text-center text-white/90 font-urbanist-medium mb-2">
          You've completed
        </P>
        <H2 className="text-primary font-bowlby-one px-6 text-center">
          {recipe.title}
        </H2>

        <View className="w-[80%] aspect-square mb-4">
          <MaskedView
            style={styles.fill}
            maskElement={
              <ShapeContainer index={12} text="" width="100%" height="100%" />
            }
          >
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.fill}
              contentFit="cover"
            />
          </MaskedView>
        </View>
        <P className="text-lg text-center text-white/80 font-urbanist-extrabold mb-1">
          Completed in{" "}
          <P className="text-primary">
            {duration ? formatDuration(duration) : "..."}
          </P>
          ! 🎉
        </P>
        <P className="text-center text-white/80 font-urbanist-semibold">
          Great job following and enjoy your dishes!
        </P>
      </View>
    </>
  );
};

export default CongratulationsContent;

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
