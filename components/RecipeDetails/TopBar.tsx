import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "../ui/button";
import { ArrowLeftIcon, HeartIcon } from "lucide-nativewind";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TopBar({ id }: { id: string }) {
  const [isFav, setIsFav] = useState(false);
  const { top } = useSafeAreaInsets();
  const router = useRouter();

  const toggleRecipeFavourite = () => {
    setIsFav((v) => !v);
    console.log("toggleRecipeFavourite", id);
  };

  return (
    <View
      className="absolute left-0 right-0 flex-row items-center justify-between px-6 z-[1]"
      style={{ top: top + 8 }}
      pointerEvents="box-none"
    >
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={() => router.back()}
      >
        <ArrowLeftIcon className="text-foreground" size={20} />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={toggleRecipeFavourite}
      >
        <HeartIcon
          className={isFav ? "text-red-500" : "text-foreground"}
          size={20}
        />
      </Button>
    </View>
  );
}
