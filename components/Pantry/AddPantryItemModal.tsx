import { Link } from "expo-router";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-nativewind";

export default function AddPantryItemModal() {
  return (
    <Link href="/create" push asChild>
      <Button size="icon-sm" variant="default" className="rounded-full">
        <PlusIcon className="text-background" size={20} strokeWidth={2.618} />
      </Button>
    </Link>
  );
}
