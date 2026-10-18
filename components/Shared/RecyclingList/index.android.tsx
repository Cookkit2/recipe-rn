import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { Host, LazyColumn, LazyRow, PullToRefreshBox, RNHostView } from "@expo/ui/jetpack-compose";
import {
  fillMaxSize,
  fillMaxWidth,
  onGloballyPositioned,
  onVisibilityChanged,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { GridRow, useListRows, useListViewport } from "./shared";
import type { ListRow } from "./rows";
import type { RecyclingListProps } from "./types";

export type { RecyclingListProps, VisibleRange } from "./types";

export default function RecyclingList<T>(props: RecyclingListProps<T>) {
  const { rows, columns, latest, reportVisible, reportScrolled } = useListRows(props);
  const [refreshing, setRefreshing] = useState(false);
  const containerTop = useRef(0);
  const headerHeight = useRef(0);
  const horizontal = !!props.horizontal;
  const viewport = useListViewport(props.contentPadding);
  const rowWidth = horizontal ? props.itemSize : viewport.rowWidth;
  if (horizontal && !(props.itemSize && props.itemSize > 0))
    throw new Error("Horizontal RecyclingList requires itemSize.");
  const refresh = useCallback(async () => {
    if (refreshing || !latest.current.onRefresh) return;
    setRefreshing(true);
    try {
      await latest.current.onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [latest, refreshing]);
  const renderRow = useCallback(
    ({ item, index }: { item: ListRow<T>; index: number }) => (
      <RNHostView
        key={item.key}
        matchContents={horizontal ? { horizontal: true } : { vertical: true }}
        modifiers={[
          horizontal ? width(props.itemSize!) : fillMaxWidth(),
          onVisibilityChanged(
            (visible) => {
              reportVisible(item.key, visible, horizontal);
            },
            { minFractionVisible: horizontal ? 0.6 : 0.01 }
          ),
          ...(!horizontal && index === 0
            ? [
                onGloballyPositioned((layout) => {
                  const offset =
                    containerTop.current +
                    (props.contentPadding?.top ?? 0) +
                    headerHeight.current -
                    layout.y;
                  reportScrolled(offset > 10);
                }),
              ]
            : []),
        ]}
      >
        <GridRow row={item} columns={columns} itemSize={rowWidth} renderItem={props.renderItem} />
      </RNHostView>
    ),
    [
      horizontal,
      columns,
      props.itemSize,
      rowWidth,
      props.renderItem,
      props.estimatedItemSize,
      props.contentPadding?.top,
      latest,
      reportVisible,
      reportScrolled,
    ]
  );
  const insets = props.contentPadding;
  const contentPadding = {
    start: insets?.left ?? 0,
    end: insets?.right ?? 0,
    top: insets?.top ?? 0,
    bottom: insets?.bottom ?? 0,
  };
  const column = (
    <LazyColumn
      contentPadding={contentPadding}
      verticalArrangement={{ spacedBy: props.itemSpacing ?? 0 }}
      modifiers={[
        fillMaxSize(),
        onGloballyPositioned((layout) => {
          containerTop.current = layout.y;
        }),
      ]}
    >
      {props.header && (
        <RNHostView
          matchContents={{ vertical: true }}
          modifiers={[fillMaxWidth()]}
          onLayout={(event) => {
            headerHeight.current = event.nativeEvent.layout.height;
          }}
        >
          {props.header}
        </RNHostView>
      )}
      {rows.length ? (
        <LazyColumn.Items
          data={rows}
          keyExtractor={(row) => row.key}
          estimatedItemSize={props.estimatedItemSize ?? 250}
          overscanCount={props.overscanCount ?? 4}
        >
          {renderRow}
        </LazyColumn.Items>
      ) : (
        props.empty && (
          <RNHostView matchContents={{ vertical: true }} modifiers={[fillMaxWidth()]}>
            {props.empty}
          </RNHostView>
        )
      )}
      {props.footer && (
        <RNHostView matchContents={{ vertical: true }} modifiers={[fillMaxWidth()]}>
          {props.footer}
        </RNHostView>
      )}
    </LazyColumn>
  );
  return (
    <View
      testID={props.testID}
      onLayout={viewport.onLayout}
      className={props.className}
      style={[horizontal ? undefined : { flex: 1 }, props.style]}
    >
      <Host style={{ flex: 1 }}>
        {horizontal ? (
          <LazyRow
            contentPadding={contentPadding}
            horizontalArrangement={{ spacedBy: props.itemSpacing ?? 0 }}
            snapToItems={props.snapToItems}
            modifiers={[fillMaxSize()]}
          >
            <LazyRow.Items
              data={rows}
              keyExtractor={(row) => row.key}
              estimatedItemSize={props.itemSize!}
              overscanCount={props.overscanCount ?? 4}
            >
              {renderRow}
            </LazyRow.Items>
          </LazyRow>
        ) : props.onRefresh ? (
          <PullToRefreshBox
            isRefreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            modifiers={[fillMaxSize()]}
          >
            {column}
          </PullToRefreshBox>
        ) : (
          column
        )}
      </Host>
    </View>
  );
}
