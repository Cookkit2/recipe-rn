import { PantryProvider } from "~/store/PantryContext";
import { RecipeProvider } from "~/store/RecipeContext";
import PantryWrapper from "~/components/Pantry/PantryWrapper";

export default function PantryScreen() {
  return (
    <PantryProvider>
      <RecipeProvider>
        <PantryWrapper />
      </RecipeProvider>
    </PantryProvider>
  );
}
