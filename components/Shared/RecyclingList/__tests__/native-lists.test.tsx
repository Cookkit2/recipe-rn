import React, { useState } from "react";
import { Text } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import IOSList from "../index.ios";
import AndroidList from "../index.android";
import { GridRow } from "../shared";
import { createListRows } from "../rows";

// Model a native recycling window: JS is asked for two rows, never all 10,001 items.
jest.mock("@expo/ui/swift-ui", () => {
  const React = require("react");
  const View = require("react-native").View;
  const component = (name: string) => (props: object) =>
    React.createElement(View, { ...props, testID: name });
  const each = ({ data, children, ...props }: any) =>
    React.createElement(
      View,
      { ...props, data, testID: "ios-items" },
      data.slice(0, 2).map((item: any, index: number) => children({ item, index }))
    );
  const vertical = Object.assign(component("ios-stack"), { ForEach: each });
  const horizontal = Object.assign(component("ios-horizontal"), { ForEach: each });
  return {
    Host: component("ios-host"),
    ScrollView: component("ios-scroll"),
    LazyVStack: vertical,
    LazyHStack: horizontal,
    RNHostView: component("ios-rn-host"),
    VStack: component("ios-row"),
    useNativeState: (value: unknown) => React.useRef({ value }).current,
  };
});
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
  frame: (value: unknown) => ({ type: "frame", value }),
  id: (value: unknown) => ({ type: "id", value }),
  padding: (value: unknown) => ({ type: "padding", value }),
  onAppear: (callback: unknown) => ({ type: "appear", callback }),
  onDisappear: (callback: unknown) => ({ type: "disappear", callback }),
  refreshable: (callback: unknown) => ({ type: "refresh", callback }),
  scrollTargetBehavior: (value: unknown) => ({ type: "snap", value }),
  scrollTargetLayout: () => ({ type: "targets" }),
  useScrollGeometryChange: (callback: unknown) => ({ type: "geometry", callback }),
  scrollPosition: (_state: unknown, options: object) => ({ type: "position", ...options }),
}));
jest.mock("@expo/ui/jetpack-compose", () => {
  const React = require("react");
  const View = require("react-native").View;
  const component = (name: string) => (props: object) =>
    React.createElement(View, { ...props, testID: name });
  const each = ({ data, children, ...props }: any) =>
    React.createElement(
      View,
      { ...props, data, testID: "android-items" },
      data.slice(0, 2).map((item: any, index: number) => children({ item, index }))
    );
  const vertical = Object.assign(component("android-column"), { Items: each });
  const horizontal = Object.assign(component("android-horizontal"), { Items: each });
  return {
    Host: component("android-host"),
    LazyColumn: vertical,
    LazyRow: horizontal,
    RNHostView: component("android-row"),
    PullToRefreshBox: component("android-refresh"),
  };
});
jest.mock("@expo/ui/jetpack-compose/modifiers", () => ({
  fillMaxSize: () => ({ type: "fill" }),
  fillMaxWidth: () => ({ type: "fill-width" }),
  width: (value: number) => ({ type: "width", value }),
  onGloballyPositioned: (callback: unknown) => ({ type: "layout", callback }),
  onVisibilityChanged: (callback: unknown, options: object) => ({
    type: "visibility",
    callback,
    ...options,
  }),
}));

type Item = { id: string };
const keyExtractor = (item: Item) => item.id;
const data = Array.from({ length: 10_001 }, (_, id) => ({ id: String(id) }));
const renderItem = ({ item, index }: { item: Item; index: number }) => (
  <Text>{`${item.id}:${index}`}</Text>
);
const modifier = (element: any, type: string) =>
  element.props.modifiers.find((entry: any) => entry.type === type);

it.each([
  ["ios", IOSList],
  ["android", AndroidList],
] as const)(
  "%s passes grid rows to native recycling without rendering the dataset",
  async (platform, List) => {
    const renderCell = jest.fn(renderItem);
    const screen = await render(
      <List
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderCell}
        numColumns={2}
        header={<Text>Summary</Text>}
        footer={<Text>End</Text>}
      />
    );
    expect(screen.getByTestId(`${platform}-items`).props.data).toHaveLength(5001);
    expect(renderCell).toHaveBeenCalledTimes(4);
    expect(screen.getByText("Summary")).toBeTruthy();
    expect(screen.getByText("End")).toBeTruthy();
    expect(screen.getByText("3:3")).toBeTruthy();
  }
);

it("iOS reports original item ranges and ignores callbacks from rows removed by filtering", async () => {
  const visible = jest.fn();
  const offset = jest.fn();
  const screen = await render(
    <IOSList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={2}
      onVisibleRangeChange={visible}
      onScrolledChange={offset}
    />
  );
  const oldAppear = modifier(screen.getAllByTestId("ios-row")[1], "appear").callback;
  await act(() => oldAppear());
  expect(visible).toHaveBeenLastCalledWith({ first: 2, last: 3 });
  await act(() =>
    modifier(screen.getByTestId("ios-scroll"), "geometry").callback({ contentOffsetY: 67 })
  );
  expect(offset).toHaveBeenLastCalledWith(true);
  await screen.rerender(
    <IOSList
      data={[{ id: "replacement" }]}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onVisibleRangeChange={visible}
    />
  );
  visible.mockClear();
  await act(() => oldAppear());
  expect(visible).not.toHaveBeenCalled();
});

it("iOS uses native scroll targets for snapping and active-card callbacks on iOS 17+", async () => {
  const active = jest.fn();
  const screen = await render(
    <IOSList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      horizontal
      itemSize={200}
      itemSpacing={16}
      snapToItems
      onActiveItemChange={active}
    />
  );
  const scroll = screen.getByTestId("ios-scroll");
  expect(modifier(scroll, "snap").value).toBe("viewAligned");
  await act(() => modifier(scroll, "position").onChange('["1"]'));
  expect(active).toHaveBeenLastCalledWith(1);
  await act(() => modifier(scroll, "position").onChange('["1"]'));
  expect(active).toHaveBeenCalledTimes(1);
});

it("Android forwards snapping and follows cards that are mostly visible", async () => {
  const active = jest.fn();
  const screen = await render(
    <AndroidList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      horizontal
      itemSize={200}
      itemSpacing={16}
      snapToItems
      onActiveItemChange={active}
    />
  );
  expect(screen.getByTestId("android-horizontal").props.snapToItems).toBe(true);
  const visibility = modifier(screen.getAllByTestId("android-row")[1], "visibility");
  expect(visibility.minFractionVisible).toBe(0.6);
  await act(() => visibility.callback(true));
  expect(active).toHaveBeenLastCalledWith(1);
});

it("Android keeps the refresh indicator active until the refetch settles", async () => {
  let finish!: () => void;
  const refresh = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(
    <AndroidList
      data={[]}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onRefresh={refresh}
      empty={<Text>Empty</Text>}
    />
  );
  expect(screen.getByText("Empty")).toBeTruthy();
  await fireEvent(screen.getByTestId("android-refresh"), "refresh");
  expect(screen.getByTestId("android-refresh").props.isRefreshing).toBe(true);
  await act(async () => {
    finish();
  });
  expect(screen.getByTestId("android-refresh").props.isRefreshing).toBe(false);
});

it("resets item-local state when a recycled slot is assigned another item", async () => {
  function Cell({ item }: { item: Item }) {
    const [count, setCount] = useState(0);
    return <Text onPress={() => setCount(count + 1)}>{`${item.id}:${count}`}</Text>;
  }
  const cell = ({ item }: { item: Item }) => <Cell item={item} />;
  const row = (id: string) => createListRows([{ id }], 2, keyExtractor)[0]!;
  const screen = await render(<GridRow row={row("a")} columns={2} renderItem={cell} />);
  await fireEvent.press(screen.getByText("a:0"));
  expect(screen.getByText("a:1")).toBeTruthy();
  await screen.rerender(<GridRow row={row("b")} columns={2} renderItem={cell} />);
  expect(screen.getByText("b:0")).toBeTruthy();
});

it.each([
  ["ios", IOSList],
  ["android", AndroidList],
] as const)(
  "%s pins hosted grid width to its actual viewport after a layout change",
  async (_platform, List) => {
    const screen = await render(
      <List
        testID="viewport"
        data={data.slice(0, 3)}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        contentPadding={{ left: 12, right: 12 }}
      />
    );
    await fireEvent(screen.getByTestId("viewport"), "layout", {
      nativeEvent: { layout: { width: 320, height: 600, x: 0, y: 0 } },
    });
    // Percentage-based hosted rows fed back into native measurement and distorted card widths.
    for (const index of [0, 2]) {
      const row = screen.getByText(`${index}:${index}`).parent?.parent;
      expect(row?.props.style.width).toBe(296);
      expect(row?.children).toHaveLength(2);
    }
  }
);
