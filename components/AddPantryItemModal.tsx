import { Link } from "expo-router";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "~/lib/icons/HeaderIcons";
import { ChefHatIcon } from "~/lib/icons/RecipesIcon";

export default function AddPantryItemModal() {
  return (
    <>
      <Link href="/recipes" push asChild>
        <Button size="icon-sm" variant="default" className="rounded-full">
          <ChefHatIcon
            className="text-background"
            size={20}
            strokeWidth={2.618}
          />
        </Button>
      </Link>
      <Link href="/create" push asChild>
        <Button size="icon-sm" variant="default" className="rounded-full">
          <PlusIcon className="text-background" size={20} strokeWidth={2.618} />
        </Button>
      </Link>
    </>
  );
}
