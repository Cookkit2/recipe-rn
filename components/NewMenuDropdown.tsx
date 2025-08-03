import { useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "~/components/ui/menubar";
import { Text } from "~/components/ui/text";
import { Button } from "./ui/button";
import {
  CircleUserIcon,
  EllipsisIcon,
  FileClockIcon,
} from "~/lib/icons/HeaderIcons";

export default function MenuNew() {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  const [open, setOpen] = React.useState<boolean>(false);
  const navigation = useNavigation();

  //   useEffect(() => {
  //     const sub = navigation.addListener("blur", () => {
  //       onValueChange(undefined);
  //     });

  //     return sub;
  //   }, []);

  function onValueChange() {
    setOpen((open) => !open);
  }

  return (
    <View className="flex-1 items-center p-4">
      {/* {!!value && (
        <Pressable
          onPress={() => {
            onValueChange(undefined);
          }}
          style={StyleSheet.absoluteFill}
        />
      )} */}
      <Menubar value={open ? "edit" : undefined} onValueChange={onValueChange}>
        <MenubarMenu value="edit">
          <MenubarTrigger className="border-0 rounded-full p-0">
            <Button size="icon-sm" variant="default" className="rounded-full">
              <EllipsisIcon
                className="text-background"
                size={20}
                strokeWidth={2.618}
              />
            </Button>
          </MenubarTrigger>
          <MenubarContent insets={contentInsets} className="native:w-48">
            <MenubarItem>
              <Text>Histories</Text>
              <MenubarShortcut>
                <FileClockIcon className="text-foreground" size={20} />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Text>Profile</Text>
              <MenubarShortcut>
                <CircleUserIcon className="text-foreground" size={20} />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </View>
  );
}
