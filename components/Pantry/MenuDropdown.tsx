import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { P } from "../ui/typography";
import { CircleUserIcon, EllipsisIcon, FileClockIcon } from "lucide-nativewind";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function MenuDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handlePress = () => setIsOpen(!isOpen);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="default"
            className="bg-foreground"
            onPress={handlePress}
          >
            <EllipsisIcon
              className="text-background"
              size={18}
              strokeWidth={3}
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          insets={{
            top: 8,
            right: 8,
            bottom: 8,
            left: 8,
          }}
          className="mt-2 w-32 native:w-40"
        >
          <DropdownMenuItem onPress={() => router.push("/onboarding")}>
            <P>Histories</P>
            <DropdownMenuShortcut>
              <FileClockIcon className="text-foreground" size={20} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onPress={() => router.push("/profile")}>
            <P>Profile</P>
            <DropdownMenuShortcut>
              <CircleUserIcon className="text-foreground" size={20} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
