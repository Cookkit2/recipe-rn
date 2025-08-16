import React from "react";
import { View } from "react-native";
import { H4 } from "../../ui/typography";
import LeafIcon from "~/lib/icons/Leaf";

export default function UserChoice() {
  return (
    <View className="items-center mt-3">
      <View className="flex-row items-center gap-2 opacity-90">
        <LeafIcon
          size={20}
          className="text-foreground/80"
          style={{ transform: [{ scaleX: -1 }] }}
        />
        <H4 className="text-foreground/80">User's Choice</H4>
        <LeafIcon size={20} className="text-foreground/80" />
      </View>
    </View>
  );
}
