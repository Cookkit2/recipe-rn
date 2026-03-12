import { View } from "react-native";
import { Link } from "expo-router";
import { H1 } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { ShoppingCartIcon, UserIcon, BugIcon, PlusIcon } from "lucide-uniwind";

export default function PantryHeader() {
  return (
    <>
      <H1 className="font-bowlby-one pt-2 pb-2">Pantry</H1>
      <View className="flex-1" />
{/* 
      <Link href="/ingredient/create" asChild>
        <Button size="icon-sm" variant="ghost">
          <PlusIcon className="text-foreground" size={18} strokeWidth={3} />
        </Button>
      </Link>

      <Link href="/profile" asChild>
        <Button size="icon-sm" variant="ghost">
          <UserIcon className="text-foreground" size={18} strokeWidth={3} />
        </Button>
      </Link> */}
    </>
  );
}
