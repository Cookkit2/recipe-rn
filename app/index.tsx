import React from "react";
import PantryWrapper from "~/components/Pantry/PantryWrapper";
import { PantryProvider } from "~/store/PantryContext";
import { RecipeProvider } from "~/store/RecipeContext";

export default function PantryPage() {
  return (
    <PantryProvider>
      <RecipeProvider>
        <PantryWrapper />
      </RecipeProvider>
    </PantryProvider>
  );
}
