import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInviteInfo, useJoinHousehold } from "~/hooks/queries/useHouseholdQueries";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";

export default function JoinHouseholdScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { data: inviteInfo, isLoading, error } = useInviteInfo(code ?? "");
  const joinMutation = useJoinHousehold();

  const handleJoin = () => {
    joinMutation.mutate(code!, {
      onSuccess: () => {
        router.replace("/profile/household" as any);
      },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !inviteInfo) {
    return (
      <View className="flex-1 bg-background p-6 items-center justify-center">
        <P className="text-lg font-urbanist-bold mb-2">Invalid Invite</P>
        <P className="text-muted-foreground text-center">This invite code isn't valid.</P>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <P className="text-2xl font-urbanist-bold mb-2">{inviteInfo.household.name}</P>
      <P className="text-muted-foreground mb-8">
        {inviteInfo.memberCount} member{inviteInfo.memberCount !== 1 ? "s" : ""}
      </P>

      <Button onPress={handleJoin} disabled={joinMutation.isPending}>
        <P className="text-primary-foreground">
          {joinMutation.isPending ? "Joining..." : "Join Household"}
        </P>
      </Button>

      {joinMutation.error && (
        <P className="text-destructive mt-4 text-center">{joinMutation.error.message}</P>
      )}
    </View>
  );
}
