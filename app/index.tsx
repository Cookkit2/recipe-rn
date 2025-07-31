import { useState } from "react";
import { View } from "react-native";
import { Button } from "~/components/ui/button";
import { H1 } from "~/components/ui/typography";
import { PlusIcon } from "lucide-react-native";

export default function Screen() {
  const [items, setItems] = useState([]);

  return (
    <View className="flex-1 p-safe">
      <View className="p-6 flex-row items-center justify-between mb-4">
        <H1>Pantry</H1>
        <Button
          size="icon"
          variant="secondary"
          className="size-8 rounded-full"
          onPress={() => {}}
        >
          <PlusIcon />
        </Button>
      </View>
    </View>
  );
}
