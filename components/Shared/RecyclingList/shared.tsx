import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { createListRows, rangeForRows, type ListRow } from "./rows";
import type { RecyclingListProps } from "./types";

export function useListRows<T>(props: RecyclingListProps<T>) {
  const columns = props.horizontal ? 1 : (props.numColumns ?? 1);
  const keyRef = useRef(props.keyExtractor);
  keyRef.current = props.keyExtractor;
  const rows = useMemo(
    () => createListRows(props.data, columns, (item, index) => keyRef.current(item, index)),
    [props.data, columns]
  );
  const latest = useRef(props);
  latest.current = props;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const indices = useMemo(() => new Map(rows.map((row, index) => [row.key, index])), [rows]);
  const indicesRef = useRef(indices);
  indicesRef.current = indices;
  const visible = useRef(new Set<string>());
  const reported = useRef("");
  const activeIndex = useRef(-1);
  const scrolled = useRef(false);
  const reportScrolled = useCallback((value: boolean) => {
    if (scrolled.current === value) return;
    scrolled.current = value;
    latest.current.onScrolledChange?.(value);
  }, []);

  const reportActive = useCallback((index: number) => {
    if (index < 0 || index >= latest.current.data.length || activeIndex.current === index) return;
    activeIndex.current = index;
    latest.current.onActiveItemChange?.(index);
  }, []);

  const reportVisible = useCallback(
    (key: string, isVisible: boolean, updateActive = false) => {
      // A recycled view can finish disappearing after a filter replaced its data.
      if (!indicesRef.current.has(key)) return;
      if (isVisible) visible.current.add(key);
      else visible.current.delete(key);
      const currentRows = rowsRef.current;
      let first = -1;
      let last = -1;
      for (const visibleKey of visible.current) {
        const index = indicesRef.current.get(visibleKey);
        if (index === undefined) continue;
        if (first === -1 || index < first) first = index;
        last = Math.max(last, index);
      }
      const range = rangeForRows(currentRows, first, last);
      if (!range) return;
      const signature = `${range.first}:${range.last}`;
      if (reported.current !== signature) {
        reported.current = signature;
        latest.current.onVisibleRangeChange?.(range);
      }
      if (updateActive) reportActive(range.first);
    },
    [reportActive]
  );

  useLayoutEffect(() => {
    const keys = new Set(rows.map((row) => row.key));
    for (const key of visible.current) if (!keys.has(key)) visible.current.delete(key);
    reported.current = "";
    if (props.data.length === 0) activeIndex.current = -1;
    const first = visible.current.values().next().value;
    if (first !== undefined) reportVisible(first, true);
  }, [rows, props.data.length, reportVisible]);

  return { rows, columns, latest, reportVisible, reportActive, reportScrolled };
}

export function GridRow<T>({
  row,
  columns,
  renderItem,
  itemSize,
}: {
  row: ListRow<T>;
  columns: number;
  renderItem: RecyclingListProps<T>["renderItem"];
  itemSize?: number;
}) {
  return (
    <View style={{ flexDirection: "row", width: itemSize ?? "100%", alignItems: "stretch" }}>
      {row.cells.map((cell) => (
        // Keys reset item-local state when Expo reassigns a recycled slot.
        <View key={cell.key} style={{ flex: 1, minWidth: 0 }}>
          {renderItem({ item: cell.item, index: cell.index })}
        </View>
      ))}
      {Array.from({ length: columns - row.cells.length }, (_, index) => (
        <View key={`empty-${index}`} style={{ flex: 1 }} />
      ))}
    </View>
  );
}

/** Pin hosted Yoga rows to the measured cross-axis size; percentage widths can feed back through native measurement. */
export function useListViewport(contentPadding: RecyclingListProps<unknown>["contentPadding"]) {
  const windowSize = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setMeasuredWidth(event.nativeEvent.layout.width),
    []
  );
  const rowWidth = Math.max(
    0,
    (measuredWidth ?? windowSize.width) - (contentPadding?.left ?? 0) - (contentPadding?.right ?? 0)
  );
  return { rowWidth, onLayout };
}
