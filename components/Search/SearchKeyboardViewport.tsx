import type { ReactNode } from "react";
import { Platform } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";

/** Both modes can mount after the keyboard is open; use the root's live height. */
export function SearchKeyboardViewport({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  const { height } = useReanimatedKeyboardAnimation();
  const avoidKeyboard = Platform.OS === "ios";
  const style = useAnimatedStyle(() => ({
    paddingBottom: avoidKeyboard ? Math.max(0, -height.value) : 0,
  }));
  return (
    <Animated.View testID={testID} style={[{ flex: 1 }, style]}>
      {children}
    </Animated.View>
  );
}
