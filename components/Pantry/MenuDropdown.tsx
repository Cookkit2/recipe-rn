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
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { CircleUserIcon, EllipsisIcon, FileClockIcon } from "lucide-nativewind";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

export default function MenuDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const degree = useSharedValue(0);

  const handlePress = () => setIsOpen(!isOpen);

  useEffect(() => {
    degree.value = withTiming(isOpen ? 90 : 0, { duration: 200 });
  }, [degree, isOpen]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="default"
            className="rounded-full"
            onPress={handlePress}
          >
            <Animated.View
              style={{
                transform: [{ rotate: `${degree.value}deg` }],
              }}
            >
              <EllipsisIcon
                className="text-background"
                size={20}
                strokeWidth={2.618}
              />
            </Animated.View>
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
