/** Web/other-platform fallback. Native platforms use the Expo UI implementations. */
import { useCallback, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { GridRow, useListRows } from "./shared";
import { rangeForRows, type ListRow } from "./rows";
import type { RecyclingListProps } from "./types";

export type { RecyclingListProps, VisibleRange } from "./types";

export default function RecyclingList<T>(props: RecyclingListProps<T>) {
  const { rows, columns, latest, reportActive, reportScrolled } = useListRows(props);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (refreshing || !latest.current.onRefresh) return;
    setRefreshing(true);
    try {
      await latest.current.onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, latest]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const viewability = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onVisible = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      const indices = viewableItems.flatMap((item) => (item.index == null ? [] : [item.index]));
      if (indices.length === 0) return;
      const range = rangeForRows(rowsRef.current, Math.min(...indices), Math.max(...indices));
      if (range) {
        latest.current.onVisibleRangeChange?.(range);
        reportActive(range.first);
      }
    },
    [latest, reportActive]
  );
  const renderRow = useCallback(
    ({ item }: { item: ListRow<T> }) => (
      <GridRow
        row={item}
        columns={columns}
        itemSize={props.horizontal ? props.itemSize : undefined}
        renderItem={props.renderItem}
      />
    ),
    [columns, props.horizontal, props.itemSize, props.renderItem]
  );

  return (
    <FlatList
      testID={props.testID}
      className={props.className}
      style={[props.horizontal ? undefined : { flex: 1 }, props.style]}
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderRow}
      horizontal={props.horizontal}
      contentContainerStyle={{
        paddingTop: props.contentPadding?.top,
        paddingBottom: props.contentPadding?.bottom,
        paddingLeft: props.contentPadding?.left,
        paddingRight: props.contentPadding?.right,
      }}
      ListHeaderComponent={props.header ?? undefined}
      ListFooterComponent={props.footer ?? undefined}
      ListEmptyComponent={props.empty ?? undefined}
      ItemSeparatorComponent={
        props.itemSpacing
          ? () => (
              <View
                style={
                  props.horizontal ? { width: props.itemSpacing } : { height: props.itemSpacing }
                }
              />
            )
          : undefined
      }
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      onRefresh={props.onRefresh ? refresh : undefined}
      refreshing={refreshing}
      onViewableItemsChanged={onVisible}
      viewabilityConfig={viewability}
      onScroll={(event) =>
        reportScrolled(
          (props.horizontal
            ? event.nativeEvent.contentOffset.x
            : event.nativeEvent.contentOffset.y) > 10
        )
      }
      scrollEventThrottle={16}
      snapToInterval={
        props.snapToItems && props.itemSize ? props.itemSize + (props.itemSpacing ?? 0) : undefined
      }
      decelerationRate={props.snapToItems ? "fast" : "normal"}
    />
  );
}
