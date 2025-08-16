import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ArrowUpRightIcon,
  BellIcon,
  ChefHatIcon,
  ImagesIcon,
  InfoIcon,
  MailIcon,
  MessageSquareHeartIcon,
  ReceiptIcon,
  SettingsIcon,
  StarIcon,
} from "lucide-nativewind";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { H1, H2, H4, P } from "~/components/ui/typography";
import Header from "~/components/Shared/Header";

const AVATAR_URL =
  "https://cdn.jsdelivr.net/gh/alohe/memojis@c6ea5d5e130d55fe6d0d34d564e4642392ddc42e/png/memo_3.png";

export default function ProfileScreen() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  // Initialize scroll tracking
  const localScrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      localScrollY.value = event.contentOffset.y;
    },
  });

  return (
    <Animated.ScrollView
      className="bg-background"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottom }}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      stickyHeaderIndices={[0]}
    >
      <Header title="Profile" scrollY={localScrollY} />
      {/* <View className="p-6 flex-row items-center gap-3">
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
          <View className="flex-1" />
        </View> */}
      <View className="p-6 pb-4 flex-row items-center mb-4 gap-3">
        <H1>Profile</H1>
      </View>
      <Card className="mx-6 shadow-md shadow-foreground/10 rounded-3xl border-continuous">
        <CardContent className="flex-row py-6 gap-3">
          <View className="flex-1 gap-0 items-center">
            <Image
              source={{ uri: AVATAR_URL }}
              className="rounded-full overflow-hidden"
              style={styles.profileCard}
            />
            <H2 className="text-center">John Doe</H2>
          </View>
          <View className="px-4">
            <H4>4</H4>
            <P className="text-sm text-primary/80 font-urbanist-medium">
              Ingredients
            </P>
            <Separator className="my-2" />
            <H4>2</H4>
            <P className="text-sm text-primary/80 font-urbanist-medium">
              Recipes cooked
            </P>
            <Separator className="my-2" />
            <H4>8</H4>
            <P className="text-sm text-primary/80 font-urbanist-medium">
              Years chef experience
            </P>
          </View>
        </CardContent>
      </Card>
      <View className="flex-row px-6 mt-6 gap-6 ">
        <Card className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none">
          <CardContent className="py-6 flex gap-3">
            <ChefHatIcon size={32} strokeWidth={1.618} />
            <P className="font-medium">Cooked Recipes</P>
          </CardContent>
        </Card>
        <Card className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none">
          <CardContent className="py-6 flex gap-3">
            <ReceiptIcon size={32} strokeWidth={1.618} />
            <P className="font-medium ">Receipts</P>
          </CardContent>
        </Card>
      </View>
      <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
        <CardContent className="py-6 flex gap-1">
          <View className="flex-row items-center">
            <H4 className="font-serif">Cookkit</H4>
            <View className="rounded-full bg-primary/10 px-3 ml-2">
              <P className="text-primary font-medium">Pro</P>
            </View>
          </View>
          <P className="font-medium pb-2">Get Pro to unlock all features</P>
          <Button className="rounded-full w-fit" size="sm" variant="default">
            <P className="text-background font-medium">Try for free</P>
          </Button>
        </CardContent>
      </Card>

      <View className="mt-12">
        <P className="text-foreground/60 font-urbanist-semibold px-6 mb-2">
          General
        </P>
        <View className="mx-6 rounded-2xl bg-muted/50 overflow-hidden border-continuous">
          <CardContent className="flex p-0 py-2">
            <ListButton
              title="Preference"
              icon={<SettingsIcon size={24} strokeWidth={2.2} />}
              onPress={() => router.push("/profile/preference")}
            />
            <ListButton
              title="Notification"
              icon={<BellIcon size={24} strokeWidth={2} />}
              onPress={() => router.push("/profile/notification")}
            />
            <ListButton
              title="Photo Access"
              icon={<ImagesIcon size={24} strokeWidth={2} />}
              onPress={() => router.push("/profile/photo-access")}
            />
          </CardContent>
        </View>
      </View>

      <View className="mt-12">
        <P className="text-foreground/60 font-urbanist-semibold px-6 mb-2">
          App
        </P>
        <View className="mx-6 rounded-2xl bg-muted/50 overflow-hidden border-continuous">
          <CardContent className="flex p-0 py-2">
            <ListButton
              title="What's new"
              icon={<StarIcon size={24} strokeWidth={2.2} />}
              onPress={() => router.push("/profile/preference")}
            />
            <ListButton
              title="Contact Us"
              icon={<MailIcon size={24} strokeWidth={2} />}
              onPress={() => router.push("/profile/notification")}
            />
          </CardContent>
        </View>
      </View>

      <View className="mt-12">
        <P className="text-foreground/60 font-urbanist-semibold px-6 mb-2">
          About
        </P>
        <View className="mx-6 rounded-2xl bg-muted/50 overflow-hidden border-continuous">
          <CardContent className="flex p-0 py-2">
            <ListButton
              title="Do you like Cookkit?"
              icon={<MessageSquareHeartIcon size={24} strokeWidth={2} />}
              onPress={() => router.push("/profile/photo-access")}
            />
            <ListButton
              title="About"
              icon={<InfoIcon size={24} strokeWidth={2} />}
              onPress={() => router.push("/profile/photo-access")}
            />
          </CardContent>
        </View>
      </View>

      <View className="mt-12">
        <P className="text-foreground/60 font-urbanist-semibold px-6 mb-2">
          Terms & Privacy
        </P>
        <View className="mx-6 rounded-2xl bg-muted/50 overflow-hidden border-continuous">
          <CardContent className="flex p-0 py-2">
            <ListButton
              title="Terms of Service"
              onPress={() => router.push("/misc/terms")}
              external
            />
            <ListButton
              title="Privacy Policy"
              onPress={() => router.push("/misc/privacy")}
              external
            />
          </CardContent>
        </View>
      </View>

      <View className="mt-24"></View>

      {/* <View className="px-6 my-12">
          <Button variant="destructive" className="w-full rounded-full">
            <P className="text-lg text-destructive-foreground font-urbanist-semibold">
              Logout
            </P>
          </Button>
        </View> */}
    </Animated.ScrollView>
  );
}

const ListButton = ({
  title,
  icon,
  onPress,
  external,
}: {
  title: string;
  icon?: React.ReactNode;
  onPress: () => void;
  external?: boolean;
}) => (
  <Button
    variant="ghost"
    className="flex flex-row justify-start items-center gap-6 px-6"
    size="lg"
    onPress={onPress}
    enableAnimation={false}
  >
    {icon}
    <P className="text-lg font-urbanist-semibold">{title}</P>
    <View className="flex-1" />
    {external && <ArrowUpRightIcon size={18} strokeWidth={1.618} />}
  </Button>
);

const styles = StyleSheet.create({
  profileCard: {
    width: 120,
    height: 120,
  },
});
