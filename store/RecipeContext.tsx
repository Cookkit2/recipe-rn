import React, { createContext, useCallback, useContext, useState } from "react";

interface RecipeContextType {
  // UI State only
  selectedRecipeTags: string[];
  updateRecipeTag: (tag: string | string[]) => void;
  showRecommendations: boolean;
  setShowRecommendations: (show: boolean) => void;
}

const RecipeContext = createContext<RecipeContextType | null>(null);

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  // UI State - only what the context should manage
  const [selectedRecipeTags, setSelectedRecipeTags] = useState<string[]>([]);
  const [showRecommendations, setShowRecommendations] =
    useState<boolean>(false);

  // UI callbacks
  const updateRecipeTag = useCallback((tag: string | string[]) => {
    if (Array.isArray(tag)) {
      setSelectedRecipeTags((prev) => {
        const newTags = new Set(prev);
        tag.forEach((t) => {
          if (newTags.has(t)) {
            newTags.delete(t);
          } else {
            newTags.add(t);
          }
        });
        return Array.from(newTags);
      });
    } else {
      setSelectedRecipeTags((prev) => {
        const newTags = new Set(prev);
        if (newTags.has(tag)) {
          newTags.delete(tag);
        } else {
          newTags.add(tag);
        }
        return Array.from(newTags);
      });
    }
  }, []);

  return (
    <RecipeContext.Provider
      value={{
        selectedRecipeTags,
        updateRecipeTag,
        showRecommendations,
        setShowRecommendations,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export const useRecipeStore = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipeStore must be used within a RecipeProvider");
  }
  return context;
};
