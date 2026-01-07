import { useRouter } from "expo-router";
import {
  InfoIcon,
  MailIcon,
  MessageSquareHeartIcon,
  SettingsIcon,
} from "lucide-nativewind";
import React, { useCallback } from "react";
import { View, Platform, Linking } from "react-native";
import * as StoreReview from "expo-store-review";
import Constants from "expo-constants";
import Purchases from "react-native-purchases";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CardContent } from "~/components/ui/card";
import { P } from "~/components/ui/typography";
import Header from "~/components/Shared/Header";
import ListButton from "~/components/Shared/ListButton";
import { toast } from "sonner-native";
import * as WebBrowser from "expo-web-browser";
import SubscriptionCard from "~/components/Profile/SubscriptionCard";
import ActionButtonRow from "~/components/Profile/ActionButtonRow";

const appName = Constants.expoConfig?.name ?? "Cookkit";
const appVersion = Constants.expoConfig?.version ?? "unknown";
const osName = Platform.OS;
const osVersion = String(Platform.Version ?? "");

const subject = `${appName} Feedback`;
const email = "cookkit01@gmail.com";

export default function ProfileScreen() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  // const { signOut, isAuthenticated } = useAuth();
  // const authStore = useAuthStore();

  // const handleSignOut = async () => {
  //   authStore.forceSignOut();
  //   router.replace("/(auth)/sign-in");

  //   // Try remote sign out in background (don't await it)
  //   signOut()
  //     .then((result) => {
  //       console.log("Background sign out completed:", result);
  //     })
  //     .catch((error) => {
  //       console.log("Background sign out failed:", error);
  //     });
  // };

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
      stickyHeaderIndices={[0]}
    >
      <Header />

      {/* {isAuthenticated ? <ProfileCard /> : <SetupProfileCard />} */}

      <ActionButtonRow />

      <SubscriptionCard />

      <View className="mt-12">
        <P
          className="text-foreground/60 font-urbanist-semibold 
        px-6 mb-2"
        >
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
            <ListButton
              title="Contact Us"
              icon={MailIcon}
              onPress={handleContactUs}
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
              onPress={() =>
                handleOpenLink("https://www.cookkit.app/terms-and-conditions")
              }
              external
            />
            <ListButton
              title="Privacy Policy"
              onPress={() =>
                handleOpenLink("https://www.cookkit.app/privacy-policy")
              }
              external
            />
          </CardContent>
        </View>
      </View>

      <View className="mt-24"></View>

      {/* <View className="px-6 my-12">
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
      </View> */}
    </Animated.ScrollView>
  );
}
