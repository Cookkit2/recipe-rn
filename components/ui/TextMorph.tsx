import React, { useId, useMemo } from "react";
import { Text as RNText, type TextProps } from "react-native";
import { AnimatePresence, MotiText } from "moti";
import { cn } from "~/lib/tw-merge";

export type TextMorphProps = Omit<TextProps, "children"> & {
  children: string;
  className?: string;
};

export function TextMorph({ children, className, ...props }: TextMorphProps) {
  const uniqueId = useId();

  const characters = useMemo(() => {
    const charCounts: Record<string, number> = {};
    return children.split("").map((char) => {
      const lowerChar = char.toLowerCase();
      charCounts[lowerChar] = (charCounts[lowerChar] || 0) + 1;
      return {
        id: `${uniqueId}-${lowerChar}${charCounts[lowerChar]}`,
        label: char === " " ? "\u00A0" : char,
      };
    });
  }, [children, uniqueId]);

  return (
    <RNText {...props} className={cn(className)}>
      <AnimatePresence initial={false} exitBeforeEnter={true}>
        {characters.map((character) => (
          <MotiText
            key={character.id}
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -6 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 18,
              mass: 0.3,
            }}
          >
            {character.label}
          </MotiText>
        ))}
      </AnimatePresence>
    </RNText>
  );
}

export default TextMorph;

