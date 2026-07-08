import { Stack } from "expo-router";
import { H1 } from "~/components/ui/typography";

export function ScreenGroupPantry() {
  return (
    <>
      <Stack.Screen
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
                element: <H1 className="font-bowlby-one pt-5 pb-2">Pantry</H1>,
              },
            ];
          },
        }}
      />
    </>
  );
}
