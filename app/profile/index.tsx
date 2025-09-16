import { Link, useRouter } from "expo-router";
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
import React, { useCallback, useEffect } from "react";
import { View, Platform, Linking } from "react-native";
import * as StoreReview from "expo-store-review";
import Constants from "expo-constants";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { H1, H4, P } from "~/components/ui/typography";
import Header from "~/components/Shared/Header";
import SetupProfileCard from "~/components/Profile/SetupProfileCard";
import ListButton from "~/components/Shared/ListButton";
import { toast } from "sonner-native";
import * as WebBrowser from "expo-web-browser";
import { useAuth, useAuthStore } from "~/auth";
import { presentPaywall } from "~/utils/subscription-utils";
import ProfileCard from "~/components/Profile/ProfileCard";
import { storage } from "~/data";
import {
  ONBOARDING_COMPLETED_KEY,
  PREFERENCE_COMPLETED_KEY,
} from "~/constants/storage-keys";

const appName = Constants.expoConfig?.name ?? "Cookkit";
const appVersion = Constants.expoConfig?.version ?? "unknown";
const osName = Platform.OS;
const osVersion = String(Platform.Version ?? "");

const subject = `${appName} Feedback`;
const email = "cookkit01@gmail.com";

const revenuecatProjectAppleApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_PROJECT_APPLE_API_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_PROJECT_APPLE_API_KEY;

export default function ProfileScreen() {
  const { bottom } = useSafeAreaInsets();

  const router = useRouter();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const { signOut, isAuthenticated } = useAuth();
  const authStore = useAuthStore();

  // TODO: Configure paywall
  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === "ios" && revenuecatProjectAppleApiKey) {
      Purchases.configure({
        apiKey: revenuecatProjectAppleApiKey,
      });
    }
    // else if (Platform.OS === "android" && revenuecatProjectGoogleApiKey) {
    //   Purchases.configure({
    //     apiKey: revenuecatProjectGoogleApiKey,
    //   });
    // }
  }, []);

  const handleSignOut = async () => {
    authStore.forceSignOut();
    router.replace("/(auth)/sign-in");

    // Try remote sign out in background (don't await it)
    signOut()
      .then((result) => {
        console.log("Background sign out completed:", result);
      })
      .catch((error) => {
        console.log("Background sign out failed:", error);
      });
  };

  const handleContactUs = useCallback(async () => {
    try {
      const rcId = await Purchases.getAppUserID();

      const lines = [
        `Hi ${appName} Team,`,
        "",
        "I'm having some issues with the app.",
        "",
        "[Describe your issue here]",
        "",
        "",
        "— More Info —",
        `App Name: ${appName}`,
        `Version: ${appVersion}`,
        `System: ${osName} ${osVersion}`,
        rcId ? `RC ID: ${rcId}` : undefined,
        // If you track a CloudKit or custom user id, replace this placeholder
        "CK UserID: N/A",
        "",
        "Sent from my device",
      ].filter(Boolean) as string[];

      // Try with full mailto URL first
      const fullUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        lines.join("\n")
      )}`;

      // Check if we can open mailto URLs
      const canOpenMailto = await Linking.canOpenURL("mailto:");

      if (canOpenMailto) {
        // Try the full URL first
        try {
          await Linking.openURL(fullUrl);
          return;
        } catch {
          // Fallback to simple mailto
          try {
            await Linking.openURL(`mailto:${email}`);
            return;
          } catch {
            // Silent fail, will show toast below
          }
        }
      }

      // If mailto doesn't work, show a toast with the email address
      toast.error(`Please email us at: ${email}`, {
        duration: 5000,
      });
    } catch {
      toast.error("Please email us at: cookkit01@gmail.com");
    }
  }, []);

  const handleOpenLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      toast.error(`Failed to open the link`);
    }
  };

  const handleOpenRating = async () => {
    // Directly open the App Store / Play Store listing (configured via app.json)
    try {
      const url = StoreReview.storeUrl();
      if (url) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      toast.error(`Failed to open the rating`);
    }
  };

  return (
    <Animated.ScrollView
      className="bg-background"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottom }}
      // onScroll={scrollHandler}
      ref={scrollRef}
      stickyHeaderIndices={[0]}
    >
      <Header scrollOffset={scrollOffset} />
      {/* <View className="p-6 pb-4 flex-row items-center mb-4 gap-3">
        <H1 className="font-bowlby-one pt-2">Profile</H1>
      </View> */}
      <View className="pb-4" />

      {isAuthenticated ? <ProfileCard /> : <SetupProfileCard />}

      {/* <View className="flex-row px-6 mt-6 gap-6 ">
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
      </View> */}
      <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
        <CardContent className="flex-row py-6 gap-3">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center">
              <H4 className="font-urbanist-bold">Cookkit</H4>
              <View className="rounded-full bg-primary/10 px-3 ml-2">
                <P className="text-sm text-primary font-urbanist-medium">
                  Trial
                </P>
              </View>
            </View>
            <P className="text-sm text-foreground/80 font-urbanist-medium">
              Your trial ends in 21 days.
            </P>
          </View>
          <Button
            variant="default"
            className="rounded-xl border-continuous"
            onPress={() => presentPaywall()}
          >
            <P className="font-urbanist-semibold text-primary-foreground">
              Subscribe
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
              title="Preferences"
              icon={SettingsIcon}
              onPress={() => router.push("/profile/preferences")}
            />
            {/* <ListButton
              title="Notification"
              icon={BellIcon}
              onPress={() => router.push("/profile/notification")}
            /> */}
            {/* <ListButton
              title="Photo Access"
              icon={ImagesIcon}
              onPress={() => router.push("/profile/photo-access")}
            /> */}
            <ListButton
              title="Contact Us"
              icon={MailIcon}
              onPress={handleContactUs}
            />
          </CardContent>
        </View>
      </View>

      {/* <View className="mt-12">
        <P className="text-foreground/60 font-urbanist-semibold px-6 mb-2">
          App
        </P>
        <View className="mx-6 rounded-2xl bg-muted/50 overflow-hidden border-continuous">
          <CardContent className="flex p-0 py-2">
            <ListButton
              title="What's new"
              icon={StarIcon}
              onPress={() => router.push("/profile/preference")}
            />
            <ListButton
              title="Contact Us"
              icon={MailIcon}
              onPress={() => router.push("/profile/notification")}
            />
          </CardContent>
        </View>
      </View> */}

      <View className="mt-12">
        <P className="text-foreground/60 font-urbanist-semibold px-6 mb-2">
          About
        </P>
        <View className="mx-6 rounded-2xl bg-muted/50 overflow-hidden border-continuous">
          <CardContent className="flex p-0 py-2">
            <ListButton
              title="Do you like Cookkit?"
              icon={MessageSquareHeartIcon}
              onPress={handleOpenRating}
              external
            />
            <ListButton
              title="About"
              icon={InfoIcon}
              onPress={() => handleOpenLink("https://www.cookkit.app/")}
              external
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
              // onPress={() => router.push("/misc/terms")}
              onPress={() =>
                handleOpenLink("https://www.cookkit.app/terms-and-conditions")
              }
              external
            />
            <ListButton
              title="Privacy Policy"
              // onPress={() => router.push("/misc/privacy")}
              onPress={() =>
                handleOpenLink("https://www.cookkit.app/privacy-policy")
              }
              external
            />
          </CardContent>
        </View>
      </View>
      <View>
        <Button
          onPress={() => {
            storage.delete(ONBOARDING_COMPLETED_KEY);
          }}
        >
          <P>Clear onboarding key</P>
        </Button>
        <Button
          onPress={() => {
            storage.delete(PREFERENCE_COMPLETED_KEY);
          }}
        >
          <P>Clear preference key</P>
        </Button>
      </View>

      <View className="mt-24"></View>

      <View className="px-6 my-12">
        {isAuthenticated && (
          <Button
            variant="destructive"
            className="w-full rounded-full"
            onPress={handleSignOut}
          >
            <P className="text-lg text-destructive-foreground font-urbanist-semibold">
              Logout
            </P>
          </Button>
        )}
      </View>
    </Animated.ScrollView>
  );
}
