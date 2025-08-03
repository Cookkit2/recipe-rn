import { Image, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { AspectRatio } from "./ui/aspect-ratio";
import { H4, P } from "./ui/typography";
import type { PantryItem } from "~/types/PantryItem";
import { Link, useRouter } from "expo-router";
import { Button } from "./ui/button";

export const PantryListItem = ({ item }: { item: PantryItem }) => {
  const router = useRouter();

  return (
    // <Link href={`/${item.id}`} asChild push>
    <View className="flex-1 max-w-[50%] flex-column items-start p-3">
      <Pressable onPress={() => router.push(`/${item.id}`)}>
        <Animated.View sharedTransitionTag="pantry-item-image-container">
          <AspectRatio className="w-full relative rounded-2xl bg-muted flex items-center justify-center">
            <Animated.Image
              sharedTransitionTag="pantry-item-image"
              source={item.image_url}
              className="w-16 h-16"
              resizeMode="contain"
            />
          </AspectRatio>
        </Animated.View>
        <View className="mt-2">
          <H4 className="opacity-80 mb-[0.5]">{item.name}</H4>
          <P className="text-muted-foreground">{item.quantity}</P>
        </View>
      </Pressable>
    </View>

    // </Link>
  );
};
