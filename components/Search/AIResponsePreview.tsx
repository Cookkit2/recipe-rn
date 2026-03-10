import React from "react";
import { View, Pressable } from "react-native";
import { SparklesIcon } from "lucide-uniwind";
import { Text } from "react-native";
import type { Message } from "~/lib/function-gemma/useFunctionGemma";
import { SearchResultSection } from "./SearchResultPrimitives";

type AIResponsePreviewProps = {
  message: Message;
  onPress?: () => void;
};

export function AIResponsePreview({ message, onPress }: AIResponsePreviewProps) {
  return (
    <SearchResultSection title="AI Response">
      <Pressable onPress={onPress} className="px-5 flex-row items-center gap-3 active:bg-muted">
        <Text className="text-sm text-foreground font-urbanist-medium leading-relaxed mt-2">
          {message.content.slice(0, 150)}
          {message.content.length > 150 ? "..." : ""}
        </Text>
      </Pressable>
    </SearchResultSection>
  );
}
