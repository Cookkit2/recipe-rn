import { useRouter } from "expo-router";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-nativewind";

export default function AddPantryItem() {
  const router = useRouter();

  const navigateToCreateIngredient = () => {
    router.push("/ingredient/create");
  };

  return (
    <Button
      size="icon-sm"
      variant="default"
      className="bg-foreground rounded-xl"
      onPress={navigateToCreateIngredient}
    >
      <PlusIcon className="text-background" size={18} strokeWidth={3} />
    </Button>
  );
}
