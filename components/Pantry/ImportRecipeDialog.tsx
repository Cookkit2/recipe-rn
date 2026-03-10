import { useState } from "react";
import { View, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinkIcon } from "lucide-uniwind";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useImportRecipe } from "~/hooks/queries/useRecipeImportQueries";

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportRecipeDialog({ open, onOpenChange }: ImportRecipeDialogProps) {
  const router = useRouter();
  const [recipeUrl, setRecipeUrl] = useState("");
  const { importRecipeAsync, importStatus, isPending, reset } = useImportRecipe();

  const isImporting =
    isPending ||
    (importStatus !== "idle" && importStatus !== "complete" && importStatus !== "error");

  const handleSubmit = async () => {
    if (!recipeUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      const result = await importRecipeAsync(recipeUrl);

      if (result.success && result.recipe?.id) {
        toast.success("Recipe imported successfully!");
        onOpenChange(false);
        setRecipeUrl("");
        reset();
        router.push(`/recipes/${result.recipe.id}`);
      } else {
        const errorMessage = result.error || "Failed to import recipe";
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import recipe";
      toast.error(errorMessage);
    }
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setRecipeUrl("");
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Recipe from URL</DialogTitle>
          <DialogDescription>
            Paste a YouTube video or any recipe website URL to automatically extract the recipe
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="flex-row items-center bg-muted rounded-xl px-4 py-3">
            <LinkIcon className="text-muted-foreground mr-2" size={18} />
            <TextInput
              className="flex-1 text-foreground"
              placeholder="Paste recipe URL here..."
              placeholderTextColor="#888"
              value={recipeUrl}
              onChangeText={setRecipeUrl}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              keyboardType="url"
              editable={!isImporting}
            />
          </View>
        </View>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button onPress={handleSubmit} disabled={isImporting || !recipeUrl.trim()}>
            {isImporting ? <ActivityIndicator size="small" color="white" /> : <Text>Import</Text>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
