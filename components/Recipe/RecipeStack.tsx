import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { Easing, FadeInDown, useSharedValue } from "react-native-reanimated";
import Carousel, { type ICarouselInstance } from "react-native-reanimated-carousel";
import { Image } from "expo-image";
import { window } from "~/constants/sizes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Recipe } from "~/types/Recipe";
import { H2, H4, P } from "~/components/ui/typography";
import { Link } from "expo-router";
import { Button } from "~/components/ui/button";

export default function RecipeStack({ recipes }: { recipes: Recipe[] }) {
  const { top, bottom } = useSafeAreaInsets();
  const ref = useRef<ICarouselInstance>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const progress = useSharedValue<number>(0);

  const PAGE_WIDTH = window.width;
  const PAGE_HEIGHT = window.height - top;

  const activeRecipe = recipes[activeIndex] ?? recipes[0];

  const allImages = recipes.map((recipe) => recipe.imageUrl);

  const textAnim = (delayMs: number = 0) =>
    FadeInDown.duration(300).easing(Easing.out(Easing.ease)).delay(delayMs);

  return (
    <View
      className="absolute inset-0 flex items-center"
      style={{ top: top + 24 + 56, bottom: bottom + 16 }}
    >
      <View className="h-[65%] justify-center">
        <Carousel
          ref={ref}
          autoPlayInterval={2000}
          data={allImages}
          width={PAGE_WIDTH}
          height={PAGE_HEIGHT}
          loop={true}
          pagingEnabled={true}
          snapEnabled={true}
          style={styles.carousel}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.9,
            parallaxScrollingOffset: 50,
          }}
          renderItem={({ index, item }) => <Item key={index} img={item} />}
          onProgressChange={progress}
          onScrollEnd={(index) => setActiveIndex(index)}
          onSnapToItem={(index) => setActiveIndex(index)}
        />
      </View>

      {/* Top overlay content with staggered fade-in from below */}
      <View className="flex flex-1 items-center pt-6 px-10 gap-2 w-full">
        <Animated.View entering={textAnim(200)}>
          <H2 className="text-center">{activeRecipe?.title ?? ""}</H2>
        </Animated.View>
        <Animated.View entering={textAnim(250)}>
          <P className="text-center">{activeRecipe?.description ?? ""}</P>
        </Animated.View>
      </View>
      <View className="flex flex-row gap-4 justify-center mt-10">
        <Animated.View entering={textAnim(400)}>
          <Link href={`/recipes/${activeRecipe?.id}`} replace asChild>
            <Button size="lg" variant="secondary" className="rounded-full">
              <H4 className="text-foreground text-center">Details</H4>
            </Button>
          </Link>
        </Animated.View>
        <Animated.View entering={textAnim(400)}>
          <Link href={`/recipes/${activeRecipe?.id}/steps`} replace asChild>
            <Button size="lg" variant="default" className="rounded-full">
              <H4 className="text-background text-center">Cook</H4>
            </Button>
          </Link>
        </Animated.View>
      </View>
    </View>
  );
}

const Item: React.FC<{ img: string }> = ({ img }) => {
  const width = window.width * 0.7;
  const height = window.height * 0.5;

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className="flex-1 items-center justify-center"
    >
      <View
        className="rounded-3xl justify-center items-center overflow-hidden bg-background shadow-md"
        style={[
          {
            width,
            height,
          },
        ]}
      >
        <Image source={{ uri: img }} contentFit="cover" style={styles.image} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  carousel: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
