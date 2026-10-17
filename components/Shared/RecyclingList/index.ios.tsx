import { useCallback } from "react";
import { View } from "react-native";
import {
  Host,
  LazyHStack,
  LazyVStack,
  RNHostView,
  ScrollView,
  VStack,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  frame,
  id,
  onAppear,
  onDisappear,
  padding,
  refreshable,
  scrollPosition,
  scrollTargetBehavior,
  scrollTargetLayout,
  useScrollGeometryChange,
} from "@expo/ui/swift-ui/modifiers";
import { GridRow, useListRows, useListViewport } from "./shared";
import type { ListRow } from "./rows";
import type { RecyclingListProps } from "./types";

export type { RecyclingListProps, VisibleRange } from "./types";

export default function RecyclingList<T>(props: RecyclingListProps<T>) {
  const { rows, columns, reportVisible, reportActive, reportScrolled } = useListRows(props);
  const horizontal = !!props.horizontal;
  const activeID = useNativeState<string | null>(null);
  const viewport = useListViewport(props.contentPadding);
  const rowWidth = horizontal ? props.itemSize : viewport.rowWidth;
  if (horizontal && !(props.itemSize && props.itemSize > 0))
    throw new Error("Horizontal RecyclingList requires itemSize.");
  const geometry = useScrollGeometryChange((event) => {
    const offset = Math.max(0, horizontal ? event.contentOffsetX : event.contentOffsetY);
    reportScrolled(offset > 10);
  });
  const renderRow = useCallback(
    ({ item }: { item: ListRow<T> }) => (
      <VStack
        key={item.key}
        spacing={0}
        modifiers={[
          ...(horizontal ? [frame({ width: props.itemSize })] : [frame({ maxWidth: Infinity })]),
          id(item.key),
          onAppear(() => reportVisible(item.key, true)),
          onDisappear(() => reportVisible(item.key, false)),
        ]}
      >
        <RNHostView matchContents={horizontal ? { horizontal: true } : { vertical: true }}>
          <GridRow row={item} columns={columns} itemSize={rowWidth} renderItem={props.renderItem} />
        </RNHostView>
      </VStack>
    ),
    [horizontal, columns, props.itemSize, rowWidth, props.renderItem, reportVisible]
  );
  const insets = props.contentPadding;
  const stackModifiers = [
    padding({
      top: insets?.top ?? 0,
      bottom: insets?.bottom ?? 0,
      leading: insets?.left ?? 0,
      trailing: insets?.right ?? 0,
    }),
    ...(horizontal ? [scrollTargetLayout()] : []),
  ];
  const header = props.header ? (
    <RNHostView matchContents={{ vertical: true }}>{props.header}</RNHostView>
  ) : null;
  const footer = props.footer ? (
    <RNHostView matchContents={{ vertical: true }}>{props.footer}</RNHostView>
  ) : null;
  const empty = props.empty ? (
    <RNHostView matchContents={{ vertical: true }}>{props.empty}</RNHostView>
  ) : null;
  return (
    <View
      testID={props.testID}
      onLayout={viewport.onLayout}
      className={props.className}
      style={[horizontal ? undefined : { flex: 1 }, props.style]}
    >
      <Host style={{ flex: 1 }} ignoreSafeArea="container">
        <ScrollView
          axes={horizontal ? "horizontal" : "vertical"}
          showsIndicators={false}
          modifiers={[
            ...(geometry ? [geometry] : []),
            ...(horizontal
              ? [
                  scrollPosition(activeID, {
                    anchor: "leading",
                    onChange: (key) => {
                      const index = rows.findIndex((row) => row.key === key);
                      if (index >= 0) reportActive(index);
                    },
                  }),
                ]
              : []),
            ...(props.snapToItems ? [scrollTargetBehavior("viewAligned")] : []),
            ...(props.onRefresh ? [refreshable(props.onRefresh)] : []),
          ]}
        >
          {horizontal ? (
            <LazyHStack spacing={props.itemSpacing ?? 0} modifiers={stackModifiers}>
              <LazyHStack.ForEach
                data={rows}
                keyExtractor={(row) => row.key}
                estimatedItemSize={props.itemSize!}
                overscanCount={props.overscanCount ?? 4}
              >
                {renderRow}
              </LazyHStack.ForEach>
            </LazyHStack>
          ) : (
            <LazyVStack
              spacing={props.itemSpacing ?? 0}
              alignment="leading"
              modifiers={stackModifiers}
            >
              {header}
              {rows.length ? (
                <LazyVStack.ForEach
                  data={rows}
                  keyExtractor={(row) => row.key}
                  estimatedItemSize={props.estimatedItemSize ?? 250}
                  overscanCount={props.overscanCount ?? 4}
                >
                  {renderRow}
                </LazyVStack.ForEach>
              ) : (
                empty
              )}
              {footer}
            </LazyVStack>
          )}
        </ScrollView>
      </Host>
    </View>
  );
}
