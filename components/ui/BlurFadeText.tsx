import React from "react";
import { View, StyleSheet, type TextProps } from "react-native";
import { AnimatePresence, MotiText } from "moti";
import { Easing } from "react-native-reanimated";
import { cn } from "~/lib/utils";

export const EASE_IN_OUT_SMOOTH = Easing.bezier(0.4, 0.0, 0.2, 1);
export const EASE_OUT = Easing.out(Easing.cubic);

type BlurFadeTextProps = Omit<TextProps, "children"> & {
  children: string;
  className?: string;
  enterDurationMs?: number;
  exitDurationMs?: number;
  contentKey?: string | number;
  maxLines?: number; // reserve fixed height to avoid layout shift
  lineHeight?: number;
};

export default function BlurFadeText({
  children,
  className,
  enterDurationMs = 100,
  exitDurationMs = 100,
  contentKey,
  maxLines = 2,
  lineHeight = 28,
  ...props
}: BlurFadeTextProps) {
  const reservedHeight = maxLines * lineHeight;
  return (
    <View style={[styles.container, { height: reservedHeight }]}>
      <AnimatePresence initial={false} exitBeforeEnter>
        <MotiText
          {...props}
          key={contentKey ?? children}
          numberOfLines={maxLines}
          className={cn(className)}
          style={[props.style, styles.absolute, { lineHeight }]}
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: -6 }}
          transition={{
            type: "timing",
            duration: enterDurationMs,
            easing: EASE_IN_OUT_SMOOTH,
          }}
          exitTransition={{
            type: "timing",
            duration: exitDurationMs,
            easing: EASE_OUT,
          }}
        >
          {children}
        </MotiText>
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  absolute: {
    position: "absolute",
    textAlign: "center",
    width: "100%",
  },
});
