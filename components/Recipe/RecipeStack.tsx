import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown, useSharedValue } from "react-native-reanimated";
import Carousel, {
  type ICarouselInstance,
} from "react-native-reanimated-carousel";
import { Image } from "expo-image";
import { window } from "~/constants/sizes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Recipe } from "~/data/dummy-recipes";
import { H2, P } from "../ui/typography";
import { useRouter } from "expo-router";

export default function RecipeStack({ recipes }: { recipes: Recipe[] }) {
  const { top, bottom } = useSafeAreaInsets();
  const ref = useRef<ICarouselInstance>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const progress = useSharedValue<number>(0);
  const router = useRouter();

  const PAGE_WIDTH = window.width;
  const PAGE_HEIGHT = window.height - top;

  const activeRecipe = recipes[activeIndex] ?? recipes[0];

  const allImages = recipes.map((recipe) => recipe.imageUrl);

  return (
    <Pressable
      className="absolute inset-0 flex items-center"
      style={{ top: top + 24 + 56, bottom: bottom + 16 }}
      onPress={() => router.replace(`/recipes/${activeRecipe?.id}`)}
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
          // modeConfig={{
          //   snapDirection: "left",
          //   stackInterval: 18,
          //   rotateZDeg: 15,
          // }}
          // customConfig={() => ({ type: "positive", viewCount: 5 })}
          renderItem={({ index, item }) => <Item key={index} img={item} />}
          onProgressChange={progress}
          onScrollEnd={(index) => setActiveIndex(index)}
          onSnapToItem={(index) => setActiveIndex(index)}
        />
      </View>

      {/* Top overlay button placed last to ensure it renders above and captures touches */}
      <View className="flex items-center pt-10 px-10 gap-2 w-full">
        <H2 className="text-center">{activeRecipe?.title ?? ""}</H2>
        <P className="text-center">{activeRecipe?.description ?? ""}</P>
      </View>
    </Pressable>
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
        className="rounded-3xl justify-center items-center overflow-hidden bg-background shadow-current"
        style={[
          {
            width,
            height,
          },
          styles.cardShadow,
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
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.46,
    shadowRadius: 11.14,

    elevation: 17,
  },
});
