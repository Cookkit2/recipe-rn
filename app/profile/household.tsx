import React from "react";
import { View, Alert } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useRouter } from "expo-router";
import {
  useCurrentHousehold,
  useHouseholdMembers,
  useLeaveHousehold,
  useDissolveHousehold,
  useRegenerateInviteCode,
} from "~/hooks/queries/useHouseholdQueries";
import { useAuthStore } from "~/auth/AuthStore";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { CardContent } from "~/components/ui/card";
import ListButton from "~/components/Shared/ListButton";
import { toast } from "sonner-native";

export default function HouseholdSettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: household } = useCurrentHousehold();
  const { data: members } = useHouseholdMembers(household?.id);
  const leaveMutation = useLeaveHousehold();
  const dissolveMutation = useDissolveHousehold();
  const regenerateMutation = useRegenerateInviteCode();

  if (!household) {
    return (
      <View className="flex-1 bg-background p-6">
        <P>You're not in a household.</P>
      </View>
    );
  }

  const isCreator = (household as any).createdByUserId === user?.id;
  const memberCount = members?.length ?? 0;
  const inviteLink = `cookkit://join/${(household as any).inviteCode}`;

  const handleShareLink = () => {
    Clipboard.setString(inviteLink);
    toast.success("Invite link copied to clipboard!");
  };

  const handleRegenerate = () => {
    Alert.alert("Regenerate Invite Code?", "The old code will stop working.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Regenerate",
        style: "destructive",
        onPress: () =>
          regenerateMutation.mutate({
            householdId: household.id,
            householdSupabaseId: (household as any).supabaseId,
          }),
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert("Leave Household?", "Your added items will stay with the household.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          leaveMutation.mutate(household.id, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  };

  const handleDissolve = () => {
    Alert.alert("Dissolve Household?", "All members will be removed. Shared items return to you.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dissolve",
        style: "destructive",
        onPress: () => {
          dissolveMutation.mutate(
            {
              householdId: household.id,
              householdSupabaseId: (household as any).supabaseId,
            },
            { onSuccess: () => router.back() }
          );
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background p-6">
      <P className="text-xl font-urbanist-bold mb-2">{(household as any).name}</P>
      <P className="text-muted-foreground mb-6">
        {memberCount} of {(household as any).maxMembers} members
      </P>

      <View className="rounded-2xl bg-muted/50 overflow-hidden border-continuous mb-6">
        <CardContent className="flex p-0 py-2">
          <ListButton title="Share Invite Link" onPress={handleShareLink} />
          {isCreator && <ListButton title="Regenerate Invite Code" onPress={handleRegenerate} />}
        </CardContent>
      </View>

      <View className="space-y-3">
        {!isCreator && (
          <Button variant="destructive" onPress={handleLeave}>
            <P className="text-destructive-foreground">Leave Household</P>
          </Button>
        )}
        {isCreator && (
          <Button variant="destructive" onPress={handleDissolve}>
            <P className="text-destructive-foreground">Dissolve Household</P>
          </Button>
        )}
      </View>
    </View>
  );
}
