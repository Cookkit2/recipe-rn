/**
 * Voice Help Sheet Component
 *
 * Displays all available voice commands for cooking mode.
 * Shows organized categories with example phrases.
 */

import React from "react";
import { View, ScrollView } from "react-native";
import { H3, H4, Muted, P } from "~/components/ui/typography";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface VoiceCommandCategory {
  title: string;
  description: string;
  commands: Array<{
    phrase: string;
    description: string;
    examples: string[];
  }>;
}

const voiceCommandCategories: VoiceCommandCategory[] = [
  {
    title: "Navigation",
    description: "Move between steps",
    commands: [
      {
        phrase: "Next / Continue",
        description: "Go to the next step",
        examples: ["next", "next step", "continue", "go forward", "forward"],
      },
      {
        phrase: "Previous / Back",
        description: "Go to the previous step",
        examples: ["back", "go back", "previous", "go to previous"],
      },
      {
        phrase: "Done / Finish",
        description: "Complete the recipe",
        examples: ["done", "finish", "complete", "finished"],
      },
    ],
  },
  {
    title: "Step Information",
    description: "Get information about the current step",
    commands: [
      {
        phrase: "Repeat / Read",
        description: "Hear the current step again",
        examples: ["repeat", "read step", "say again", "tell me again"],
      },
      {
        phrase: "Clarify",
        description: "Get more details about the current step",
        examples: ["clarify", "explain more", "tell me more", "explain again"],
      },
    ],
  },
  {
    title: "Ingredients",
    description: "Ask about ingredient amounts",
    commands: [
      {
        phrase: "How much [ingredient]",
        description: "Ask how much of an ingredient you need",
        examples: ["how much flour", "how many eggs", "quantity of sugar"],
      },
      {
        phrase: "List ingredients",
        description: "Hear all ingredients needed",
        examples: ["ingredients", "what do I need", "list ingredients"],
      },
    ],
  },
  {
    title: "Cooking Info",
    description: "Get temperature and timer information",
    commands: [
      {
        phrase: "Temperature",
        description: "Ask about cooking temperature",
        examples: ["temperature", "what's the temp", "how hot", "oven temp"],
      },
      {
        phrase: "Timer",
        description: "Ask about cooking time",
        examples: ["timer", "how long", "set timer", "cooking time"],
      },
    ],
  },
  {
    title: "Voice Control",
    description: "Control voice assistance",
    commands: [
      {
        phrase: "Stop / Quiet",
        description: "Stop voice assistance",
        examples: ["stop", "quiet", "silence", "be quiet"],
      },
      {
        phrase: "Pause",
        description: "Pause temporarily",
        examples: ["pause", "wait", "hold on"],
      },
    ],
  },
];

interface VoiceHelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceHelpSheet({ open, onOpenChange }: VoiceHelpSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85%]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Voice Commands</DialogTitle>
          <DialogDescription>
            Say these phrases to control the app hands-free while cooking
          </DialogDescription>
        </DialogHeader>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={true}
          contentContainerClassName="pb-4"
        >
          {voiceCommandCategories.map((category, categoryIndex) => (
            <View key={categoryIndex} className="mb-6">
              <H3 className="text-lg font-semibold text-foreground mb-1">{category.title}</H3>
              <Muted className="text-sm mb-3">{category.description}</Muted>

              <View className="gap-3 pl-2">
                {category.commands.map((command, commandIndex) => (
                  <View key={commandIndex} className="gap-1">
                    <H4 className="text-base font-semibold text-foreground">"{command.phrase}"</H4>
                    <P className="text-sm text-foreground/80 mb-1">{command.description}</P>
                    <View className="flex-row flex-wrap gap-1">
                      {command.examples.map((example, exampleIndex) => (
                        <View key={exampleIndex} className="bg-muted/50 rounded-md px-2 py-1">
                          <Muted className="text-xs italic">"{example}"</Muted>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="border-t border-border/50 pt-4 mt-2">
          <Muted className="text-xs text-center">
            Tip: Speak clearly and minimize background noise for best results
          </Muted>
        </View>
      </DialogContent>
    </Dialog>
  );
}
