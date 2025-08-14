import React from "react";
import useColors from "~/hooks/useColor";
import { Switch } from "react-native";

function Toggle(props: React.ComponentPropsWithoutRef<typeof Switch>) {
  const colors = useColors();
  return (
    <Switch
      trackColor={{
        true: colors.primary,
        false: colors.muted,
      }}
      thumbColor={colors.background}
      {...props}
    />
  );
}

export { Toggle };
