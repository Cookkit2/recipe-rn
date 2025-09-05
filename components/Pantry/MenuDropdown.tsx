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
import { EllipsisIcon, FileClockIcon, BugIcon } from "lucide-nativewind";
import { CircleUserIcon, LogOutIcon } from "lucide-nativewind";
import { useAuth } from "~/auth";
import { useAuthStore } from "~/auth/AuthStore";
import { router } from "expo-router";

export default function MenuDropdown() {
  const { signOut, isAuthenticated, user } = useAuth();
  const authStore = useAuthStore();

  console.log("MenuDropdown - isAuthenticated:", isAuthenticated);
  console.log("MenuDropdown - user:", user);

  const handleSignOut = async () => {
    console.log("Sign out pressed");
    
    // Immediately force local sign out and navigation
    console.log("Forcing immediate local sign out");
    authStore.forceSignOut();
    
    // Navigate immediately
    console.log("Navigating to sign-in screen immediately");
    router.replace("/(auth)/sign-in");
    
    // Try remote sign out in background (don't await it)
    console.log("Attempting background remote sign out");
    signOut().then((result) => {
      console.log("Background sign out completed:", result);
    }).catch((error) => {
      console.log("Background sign out failed:", error);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="default"
          className="rounded-full"
        >
          <EllipsisIcon
            className="text-background"
            size={20}
            strokeWidth={2.618}
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
        <DropdownMenuItem onPress={() => router.push("/(app)/histories")}>
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

        {/* Development/Debug Menu */}
        <DropdownMenuItem onPress={() => router.push("/misc/debug")}>
          <P>Debug Database</P>
          <DropdownMenuShortcut>
            <BugIcon className="text-foreground" size={20} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>

        {/* TODO: To be removed later */}
        <DropdownMenuItem onPress={() => router.push("/onboarding")}>
          <P>Onboarding</P>
        </DropdownMenuItem>
        
        {isAuthenticated && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onPress={handleSignOut}>
              <P>Sign Out</P>
              <DropdownMenuShortcut>
                <LogOutIcon className="text-foreground" size={20} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
