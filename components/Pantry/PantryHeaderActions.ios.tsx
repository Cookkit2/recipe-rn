import { Button, GlassEffectContainer, Host, HStack, Label } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  glassEffect,
  labelStyle,
} from "@expo/ui/swift-ui/modifiers";
import { useUniwind } from "uniwind";
import useColors from "~/hooks/useColor";
import type { PantryHeaderActionsProps } from "./PantryHeaderActions.types";

/** Keep the glass inside the animated header view so the entire button can fade. */
export default function PantryHeaderActions(props: PantryHeaderActionsProps) {
  const colors = useColors();
  const { theme } = useUniwind();
  const actions = [
    { label: "Search", symbol: "magnifyingglass", onPress: props.onSearch },
    { label: "Ask Cookkit", symbol: "sparkles", onPress: props.onAskCookkit },
    { label: "Add ingredient", symbol: "plus", onPress: props.onAdd },
    { label: "Profile", symbol: "person", onPress: props.onProfile },
  ] as const;
  return (
    <Host
      style={{ width: actions.length * 44 + (actions.length - 1) * 8, height: 44 }}
      pointerEvents={props.disabled ? "none" : "auto"}
      colorScheme={theme === "dark" ? "dark" : "light"}
    >
      <GlassEffectContainer spacing={8}>
        <HStack spacing={8}>
          {actions.map((action) => (
            <Button
              key={action.label}
              onPress={action.onPress}
              modifiers={[buttonStyle("plain"), accessibilityLabel(action.label)]}
            >
              <Label
                title={action.label}
                systemImage={action.symbol}
                modifiers={[
                  labelStyle("iconOnly"),
                  font({ size: 22, weight: "regular" }),
                  foregroundStyle(colors.foreground),
                  frame({ width: 44, height: 44 }),
                  glassEffect({
                    glass: { variant: "regular", interactive: true },
                    shape: "circle",
                  }),
                ]}
              />
            </Button>
          ))}
        </HStack>
      </GlassEffectContainer>
    </Host>
  );
}
