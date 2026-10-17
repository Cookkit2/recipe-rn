import type { ReactElement } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface VisibleRange {
  first: number;
  last: number;
}

export interface RecyclingListProps<T> {
  data: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (info: { item: T; index: number }) => ReactElement;
  numColumns?: number;
  estimatedItemSize?: number;
  overscanCount?: number;
  horizontal?: boolean;
  /** Required for horizontal lists; excludes the space between cards. */
  itemSize?: number;
  itemSpacing?: number;
  snapToItems?: boolean;
  contentPadding?: { top?: number; bottom?: number; left?: number; right?: number };
  header?: ReactElement | null;
  footer?: ReactElement | null;
  empty?: ReactElement | null;
  onRefresh?: () => Promise<void>;
  /** Whether the list has moved more than 10 points from its start. */
  onScrolledChange?: (scrolled: boolean) => void;
  onVisibleRangeChange?: (range: VisibleRange) => void;
  onActiveItemChange?: (index: number) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
