import { Stack } from "expo-router";
import { H1 } from "~/components/ui/typography";

export function getPantryScreens() {
  return [
    <Stack.Screen
      key="index"
      name="index"
      options={{
        headerShown: true,
        headerTitle: "",
        headerTransparent: true,
        unstable_headerLeftItems() {
          return [
            {
              type: "custom",
              hidesSharedBackground: true,
              element: <H1 className="font-bowlby-one pt-5 pb-2 pl-2">Pantry</H1>,
            },
          ];
        },
      }}
    />,
  ];
}
