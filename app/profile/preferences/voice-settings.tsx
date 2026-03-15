import { View, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P, Small } from "~/components/ui/typography";
import { useVoiceCookingSettings } from "~/hooks/useVoiceCooking";
import Slider from "@react-native-community/slider";
import useColors from "~/hooks/useColor";

export default function VoiceSettingsScreen() {
  const { bottom } = useSafeAreaInsets();
  const colors = useColors();
  const { settings, updateSettings, toggleEnabled, toggleAutoRead } = useVoiceCookingSettings();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
    >
      {/* Voice commands info */}
      <Card className="mx-6 mt-6 border-none shadow-none bg-muted/50 rounded-3xl">
        <CardContent className="py-6">
          <H4 className="font-urbanist-semibold">Voice Commands</H4>
          <P className="font-urbanist-regular text-muted-foreground mt-1">
            While cooking, tap the mic button and use these commands:
          </P>
          <View className="gap-1 mt-4">
            <CommandRow command="Next" description="Go to next step" />
            <CommandRow command="Previous" description="Go back a step" />
            <CommandRow command="Set timer" description="Start a cooking timer" />
            <CommandRow command="Cancel" description="Cancel most recent timer" />
            <CommandRow command="Done" description="Finish cooking" />
            <CommandRow
              command="How much [ingredient]"
              description="Ask about ingredient amounts"
            />
            <CommandRow command="What's the temperature" description="Get cooking temperature" />
            <CommandRow command="Explain step" description="Clarify current step" />
          </View>
        </CardContent>
      </Card>

      {/* Voice Settings */}
      <Card className="mx-6 mt-6 border-none shadow-none bg-muted/50 rounded-3xl">
        <CardContent className="py-6">
          <H4 className="font-urbanist-semibold mb-4">Voice Settings</H4>

          {/* Master Toggle */}
          <SettingRow title="Enable Voice" description="Read recipe steps aloud">
            <Switch
              trackColor={{ false: colors.muted, true: colors.primary }}
              value={settings.enabled}
              onValueChange={toggleEnabled}
            />
          </SettingRow>

          {/* Auto-Read Toggle */}
          {settings.enabled && (
            <SettingRow
              title="Auto-Read Steps"
              description="Automatically read each step"
              className="mt-4"
            >
              <Switch
                trackColor={{ false: colors.muted, true: colors.primary }}
                value={settings.autoReadSteps}
                onValueChange={toggleAutoRead}
              />
            </SettingRow>
          )}

          {/* Speech Rate Slider */}
          {settings.enabled && (
            <View className="mt-6">
              <View className="flex-row justify-between items-center mb-2">
                <P className="font-urbanist-medium text-foreground">Speech Rate</P>
                <Small className="text-muted-foreground">{settings.speechRate.toFixed(1)}x</Small>
              </View>
              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={0.5}
                maximumValue={1.5}
                step={0.1}
                value={settings.speechRate}
                onSlidingComplete={(value) => updateSettings({ speechRate: value })}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.muted}
              />
              <View className="flex-row justify-between mt-1">
                <Small className="text-muted-foreground">Slower</Small>
                <Small className="text-muted-foreground">Faster</Small>
              </View>
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

function CommandRow({ command, description }: { command: string; description: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <P className="font-urbanist-medium text-primary w-24">"{command}"</P>
      <P className="font-urbanist-regular text-muted-foreground">→ {description}</P>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <View className="flex-row items-center gap-3 flex-1">
        {icon && <View className="text-primary">{icon}</View>}
        <View className="flex-1">
          <P className="font-urbanist-medium text-foreground">{title}</P>
          <P className="font-urbanist-regular text-muted-foreground text-sm">{description}</P>
        </View>
      </View>
      <View className="ml-3">{children}</View>
    </View>
  );
}
