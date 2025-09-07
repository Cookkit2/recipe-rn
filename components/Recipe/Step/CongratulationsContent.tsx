import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { H2, P } from "~/components/ui/typography";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import { Image } from "expo-image";
import MaskedView from "@react-native-masked-view/masked-view";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { formatDuration } from "~/utils/time-formatter";
// import { PIConfetti, type PIConfettiMethods } from "react-native-fast-confetti";
// import { Button } from "~/components/ui/button";
// import { useImage, useSVG } from "@shopify/react-native-skia";
// import { CURVES } from "~/constants/curves";

const CongratulationsContent = () => {
  // const confettiRef = useRef<PIConfettiMethods>(null);
  // const snowFlakeSVG = useSVG(require("~/assets/svg/circle.svg"));

  // const onPressCelebrate = () => {
  //   confettiRef.current?.restart();
  // };
  const { recipe, duration } = useRecipeSteps();

  return (
    <>
      {/* <PIConfetti
        ref={confettiRef}
        fadeOutOnEnd
        count={100}
        type="svg"
        flakeSvg={snowFlakeSVG!}
        colors={["#F6774B", "#ED80B1", "#6DC4D0", "#5AB63F", "#FCD543"]}
        flakeSize={{ width: 20, height: 20 }}
        blastDuration={100}
        blastRadius={200}
        // randomSpeed={{ min: 300, max: 600 }}
        fallDuration={4000}
        easing={CURVES["expressive.fast.effects"].easing}
      /> */}
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
