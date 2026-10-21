import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useImportRecipe } from "~/hooks/queries/useRecipeImportQueries";
import { normalizeSharedRecipe } from "~/utils/shared-recipe";
import type { SharedRecipeInput } from "~/types/SharedRecipe";

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialInput?: SharedRecipeInput;
}

export default function ImportRecipeDialog({
  open,
  onOpenChange,
  initialInput,
}: ImportRecipeDialogProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const request = useRef(0);
  const { importRecipeAsync, importStatus, isPending, reset } = useImportRecipe();

  useEffect(() => {
    if (open) setContent([initialInput?.url, initialInput?.text].filter(Boolean).join("\n\n"));
    return () => {
      request.current += 1;
    };
  }, [open, initialInput?.url, initialInput?.text]);

  const isImporting =
    isPending ||
    (importStatus !== "idle" && importStatus !== "complete" && importStatus !== "error");

  const handleSubmit = async () => {
    if (isImporting) return;
    const input = normalizeSharedRecipe({ text: content });
    if (!input) {
      toast.error("Enter a valid recipe link or paste the caption.");
      return;
    }

    const currentRequest = request.current;
    try {
      const result = await importRecipeAsync(input);
      if (request.current !== currentRequest) return;

      if (result.success && result.recipe?.id) {
        toast.success("Recipe imported successfully!");
        onOpenChange(false);
        setContent("");
        reset();
        router.push(`/recipes/${result.recipe.id}`);
      } else {
        const errorMessage = result.error || "Failed to import recipe";
        toast.error(errorMessage);
      }
    } catch (err) {
      if (request.current !== currentRequest) return;
      const errorMessage = err instanceof Error ? err.message : "Failed to import recipe";
      toast.error(errorMessage);
    }
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      request.current += 1;
      setContent("");
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import recipe</DialogTitle>
        </DialogHeader>

        <Input
          testID="import-recipe-content-input"
          accessibilityLabel="Recipe link or caption"
          placeholder="Paste a recipe link or caption"
          value={content}
          onChangeText={setContent}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          multiline
          maxLength={32000}
          className="min-h-36 px-4 py-4 text-left"
          textAlignVertical="top"
          editable={!isImporting}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button onPress={handleSubmit} disabled={!content.trim()} isLoading={isImporting}>
            <Text>Import</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
