import { Pressable, View } from "react-native";
import { PlusIcon, SearchIcon, UserIcon } from "lucide-uniwind";
import type { PantryHeaderActionsProps } from "./PantryHeaderActions.types";

export default function PantryHeaderActions(props: PantryHeaderActionsProps) {
  const actions = [
    { label: "Search", Icon: SearchIcon, onPress: props.onSearch },
    { label: "Add ingredient", Icon: PlusIcon, onPress: props.onAdd },
    { label: "Profile", Icon: UserIcon, onPress: props.onProfile },
  ];
  return (
    <View className="flex-row gap-2">
      {actions.map(({ label, Icon, onPress }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={props.disabled}
          onPress={onPress}
          className="h-11 w-11 rounded-full bg-muted items-center justify-center"
        >
          <Icon className="text-foreground" size={22} />
        </Pressable>
      ))}
    </View>
  );
}
