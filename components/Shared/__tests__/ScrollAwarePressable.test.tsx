import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import ScrollAwarePressable from "../ScrollAwarePressable";

const touch = (pageX: number, pageY: number) => ({
  nativeEvent: { identifier: 0, pageX, pageY },
  preventDefault: jest.fn(),
});

it.each(["before", "after"])(
  "ignores a press delivered %s touch-end after the native list scrolls",
  async (order) => {
    const onPress = jest.fn();
    const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
    const card = screen.getByTestId("card");
    await fireEvent(card, "touchStart", touch(50, 424));
    await fireEvent(card, "touchMove", touch(50, 350));
    const release = touch(50, 350);
    if (order === "after") await fireEvent(card, "touchEnd", release);
    await fireEvent.press(card, release);
    if (order === "before") await fireEvent(card, "touchEnd", release);
    expect(onPress).not.toHaveBeenCalled();
  }
);

it("keeps a drag cancelled when the finger returns to its starting point", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent(card, "touchMove", touch(80, 100));
  await fireEvent(card, "touchMove", touch(50, 100));
  await fireEvent.press(card, touch(50, 100));
  expect(onPress).not.toHaveBeenCalled();
});

it("checks release coordinates even when a move event is omitted", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent.press(card, touch(50, 180));
  expect(onPress).not.toHaveBeenCalled();
});

it("allows a small finger movement and a fresh tap after a cancelled drag", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent(card, "touchMove", touch(50, 180));
  await fireEvent(card, "touchCancel", touch(50, 180));
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent(card, "touchMove", touch(53, 104));
  await fireEvent(card, "touchEnd", touch(53, 104));
  await fireEvent.press(card, touch(53, 104));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it("allows accessibility activation without touch coordinates after a drag", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent(card, "touchMove", touch(50, 180));
  await fireEvent.press(card, { nativeEvent: { identifier: undefined } });
  expect(onPress).toHaveBeenCalledTimes(1);
});

it("allows a fresh press-in after native navigation cancels the previous touch", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent(card, "touchCancel", touch(50, 100));

  // A returning native-hosted row can resume at responder activation.
  await fireEvent(card, "pressIn", touch(50, 200));
  const release = touch(50, 200);
  await fireEvent.press(card, release);
  expect(release.preventDefault).not.toHaveBeenCalled();
  expect(onPress).toHaveBeenCalledTimes(1);
});

it("ignores late native cancellation after a handled press before the next activation", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent.press(card, touch(50, 100));
  await fireEvent(card, "touchCancel", touch(50, 100));

  await fireEvent(card, "pressIn", touch(50, 100));
  await fireEvent.press(card, touch(50, 100));
  expect(onPress).toHaveBeenCalledTimes(2);
});

it("keeps an active drag cancelled when the finger re-enters the card", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent(card, "touchMove", touch(50, 180));
  await fireEvent(card, "pressIn", touch(50, 100));
  await fireEvent.press(card, touch(50, 100));
  expect(onPress).not.toHaveBeenCalled();
});

it("does not revive a drag when delayed press-in arrives on release", async () => {
  const onPress = jest.fn();
  const screen = await render(<ScrollAwarePressable testID="card" onPress={onPress} />);
  const card = screen.getByTestId("card");
  await fireEvent(card, "touchStart", touch(50, 100));
  await fireEvent(card, "touchMove", touch(50, 180));
  const release = {
    ...touch(50, 180),
    nativeEvent: { ...touch(50, 180).nativeEvent, touches: [] },
  };
  await fireEvent(card, "touchEnd", release);
  await fireEvent(card, "pressIn", release);
  await fireEvent.press(card, release);
  expect(onPress).not.toHaveBeenCalled();
});
