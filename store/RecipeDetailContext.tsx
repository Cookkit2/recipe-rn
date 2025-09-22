import React, { createContext, useCallback, useContext, useState } from "react";

interface RecipeDetailContextType {
  // UI State only
  servings: number;
  updateServings: (servings: number) => void;
}

const RecipeDetailContext = createContext<RecipeDetailContextType | null>(null);

export function RecipeDetailProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [servings, setServings] = useState<number>(1);

  // UI callbacks
  const updateServings = useCallback((newServings: number) => {
    setServings(newServings);
  }, []);

  return (
    <RecipeDetailContext.Provider
      value={{
        servings,
        updateServings,
      }}
    >
      {children}
    </RecipeDetailContext.Provider>
  );
}

export const useRecipeDetailStore = () => {
  const context = useContext(RecipeDetailContext);
  if (!context) {
    throw new Error(
      "useRecipeDetailStore must be used within a RecipeDetailProvider"
    );
  }
  return context;
};
