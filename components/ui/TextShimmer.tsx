import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "~/lib/utils";

type TextShimmerProps = Omit<ViewProps, "children"> & {
  children: ReactNode;
  className?: string;
  /** Kept for API compatibility (no-op). */
  durationSec?: number;
  spread?: number;
  colors?: { base: string; highlight: string };
};

/**
 * Renders children inside a plain View.
 *
 * Previously this applied a shimmering gradient using @expo/ui's `MaskedView`,
 * but that MaskedView did not reliably render its masked content — the text and
 * icons it wrapped vanished on device — so the component now renders children
 * directly. The shimmer-related props are kept for API compatibility but are
 * ignored. If a shimmer effect is needed again, reimplement it without
 * MaskedView (e.g. an animated text color or a non-masked gradient overlay).
 */
export default function TextShimmer({ children, className, ...props }: TextShimmerProps) {
  return (
    <View className={cn(className)} {...props}>
      {children}
    </View>
  );
}
