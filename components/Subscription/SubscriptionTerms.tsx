import React, { useCallback } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { P } from "~/components/ui/typography";
import { Link } from "expo-router";
import Purchases from "react-native-purchases";
import { toast } from "sonner-native";
import Constants from "expo-constants";

const appName = Constants.expoConfig?.name ?? "Cookkit";
const appVersion = Constants.expoConfig?.version ?? "unknown";
const osName = Platform.OS;
const osVersion = String(Platform.Version ?? "");

const subject = `${appName} Feedback`;
const email = "cookkit01@gmail.com";

export default function SubscriptionTerms() {
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
      const fullUrl = `mailto:${email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(lines.join("\n"))}`;

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
          } catch (err) {
            // Failed to open simple mailto link. Will show toast below.
            console.error("Failed to open simple mailto link:", err);
          }
        }
      }
      toast.error(`Please email us at: ${email}`);
    } catch {
      toast.error(`Please email us at: ${email}`);
    }
  }, []);

  return (
    <View className="mt-8 px-2">
      <P className="text-foreground/50 font-urbanist-regular text-sm leading-6 mb-6">
        Upon confirmation, the payment will be charged to your iTunes account.
        Your subscription will automatically renew unless you cancel it at least
        24 hours before the current subscription period ends.
      </P>

      <P className="text-foreground/50 font-urbanist-regular text-sm leading-6 mb-8">
        After purchase, you can manage and turn off the auto-renewal feature in
        your iTunes & App Store account settings.
      </P>

      {/* Footer Links */}
      <View className="flex-row justify-center items-center gap-4 mb-4">
        <Link href={"https://www.cookkit.app/terms-and-conditions"} asChild>
          <P className="text-foreground/60 font-urbanist-medium text-sm">
            Terms of Service
          </P>
        </Link>
        <View className="w-1 h-1 rounded-full bg-foreground/30" />
        <Link href={"https://www.cookkit.app/privacy-policy"} asChild>
          <P className="text-foreground/60 font-urbanist-medium text-sm">
            Privacy
          </P>
        </Link>
        <View className="w-1 h-1 rounded-full bg-foreground/30" />
        <Pressable onPress={handleContactUs}>
          <P className="text-foreground/60 font-urbanist-medium text-sm">
            Contact Us
          </P>
        </Pressable>
        {/* <View className="w-1 h-1 rounded-full bg-foreground/30" />
            <P className="text-foreground/60 font-urbanist-medium text-sm">
              Redeem
            </P> */}
      </View>
    </View>
  );
}
