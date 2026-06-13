import React from "react";
import { Text } from "react-native";
import { cn } from "~/lib/utils";

interface TextSegment {
  text: string;
  isBold: boolean;
}

const HighlightedText = ({ text, className }: { text: string; className?: string }) => {
  const segments = parseText(text);

  return (
    <Text>
      {segments.map((segment, index) => (
        <Text
          key={`${segment.text}-${index}`}
          className={cn(className, segment.isBold ? "font-urbanist-semibold text-foreground" : "")}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
};

export default HighlightedText;

// Parse text to find **bold** sections safely without Regex (prevent ReDoS)
const parseText = (input: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  while (true) {
    const startIndex = input.indexOf("**", lastIndex);
    if (startIndex === -1) {
      break;
    }

    const endIndex = input.indexOf("**", startIndex + 2);
    if (endIndex === -1) {
      break;
    }

    // Add text before the bold section
    if (startIndex > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, startIndex),
        isBold: false,
      });
    }

    // Add the bold section
    segments.push({
      text: input.slice(startIndex + 2, endIndex),
      isBold: true,
    });

    lastIndex = endIndex + 2;
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
