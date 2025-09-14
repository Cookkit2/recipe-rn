import { useRouter } from "expo-router";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-nativewind";
import { ActivityIndicator } from "react-native";
import { useState } from "react";
import allModel from "~/hooks/model/allModel";

export default function AddPantryItem() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const navigateToCreateIngredient = async () => {
    if (allModel.isLoaded()) {
      router.push("/ingredient/create");
      return;
    }

    setIsLoading(true);
    await allModel.get();
    router.push("/ingredient/create");
    setIsLoading(false);
  };

  return (
    <Button
      size="icon-sm"
      variant="default"
      className="bg-foreground rounded-xl"
      disabled={isLoading}
      onPress={navigateToCreateIngredient}
    >
      {isLoading ? (
        <ActivityIndicator size="small" />
      ) : (
        <PlusIcon className="text-background" size={18} strokeWidth={3} />
      )}
    </Button>
  );
}
