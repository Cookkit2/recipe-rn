import React, { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../ui/button";
import { ArrowLeftIcon, StarIcon } from "lucide-nativewind";
import { useRouter } from "expo-router";
import { cn } from "~/lib/tw-merge";

export default function IngredientAppBar() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();

  const [isFav, setIsFav] = useState(false);

  return (
    <View
      className="absolute left-0 right-0 flex-row items-center justify-between px-6 pt-4 z-10"
      style={{ top }}
    >
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={() => router.back()}
      >
        <ArrowLeftIcon
          className="text-foreground"
          size={20}
          strokeWidth={2.618}
        />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={() => setIsFav(!isFav)}
      >
        {isFav ? (
          <StarIcon
            className={cn(
              "text-warning color-yellow-500",
              isFav && "text-yellow-500"
            )}
            fill="yellow"
            size={20}
            strokeWidth={2.618}
          />
        ) : (
          <StarIcon className="text-foreground" size={20} strokeWidth={2.618} />
        )}
      </Button>
    </View>
  );
}
