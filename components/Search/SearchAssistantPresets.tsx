import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { AssistantStarters } from "~/components/Assistant/AssistantStarters";

/** Fixed below the transcript, with space for the shared input and its safe inset. */
export function SearchAssistantPresets({
  bottom,
  visible,
  disabled,
  onAsk,
}: {
  bottom: number;
  visible: boolean;
  disabled: boolean;
  onAsk: (question: string) => void;
}) {
  const { progress } = useReanimatedKeyboardAnimation();
  const spacing = useAnimatedStyle(() => ({ paddingBottom: 64 + bottom * (1 - progress.value) }));
  return (
    <Animated.View testID="search-assistant-dock" className="px-5" style={spacing}>
      {visible ? (
        <View testID="search-assistant-presets">
          <AssistantStarters compact title={null} onAsk={onAsk} disabled={disabled} />
        </View>
      ) : null}
    </Animated.View>
  );
}
