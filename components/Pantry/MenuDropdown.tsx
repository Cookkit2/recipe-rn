import { Button } from "~/components/ui/button";
import { EllipsisIcon, BugIcon } from "lucide-nativewind";
import { router } from "expo-router";

export default function MenuDropdown() {
  return (
    <>
      <Button
        size="icon-sm"
        variant="default"
        className="bg-foreground"
        onPress={() => router.push("/profile")}
      >
        <EllipsisIcon className="text-background" size={18} strokeWidth={3} />
      </Button>
      {/* <Button
        size="icon-sm"
        variant="default"
        className="bg-foreground"
        onPress={() => router.push("/debug")}
      >
        <BugIcon className="text-background" size={18} strokeWidth={3} />
      </Button> */}
    </>
  );
}
