import { useState } from "react";
import { View, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useCreateHousehold } from "~/hooks/queries/useHouseholdQueries";
import { useEntitlement } from "~/hooks/queries/useEntitlement";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";

export default function CreateHouseholdScreen() {
  const [name, setName] = useState("");
  const { isPro, isLoading } = useEntitlement();
  const router = useRouter();
  const createMutation = useCreateHousehold();

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a household name.");
      return;
    }
    createMutation.mutate(name.trim(), {
      onSuccess: () => {
        router.replace("/profile/household" as any);
      },
    });
  };

  return (
    <View className="flex-1 bg-background p-6">
      <P className="text-lg font-urbanist-bold mb-4">Create a Household</P>

      <TextInput
        className="bg-muted rounded-xl px-4 py-3 text-foreground mb-4"
        placeholder="Household name"
        value={name}
        onChangeText={setName}
        maxLength={50}
      />

      {!isLoading && !isPro && (
        <P className="text-sm text-muted-foreground mb-4">
          Free plan: up to 2 members. Upgrade to Pro for up to 6 members.
        </P>
      )}

      <Button onPress={handleCreate} disabled={createMutation.isPending || !name.trim()}>
        <P className="text-primary-foreground">
          {createMutation.isPending ? "Creating..." : "Create Household"}
        </P>
      </Button>
    </View>
  );
}
