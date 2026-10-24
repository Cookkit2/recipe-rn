import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { validateRecipeImportDraft } from "~/lib/recipe-scrapper/shared/import-review";
import type { RecipeImportDraft } from "~/types/RecipeImportDraft";

export default function RecipeImportReview({
  draft,
  saving,
  onSave,
  onBack,
}: {
  draft: RecipeImportDraft;
  saving: boolean;
  onSave: (draft: RecipeImportDraft) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(draft.recipe.title);
  const [servings, setServings] = useState(String(draft.recipe.servings));
  const [prepMinutes, setPrepMinutes] = useState(String(draft.recipe.prepMinutes));
  const [cookMinutes, setCookMinutes] = useState(String(draft.recipe.cookMinutes));
  const [ingredients, setIngredients] = useState(
    draft.recipe.ingredients.map((item) => ({
      ...item,
      amount: item.quantity > 0 ? String(item.quantity) : "",
    }))
  );
  const [steps, setSteps] = useState(draft.recipe.steps);
  const reviewed: RecipeImportDraft = {
    ...draft,
    recipe: {
      ...draft.recipe,
      title,
      servings: Number(servings),
      prepMinutes: Number(prepMinutes),
      cookMinutes: Number(cookMinutes),
      ingredients: ingredients.map(({ amount, ...item }) => ({
        ...item,
        notes: item.notes === "Amount not specified" && Number(amount) > 0 ? undefined : item.notes,
        quantity: Number(amount.replace(",", ".")),
      })),
      steps: steps.map((step, index) => ({ ...step, step: index + 1 })),
    },
  };
  const validation = validateRecipeImportDraft(reviewed);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!saving) onBack();
      }}
    >
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="gap-2 border-b border-border p-4">
            <Text className="text-2xl font-semibold">Review recipe</Text>
            <Text className="text-sm text-muted-foreground">
              Check the amounts and instructions before saving.
            </Text>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 p-4"
            keyboardShouldPersistTaps="handled"
          >
            {draft.warnings.map((warning, index) => (
              <Text key={index} className="text-sm text-muted-foreground">
                {warning}
              </Text>
            ))}
            {draft.recipe.sourceUrl ? (
              <Text selectable numberOfLines={2} className="text-xs text-muted-foreground">
                {draft.recipe.sourceUrl}
              </Text>
            ) : null}
            <Text>Recipe name</Text>
            <Input
              accessibilityLabel="Recipe name"
              value={title}
              onChangeText={setTitle}
              editable={!saving}
              maxLength={200}
            />
            <View className="flex-row gap-2">
              <View className="flex-1 gap-2">
                <Text className="text-sm">Servings</Text>
                <Input
                  accessibilityLabel="Servings"
                  keyboardType="number-pad"
                  value={servings}
                  onChangeText={setServings}
                  editable={!saving}
                />
              </View>
              <View className="flex-1 gap-2">
                <Text className="text-sm">Prep (min)</Text>
                <Input
                  accessibilityLabel="Preparation minutes"
                  keyboardType="number-pad"
                  value={prepMinutes}
                  onChangeText={setPrepMinutes}
                  editable={!saving}
                />
              </View>
              <View className="flex-1 gap-2">
                <Text className="text-sm">Cook (min)</Text>
                <Input
                  accessibilityLabel="Cooking minutes"
                  keyboardType="number-pad"
                  value={cookMinutes}
                  onChangeText={setCookMinutes}
                  editable={!saving}
                />
              </View>
            </View>
            <Text className="text-lg font-semibold">Ingredients</Text>
            {ingredients.map((item, index) => (
              <View key={index} className="gap-2 rounded-xl border border-border p-3">
                <Input
                  accessibilityLabel={`Ingredient ${index + 1}`}
                  placeholder="Ingredient"
                  value={item.name}
                  editable={!saving}
                  onChangeText={(name) =>
                    setIngredients((items) =>
                      items.map((value, at) => (at === index ? { ...value, name } : value))
                    )
                  }
                />
                <View className="flex-row gap-2">
                  <Input
                    className="flex-1"
                    accessibilityLabel={`Amount for ingredient ${index + 1}`}
                    placeholder="Amount needed"
                    keyboardType="decimal-pad"
                    value={item.amount}
                    editable={!saving}
                    onChangeText={(amount) =>
                      setIngredients((items) =>
                        items.map((value, at) => (at === index ? { ...value, amount } : value))
                      )
                    }
                  />
                  <Input
                    className="flex-1"
                    accessibilityLabel={`Unit for ingredient ${index + 1}`}
                    placeholder="Unit (e.g. g)"
                    value={item.unit}
                    editable={!saving}
                    onChangeText={(unit) =>
                      setIngredients((items) =>
                        items.map((value, at) => (at === index ? { ...value, unit } : value))
                      )
                    }
                  />
                </View>
                {item.notes ? (
                  <Text className="text-xs text-muted-foreground">{item.notes}</Text>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  accessibilityLabel={`Remove ingredient ${index + 1}`}
                  onPress={() => setIngredients((items) => items.filter((_, at) => at !== index))}
                >
                  <Text>Remove ingredient</Text>
                </Button>
              </View>
            ))}
            <Button
              variant="outline"
              disabled={saving}
              onPress={() =>
                setIngredients((items) => [
                  ...items,
                  { name: "", quantity: 0, amount: "", unit: "", notes: undefined },
                ])
              }
            >
              <Text>Add ingredient</Text>
            </Button>
            <Text className="text-lg font-semibold">Instructions</Text>
            {steps.map((step, index) => (
              <View key={index} className="gap-2">
                <Text>Step {index + 1}</Text>
                <Input
                  accessibilityLabel={`Instruction ${index + 1}`}
                  value={step.description}
                  editable={!saving}
                  multiline
                  className="min-h-24"
                  textAlignVertical="top"
                  onChangeText={(description) =>
                    setSteps((items) =>
                      items.map((value, at) => (at === index ? { ...value, description } : value))
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  accessibilityLabel={`Remove step ${index + 1}`}
                  onPress={() => setSteps((items) => items.filter((_, at) => at !== index))}
                >
                  <Text>Remove step</Text>
                </Button>
              </View>
            ))}
            <Button
              variant="outline"
              disabled={saving}
              onPress={() =>
                setSteps((items) => [
                  ...items,
                  { step: items.length + 1, title: "", description: "" },
                ])
              }
            >
              <Text>Add step</Text>
            </Button>
          </ScrollView>
          <View className="gap-2 border-t border-border p-4">
            {validation ? (
              <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">
                {validation}
              </Text>
            ) : null}
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                containerClassName="flex-1"
                disabled={saving}
                onPress={onBack}
              >
                <Text>Back</Text>
              </Button>
              <Button
                containerClassName="flex-1"
                disabled={!!validation || saving}
                isLoading={saving}
                onPress={() => onSave(reviewed)}
              >
                <Text>Save recipe</Text>
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
