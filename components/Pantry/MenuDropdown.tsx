import { Button } from "../ui/button";
import { EllipsisIcon, FileClockIcon } from "lucide-nativewind";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemTitle,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu-native";

export default function MenuDropdown() {
  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger>
        <Button size="icon-sm" variant="default" className="bg-foreground">
          <EllipsisIcon className="text-background" size={18} strokeWidth={3} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem key="histories">
          <DropdownMenuItemTitle>Histories</DropdownMenuItemTitle>
          <DropdownMenuItemIcon
            ios={{
              name: "clock",
              weight: "semibold",
              scale: "medium",
            }}
          >
            <FileClockIcon className="text-foreground" size={20} />
          </DropdownMenuItemIcon>
        </DropdownMenuItem>
        <DropdownMenuItem key="profile">
          <DropdownMenuItemTitle>Profile</DropdownMenuItemTitle>
          <DropdownMenuItemIcon
            ios={{
              name: "person.circle",
              weight: "semibold",
              scale: "medium",
            }}
          >
            <FileClockIcon className="text-foreground" size={20} />
          </DropdownMenuItemIcon>
        </DropdownMenuItem>

        {/* TODO: To be remove later */}
        <DropdownMenuItem key="onboarding">
          <DropdownMenuItemTitle>Onboarding</DropdownMenuItemTitle>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}
