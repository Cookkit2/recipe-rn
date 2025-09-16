import { Button } from "../ui/button";
import { EllipsisIcon, FileClockIcon, BugIcon } from "lucide-nativewind";
import { Link, router, useRouter } from "expo-router";
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemTitle,
  DropdownMenuItemIcon,
} from "~/components/ui/dropdown-menu-native";

export default function MenuDropdown() {
  const router = useRouter();

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
      <Button
        size="icon-sm"
        variant="default"
        className="bg-foreground"
        onPress={() => router.push("/debug")}
      >
        <BugIcon className="text-background" size={18} strokeWidth={3} />
      </Button>
    </>
  );
}

<DropdownMenuRoot>
  <DropdownMenuTrigger>
    <Button size="icon-sm" variant="default" className="bg-foreground">
      <EllipsisIcon className="text-background" size={18} strokeWidth={3} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {/* <DropdownMenuItem key="histories">
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
        </DropdownMenuItem> */}
    <DropdownMenuItem key="profile" onSelect={() => router.push("/profile")}>
      <DropdownMenuItemTitle>Profile</DropdownMenuItemTitle>
      {/* <DropdownMenuItemIcon
            ios={{
              name: "person.circle",
              weight: "semibold",
              scale: "medium",
            }}
          >
            <FileClockIcon className="text-foreground" size={20} />
          </DropdownMenuItemIcon> */}
    </DropdownMenuItem>

    {/* TODO: To be remove later */}
    <DropdownMenuItem
      key="onboarding"
      onSelect={() => router.push("/onboarding")}
    >
      <DropdownMenuItemTitle>Onboarding</DropdownMenuItemTitle>
    </DropdownMenuItem>

    {/* Development/Debug Menu */}
    <DropdownMenuItem key="debug" onSelect={() => router.push("/debug")}>
      <DropdownMenuItemTitle>Debug Database</DropdownMenuItemTitle>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenuRoot>;
