import React from "react";
import { Text } from "react-native";
import { cn } from "~/lib/utils";

interface TextSegment {
  text: string;
  isBold: boolean;
}

const HighlightedText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  const segments = parseText(text);

  return (
    <Text>
      {segments.map((segment, index) => (
        <Text
          key={`${segment.text}-${index}`}
          className={cn(
            className,
            segment.isBold ? "font-urbanist-semibold text-foreground" : ""
          )}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
};

export default HighlightedText;

// Parse text to find **bold** sections
const parseText = (input: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(input)) !== null) {
    // Add text before the bold section
    if (match.index > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, match.index),
        isBold: false,
      });
    }

    // Add the bold section
    segments.push({
      text: match[1] || "",
      isBold: true,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < input.length) {
    segments.push({
      text: input.slice(lastIndex),
      isBold: false,
    });
  }

  return segments;
};
