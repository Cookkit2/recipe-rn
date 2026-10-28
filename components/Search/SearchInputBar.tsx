import { useImperativeHandle, useRef, type Ref } from "react";
import { Platform, Pressable, StyleSheet, TextInput, type TextInputInstance } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { SearchIcon, SparklesIcon, XIcon } from "lucide-react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import type { SearchBarCommands } from "react-native-screens";
import { useUniwind } from "uniwind";
import useColors from "~/hooks/useColor";

/** One persistent input with independent glass mode and close controls. */
export function SearchInputBar({
  ref,
  value,
  conversation,
  placeholder,
  bottom,
  onChangeText,
  onSwitchMode,
  onDismiss,
  onSubmit,
  onFocus,
  onBlur,
}: {
  ref: Ref<SearchBarCommands>;
  value: string;
  conversation: boolean;
  placeholder: string;
  bottom: number;
  onChangeText: (text: string) => void;
  onSwitchMode: () => void;
  onDismiss: () => void;
  onSubmit: () => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const input = useRef<TextInputInstance>(null);
  const colors = useColors();
  const { theme } = useUniwind();
  const { height, progress } = useReanimatedKeyboardAnimation();
  const ios = Platform.OS === "ios";
  const glass = isLiquidGlassAvailable();
  const position = useAnimatedStyle(() => ({
    // Android already resizes the app window above the keyboard.
    transform: [{ translateY: ios ? height.value : 0 }],
    paddingBottom: 8 + bottom * (1 - progress.value),
  }));
  useImperativeHandle(
    ref,
    () => ({
      focus: () => input.current?.focus(),
      blur: () => input.current?.blur(),
      clearText: () => onChangeText(""),
      setText: onChangeText,
      cancelSearch: onDismiss,
      toggleCancelButton: () => {}, // The explicit close circle is always available.
    }),
    [onChangeText, onDismiss]
  );
  const appearance = {
    colorScheme: theme === "dark" ? ("dark" as const) : ("light" as const),
    glassEffectStyle: "regular" as const,
  };
  const fallbackStyle = glass ? undefined : { backgroundColor: colors.muted };
  const ModeIcon = conversation ? SearchIcon : SparklesIcon;
  return (
    <Animated.View testID="search-input-bar" style={[styles.row, position]}>
      <GlassView {...appearance} isInteractive style={[styles.circle, fallbackStyle]}>
        <Pressable
          testID="search-mode-button"
          accessibilityRole="button"
          accessibilityLabel={conversation ? "Switch to search" : "Switch to Cookkit AI"}
          onPress={onSwitchMode}
          style={styles.button}
        >
          <SymbolView
            testID="search-mode-symbol"
            name={conversation ? "magnifyingglass" : "sparkles"}
            size={22}
            tintColor={colors.foreground}
            fallback={<ModeIcon size={22} color={colors.foreground} />}
          />
        </Pressable>
      </GlassView>
      <GlassView {...appearance} testID="search-input-pill" style={[styles.pill, fallbackStyle]}>
        <TextInput
          ref={input}
          testID="native-search-input"
          accessibilityLabel={conversation ? "Message Cookkit" : "Search ingredients and recipes"}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.foreground }]}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="search"
          submitBehavior="submit"
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </GlassView>
      <GlassView {...appearance} isInteractive style={[styles.circle, fallbackStyle]}>
        <Pressable
          testID="search-close-button"
          accessibilityRole="button"
          accessibilityLabel="Close search"
          onPress={onDismiss}
          style={styles.button}
        >
          <SymbolView
            name="xmark"
            size={22}
            tintColor={colors.foreground}
            fallback={<XIcon size={22} color={colors.foreground} />}
          />
        </Pressable>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  circle: { width: 48, height: 48, borderRadius: 24 },
  button: { flex: 1, alignItems: "center", justifyContent: "center" },
  pill: { flex: 1, height: 48, borderRadius: 24, paddingRight: 8 },
  input: { flex: 1, paddingHorizontal: 16, fontSize: 17 },
});
