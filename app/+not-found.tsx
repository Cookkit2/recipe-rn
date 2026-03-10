import { Link, Stack } from "expo-router";
import { View } from "react-native";
import { Text } from "~/components/ui/text";
import { useUniwind } from "uniwind";

export default function NotFoundScreen() {
  const { theme } = useUniwind();
  const headerColor = theme === "dark" ? "#fff" : "#000";

  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerTintColor: headerColor }} />
      <View>
        <Text>This screen doesn't exist.</Text>

        <Link href="/">
          <Text>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
