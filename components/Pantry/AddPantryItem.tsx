import { useRouter } from "expo-router";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-nativewind";
import { ActivityIndicator, InteractionManager } from "react-native";
import { useState } from "react";
import allModel from "~/hooks/model/allModel";
import { log } from "~/utils/logger";

export default function AddPantryItem() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const navigateToCreateIngredient = () => {
    if (allModel.isLoaded()) {
      router.push("/ingredient/create");
      return;
    }

    setIsLoading(true);
    
    // Use InteractionManager to ensure UI updates before heavy model loading
    InteractionManager.runAfterInteractions(async () => {
      try {
        await allModel.get();
        router.push("/ingredient/create");
      } catch (error) {
        log.error("Failed to load model:", error);
        // Still navigate even if model loading fails
        router.push("/ingredient/create");
      } finally {
        setIsLoading(false);
      }
    });
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
