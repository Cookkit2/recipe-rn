import React, { useState } from "react";
import { View, Alert, TextInput } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useRouter } from "expo-router";
import {
  useCurrentHousehold,
  useHouseholdMembers,
  useLeaveHousehold,
  useDissolveHousehold,
  useRegenerateInviteCode,
  useRemoveMember,
  useUpdateHouseholdName,
  useSyncSharedStock,
} from "~/hooks/queries/useHouseholdQueries";
import { useAuthStore } from "~/auth/AuthStore";
import { useHouseholdStore } from "~/store/HouseholdStore";
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
  const removeMemberMutation = useRemoveMember();
  const updateNameMutation = useUpdateHouseholdName();
  const syncMutation = useSyncSharedStock();
  const { lastSyncedAt, syncError } = useHouseholdStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

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
  const householdSupabaseId = (household as any).supabaseId;

  const formatSyncTime = (ts: number | null): string => {
    if (!ts) return "Never";
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

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
            householdSupabaseId,
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
              householdSupabaseId,
            },
            { onSuccess: () => router.back() }
          );
        },
      },
    ]);
  };

  const handleStartEditName = () => {
    setEditedName((household as any).name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (!editedName.trim() || editedName.trim() === (household as any).name) {
      setIsEditingName(false);
      return;
    }
    updateNameMutation.mutate(
      {
        householdId: household.id,
        householdSupabaseId,
        name: editedName.trim(),
      },
      { onSuccess: () => setIsEditingName(false) }
    );
  };

  const handleRemoveMember = (memberUserId: string, memberName: string) => {
    Alert.alert(
      "Remove Member?",
      `Are you sure you want to remove ${memberName} from the household?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMemberMutation.mutate(memberUserId),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background p-6">
      {/* Household Name — editable by creator */}
      {isEditingName ? (
        <TextInput
          className="text-xl font-urbanist-bold mb-2 border-b border-primary pb-1 text-foreground"
          value={editedName}
          onChangeText={setEditedName}
          onBlur={handleSaveName}
          onSubmitEditing={handleSaveName}
          autoFocus
          maxLength={50}
        />
      ) : (
        <View className="flex-row items-center mb-2">
          <P className="text-xl font-urbanist-bold">{(household as any).name}</P>
          {isCreator && (
            <Button variant="ghost" size="icon-sm" onPress={handleStartEditName}>
              <P className="text-primary text-sm">Edit</P>
            </Button>
          )}
        </View>
      )}
      <P className="text-muted-foreground mb-4">
        {memberCount} of {(household as any).maxMembers} members
      </P>

      {/* Sync Status */}
      <View className="flex-row items-center mb-6">
        <P className="text-xs text-muted-foreground">
          {syncMutation.isPending
            ? "Syncing..."
            : syncError
              ? "Sync failed"
              : `Synced ${formatSyncTime(lastSyncedAt)}`}
        </P>
        {(syncError || !syncMutation.isPending) && householdSupabaseId && (
          <Button
            variant="ghost"
            size="icon-sm"
            onPress={() => syncMutation.mutate(householdSupabaseId)}
          >
            <P className="text-primary text-xs ml-2">{syncError ? "Retry" : "Sync now"}</P>
          </Button>
        )}
      </View>

      {/* Actions */}
      <View className="rounded-2xl bg-muted/50 overflow-hidden border-continuous mb-6">
        <CardContent className="flex p-0 py-2">
          <ListButton title="Share Invite Link" onPress={handleShareLink} />
          {isCreator && <ListButton title="Regenerate Invite Code" onPress={handleRegenerate} />}
        </CardContent>
      </View>

      {/* Members List */}
      <P className="text-sm font-urbanist-bold mb-2">Members</P>
      <View className="rounded-2xl bg-muted/50 overflow-hidden border-continuous mb-6">
        <CardContent className="flex p-0 py-2">
          {members?.map((member: any) => {
            const isMe = member.userId === user?.id;
            return (
              <View
                key={member.id}
                className="flex-row items-center justify-between px-4 py-3 border-b border-border/30 last:border-b-0"
              >
                <View>
                  <P className="text-foreground">
                    {isMe ? "You" : member.displayName || member.userId}
                  </P>
                  <P className="text-xs text-muted-foreground">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </P>
                </View>
                {isCreator && !isMe && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      handleRemoveMember(member.userId, member.displayName || member.userId)
                    }
                  >
                    <P className="text-destructive text-sm">Remove</P>
                  </Button>
                )}
              </View>
            );
          })}
        </CardContent>
      </View>

      {/* Destructive Actions */}
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
