import React from "react";
import { View, Keyboard, Pressable, type ViewStyle } from "react-native";
import { Link, type Href } from "expo-router";
import { Small } from "~/components/ui/typography";
import { Separator } from "~/components/ui/separator";

// ─── SearchResultSection ─────────────────────────────────────────────────────
// Wraps a titled group of search results with a separator below the heading.

type SearchResultSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SearchResultSection({ title, children }: SearchResultSectionProps) {
  return (
    <View className="mb-5">
      <Small className="text-lg font-urbanist-black opacity-80 px-5">{title}</Small>
      <Separator className="mt-1 mx-5" />
      {children}
    </View>
  );
}

// ─── SearchResultRow ─────────────────────────────────────────────────────────
// A tappable row with a fixed-size media slot on the left and flexible content
// on the right. Renders a border-bottom on all items except the last.

type SearchResultRowProps = {
  href: Href;
  isLast: boolean;
  /** Left media slot — rendered inside Link.AppleZoom */
  media: React.ReactNode;
  /** Right content slot */
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

export function SearchResultRow({
  href,
  isLast,
  media,
  children,
  contentStyle,
}: SearchResultRowProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        onPress={() => Keyboard.dismiss()}
        className="px-5 flex-row items-center gap-3 active:bg-muted"
        accessibilityRole="button"
      >
        <Link.AppleZoom>
          <View collapsable={false}>{media}</View>
        </Link.AppleZoom>
        <View
          className={`flex-1 h-32 justify-center ${!isLast ? "border-b border-border" : ""}`}
          style={contentStyle}
        >
          {children}
        </View>
      </Pressable>
    </Link>
  );
}
