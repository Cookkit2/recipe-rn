import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { AnimatePresence, MotiText } from "moti";
import { cn } from "~/lib/utils";

type CrossfadeTextProps = Omit<TextProps, "children"> & {
  children: string;
  className?: string;
};

export default function CrossfadeText({ children, className, ...props }: CrossfadeTextProps) {
  return (
    <RNText {...props} className={cn(className)}>
      <AnimatePresence initial={false}>
        <MotiText
          key={children}
          from={{ opacity: 0, translateY: 6, textShadowRadius: 8 }}
          animate={{ opacity: 1, translateY: 0, textShadowRadius: 0 }}
          exit={{ opacity: 0, translateY: -6, textShadowRadius: 8 }}
          transition={{ type: "timing", duration: 260 }}
          // Approximate blur with text shadow
          style={{ textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 0 } }}
        >
          {children}
        </MotiText>
      </AnimatePresence>
    </RNText>
  );
}


