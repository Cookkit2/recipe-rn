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
import { View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { H1, H4, P } from "~/components/ui/typography";
import Header from "~/components/Shared/Header";
import SetupProfileCard from "~/components/Profile/SetupProfileCard";

export default function ProfileScreen() {
  const { bottom } = useSafeAreaInsets();

  const router = useRouter();
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
      stickyHeaderIndices={[0]}
    >
      <Header title="Profile" scrollY={localScrollY} />
      <View className="p-6 pb-4 flex-row items-center mb-4 gap-3">
        <H1 className="font-bowlby-one leading-[1.6]">Profile</H1>
      </View>

      <SetupProfileCard />
      {/* <ProfileCard /> */}

      <View className="flex-row px-6 mt-6 gap-6 ">
        <Card className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none">
          <CardContent className="py-6 flex gap-3">
            <ChefHatIcon size={32} strokeWidth={1.618} />
            <P className="font-urbanist-medium">Cooked Recipes</P>
          </CardContent>
        </Card>
        <Card className="flex-1 rounded-3xl shadow-md shadow-foreground/10 border-none">
          <CardContent className="py-6 flex gap-3">
            <ReceiptIcon size={32} strokeWidth={1.618} />
            <P className="font-urbanist-medium">Receipts</P>
          </CardContent>
        </Card>
      </View>
      <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
        <CardContent className="flex-row py-6 gap-3">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center">
              <H4 className="font-urbanist-bold">Cookkit</H4>
              <View className="rounded-full bg-primary/10 px-3 ml-2">
                <P className="text-primary font-urbanist-medium">Pro</P>
              </View>
            </View>
            <P className="text-sm text-foreground/80 font-urbanist-medium">
              Get Pro to unlock all features
            </P>
          </View>
          <Button variant="default" className="rounded-xl border-continuous">
            <P className="font-urbanist-semibold text-primary-foreground">
              Try for free
            </P>
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
