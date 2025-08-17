import React from "react";
import { Card, CardContent } from "../ui/card";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Separator } from "../ui/separator";
import { H2, H4, P } from "../ui/typography";

const AVATAR_URL =
  "https://cdn.jsdelivr.net/gh/alohe/memojis@c6ea5d5e130d55fe6d0d34d564e4642392ddc42e/png/memo_3.png";

export default function ProfileCard() {
  return (
    <Card className="mx-6 shadow-md shadow-foreground/10 rounded-3xl border-continuous">
      <CardContent className="flex-row py-6 gap-3">
        <View className="flex-1 gap-0 items-center">
          <Image
            source={{ uri: AVATAR_URL }}
            className="rounded-full overflow-hidden"
            style={styles.profileCard}
          />
          <H2 className="font-urbanist-semibold text-center">John Doe</H2>
        </View>
        <View className="px-4">
          <H4 className="font-urbanist-semibold">4</H4>
          <P className="text-sm text-foreground/80 font-urbanist-medium">
            Ingredients
          </P>
          <Separator className="my-2" />
          <H4 className="font-urbanist-semibold">2</H4>
          <P className="text-sm text-foreground/80 font-urbanist-medium">
            Recipes cooked
          </P>
          <Separator className="my-2" />
          <H4 className="font-urbanist-semibold">8</H4>
          <P className="text-sm text-foreground/80 font-urbanist-medium">
            Years chef experience
          </P>
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    width: 120,
    height: 120,
  },
});
