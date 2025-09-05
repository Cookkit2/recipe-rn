import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import {
  useRecipes,
  useSearchRecipes,
  useAddRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useAvailableRecipes,
} from "~/hooks/queries/useRecipeQueries";
import { useRecipeStore } from "~/store/RecipeContext";
import type { Recipe } from "~/types/Recipe";

/**
 * Example component demonstrating the new recipe hooks pattern
 * This replaces the old pattern where everything was done through context
 */
export function RecipeManagementExample() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Use individual React Query hooks for different operations
  const {
    data: allRecipes = [],
    isLoading: recipesLoading,
    error: recipesError,
  } = useRecipes();
  const { data: searchResults = [], isLoading: searchLoading } =
    useSearchRecipes(searchTerm, { tags: ["dinner"], maxPrepTime: 30 });
  const { data: availableRecipes, isLoading: availableLoading } =
    useAvailableRecipes();

  // Mutation hooks for modifying data
  const addRecipeMutation = useAddRecipe();
  const updateRecipeMutation = useUpdateRecipe();
  const deleteRecipeMutation = useDeleteRecipe();

  // UI state from context (only UI-related state)
  const { selectedRecipeTags, updateRecipeTag } = useRecipeStore();

  const filteredRecipes = useMemo(
    () =>
      allRecipes.filter((recipe) =>
        selectedRecipeTags.length > 0
          ? recipe.tags?.some((tag) => selectedRecipeTags.includes(tag))
          : true
      ),
    [allRecipes, selectedRecipeTags]
  );

  // Example: Add a new recipe
  const handleAddRecipe = () => {
    const newRecipe: Omit<Recipe, "id"> = {
      title: "🍝 New Pasta Recipe",
      description: "A delicious pasta dish",
      imageUrl: "",
      prepMinutes: 15,
      cookMinutes: 20,
      difficultyStars: 2,
      servings: 4,
      tags: ["dinner", "pasta"],
      ingredients: [
        {
          name: "Pasta",
          quantity: "400g",
          relatedIngredientId: "pasta-001",
          notes: "Any shape works",
        },
      ],
      instructions: [
        {
          step: 1,
          title: "Boil Water",
          description: "Bring a large pot of salted water to boil",
          relatedIngredientIds: [],
        },
      ],
    };

    addRecipeMutation.mutate(newRecipe, {
      onSuccess: (createdRecipe) => {
        Alert.alert(
          "Success",
          `Recipe "${createdRecipe.title}" added successfully!`
        );
      },
      onError: (error) => {
        Alert.alert("Error", `Failed to add recipe: ${error}`);
      },
    });
  };

  // Example: Update a recipe
  const handleUpdateRecipe = (recipeId: string) => {
    const updates: Partial<Recipe> = {
      title: "🍝 Updated Pasta Recipe",
      prepMinutes: 10, // Reduced prep time
    };

    updateRecipeMutation.mutate(
      { id: recipeId, updates },
      {
        onSuccess: (updatedRecipe) => {
          Alert.alert("Success", `Recipe "${updatedRecipe.title}" updated!`);
        },
        onError: (error) => {
          Alert.alert("Error", `Failed to update recipe: ${error}`);
        },
      }
    );
  };

  // Example: Delete a recipe
  const handleDeleteRecipe = (recipeId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this recipe?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteRecipeMutation.mutate(recipeId, {
              onSuccess: () => {
                Alert.alert("Success", "Recipe deleted successfully!");
                if (selectedRecipeId === recipeId) {
                  setSelectedRecipeId(null);
                }
              },
              onError: (error) => {
                Alert.alert("Error", `Failed to delete recipe: ${error}`);
              },
            });
          },
        },
      ]
    );
  };

  // Loading states
  if (recipesLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading recipes...</Text>
      </View>
    );
  }

  // Error states
  if (recipesError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error loading recipes: {String(recipesError)}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Recipe Management Demo
      </Text>

      {/* Search Section */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
          Search Recipes
        </Text>
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search recipes..."
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 12,
            borderRadius: 8,
            marginBottom: 8,
          }}
        />
        {searchLoading && <Text>Searching...</Text>}
        {searchResults.length > 0 && (
          <Text>Found {searchResults.length} recipes</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        <TouchableOpacity
          onPress={handleAddRecipe}
          disabled={addRecipeMutation.isPending}
          style={{
            backgroundColor: addRecipeMutation.isPending ? "#ccc" : "#007AFF",
            padding: 12,
            borderRadius: 8,
            flex: 1,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            {addRecipeMutation.isPending ? "Adding..." : "Add Recipe"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recipe Statistics */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Statistics:</Text>
        <Text>• Total recipes: {allRecipes.length}</Text>
        <Text>• Filtered recipes: {filteredRecipes.length}</Text>
        <Text>• Selected tags: {selectedRecipeTags.join(", ") || "None"}</Text>
        {availableRecipes && (
          <>
            <Text>• Can make: {availableRecipes.canMake.length} recipes</Text>
            <Text>
              • Partially can make: {availableRecipes.partiallyCanMake.length}{" "}
              recipes
            </Text>
          </>
        )}
      </View>

      {/* Recipe List */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
          All Recipes ({allRecipes.length})
        </Text>
        {allRecipes.slice(0, 5).map((recipe) => (
          <View
            key={recipe.id}
            style={{
              borderWidth: 1,
              borderColor: "#eee",
              padding: 12,
              borderRadius: 8,
              marginBottom: 8,
              backgroundColor:
                selectedRecipeId === recipe.id ? "#f0f0f0" : "white",
            }}
          >
            <TouchableOpacity onPress={() => setSelectedRecipeId(recipe.id)}>
              <Text style={{ fontWeight: "600", fontSize: 16 }}>
                {recipe.title}
              </Text>
              <Text style={{ color: "#666", marginTop: 4 }}>
                Prep: {recipe.prepMinutes}min | Cook: {recipe.cookMinutes}min |
                Difficulty: {recipe.difficultyStars}/5
              </Text>
              {recipe.tags && recipe.tags.length > 0 && (
                <Text style={{ color: "#007AFF", marginTop: 4 }}>
                  Tags: {recipe.tags.join(", ")}
                </Text>
              )}
            </TouchableOpacity>

            {selectedRecipeId === recipe.id && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => handleUpdateRecipe(recipe.id)}
                  disabled={updateRecipeMutation.isPending}
                  style={{
                    backgroundColor: updateRecipeMutation.isPending
                      ? "#ccc"
                      : "#28A745",
                    padding: 8,
                    borderRadius: 6,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontSize: 12,
                    }}
                  >
                    {updateRecipeMutation.isPending ? "Updating..." : "Update"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteRecipe(recipe.id)}
                  disabled={deleteRecipeMutation.isPending}
                  style={{
                    backgroundColor: deleteRecipeMutation.isPending
                      ? "#ccc"
                      : "#DC3545",
                    padding: 8,
                    borderRadius: 6,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontSize: 12,
                    }}
                  >
                    {deleteRecipeMutation.isPending ? "Deleting..." : "Delete"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
