import { Link } from "expo-router";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-nativewind";

export default function AddPantryItemModal() {
  return (
    <Link href="/create" push asChild>
      <Button size="icon-sm" variant="default" className="bg-foreground rounded-xl">
        <PlusIcon className="text-background" size={18} strokeWidth={3} />
      </Button>
    </Link>
  );
}
