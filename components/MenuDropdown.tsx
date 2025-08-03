import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { P } from "./ui/typography";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  CircleUserIcon,
  EllipsisIcon,
  FileClockIcon,
} from "~/lib/icons/HeaderIcons";
import { MotiView } from "moti";
import { useState } from "react";

export default function MenuDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const handlePress = () => setIsOpen(!isOpen);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MotiView
            animate={{
              scale: isOpen ? 0.95 : 1,
              rotate: isOpen ? "90deg" : "0deg",
            }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 300,
            }}
          >
            <Button
              size="icon-sm"
              variant="default"
              className="rounded-full"
              onPress={handlePress}
            >
              <EllipsisIcon
                className="text-background"
                size={20}
                strokeWidth={2.618}
              />
            </Button>
          </MotiView>
          {/* <Button
            size="icon-sm"
            variant="default"
            className="rounded-full"
            onPress={() => {}}
          >
            <EllipsisIcon
              className="text-background"
              size={20}
              strokeWidth={2.618}
            />
          </Button> */}
        </DropdownMenuTrigger>
        <MotiView
          from={{
            opacity: 0,
            translateY: -20,
            scale: 0.9,
          }}
          animate={{
            opacity: isOpen ? 1 : 0,
            translateY: isOpen ? 0 : -20,
            scale: isOpen ? 1 : 0.9,
          }}
          transition={{
            type: "spring",
            damping: 18,
            stiffness: 250,
            opacity: {
              type: "timing",
              duration: 200,
            },
          }}
        >
          <DropdownMenuContent
            insets={{
              top: 8,
              right: 8,
              bottom: 8,
              left: 8,
            }}
            className="mt-2 w-32 native:w-40"
          >
            <MotiView
              from={{
                opacity: 0,
                translateX: -15,
                translateY: -10,
              }}
              animate={{
                opacity: isOpen ? 1 : 0,
                translateX: isOpen ? 0 : -15,
                translateY: isOpen ? 0 : -10,
              }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 200,
                delay: isOpen ? 100 : 0,
              }}
            >
              <DropdownMenuItem>
                <P>Histories</P>
                <DropdownMenuShortcut>
                  <FileClockIcon className="text-foreground" size={20} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </MotiView>

            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <P>Profile</P>
              <DropdownMenuShortcut>
                <CircleUserIcon className="text-foreground" size={20} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </MotiView>
      </DropdownMenu>
    </>
  );
}
