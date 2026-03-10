import React from "react";
import { ScrollView, View, Switch } from "react-native";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P, Small } from "~/components/ui/typography";
import { useNotificationSettings } from "~/hooks/useNotificationSettings";

export default function NotificationScreen() {
  const {
    settings,
    permission,
    permissionDenied,
    toggleEnabled,
    toggleIngredientExpiry,
    toggleAchievements,
    toggleChallenges,
  } = useNotificationSettings();

  const masterDisabled = !settings.enabled;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      showsVerticalScrollIndicator={false}
    >
      <Card className="mx-6 mt-6 border-none shadow-none bg-muted/50 rounded-3xl">
        <CardContent className="py-6">
          <H4 className="font-urbanist-semibold mb-2">Push Notifications</H4>
          <P className="font-urbanist-regular text-muted-foreground mb-4">
            Control which Cookkit notifications you want to receive.
          </P>

          <SettingRow
            title="Enable Notifications"
            description="Allow Cookkit to send notifications."
          >
            <Switch value={settings.enabled} onValueChange={toggleEnabled} />
          </SettingRow>

          {permissionDenied && (
            <P className="font-urbanist-regular text-xs text-destructive mt-3">
              System notifications are disabled for Cookkit. Enable them in your device settings
              to receive alerts.
            </P>
          )}
        </CardContent>
      </Card>

      <Card className="mx-6 mt-6 border-none shadow-none bg-muted/50 rounded-3xl">
        <CardContent className="py-6">
          <H4 className="font-urbanist-semibold mb-4">Notification Types</H4>

          <SettingRow
            title="Ingredient expiry alerts"
            description="Get reminders before ingredients go bad."
            disabled={masterDisabled}
          >
            <Switch
              value={settings.ingredientExpiry}
              onValueChange={toggleIngredientExpiry}
              disabled={masterDisabled}
            />
          </SettingRow>

          <SettingRow
            title="Achievements & level-ups"
            description="Celebrate milestones and XP gains."
            className="mt-4"
            disabled={masterDisabled}
          >
            <Switch
              value={settings.achievements}
              onValueChange={toggleAchievements}
              disabled={masterDisabled}
            />
          </SettingRow>

          <SettingRow
            title="Challenges & streaks"
            description="Daily/weekly challenges and streak reminders."
            className="mt-4"
            disabled={masterDisabled}
          >
            <Switch
              value={settings.challenges}
              onValueChange={toggleChallenges}
              disabled={masterDisabled}
            />
          </SettingRow>
        </CardContent>
      </Card>

      <View className="mb-8" />
    </ScrollView>
  );
}

function SettingRow({
  title,
  description,
  children,
  className = "",
  disabled = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <View className="flex-row items-center gap-3 flex-1">
        <View className="flex-1 opacity-100">
          <P
            className={`font-urbanist-medium ${
              disabled ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {title}
          </P>
          <Small className="font-urbanist-regular text-muted-foreground text-xs">
            {description}
          </Small>
        </View>
      </View>
      <View className="ml-3 opacity-100">{children}</View>
    </View>
  );
}

