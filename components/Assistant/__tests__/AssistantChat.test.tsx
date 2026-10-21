import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import { AssistantChat } from "../AssistantChat";
import { TEST_IDS } from "~/constants/test-ids";
import type { CookingAgent } from "~/lib/agent/types";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("~/hooks/useCookingAgentChat", () => ({
  useCookingAgentChat: () => ({
    messages: [],
    status: "idle",
    send: jest.fn(),
    stop: jest.fn(),
  }),
}));

jest.mock("~/utils/e2e-flags", () => ({ IS_E2E: true }));

const agent = {
  kind: "nebius",
  stream: () => (async function* () {})(),
} as CookingAgent;

it("renders a stable assistant composer above the home indicator in E2E", async () => {
  const screen = await render(<AssistantChat agent={agent} />);

  const root = screen.getByTestId(TEST_IDS.assistant.screen);
  expect(root.props.behavior).toBeUndefined();
  expect(StyleSheet.flatten(root.props.style)).toMatchObject({ flex: 1 });

  const composer = screen.getByTestId(TEST_IDS.assistant.composer);
  expect(StyleSheet.flatten(composer.props.style)).toMatchObject({ minHeight: 48 });
  expect(screen.getByTestId(TEST_IDS.assistant.list)).toBeTruthy();

  const barStyle = StyleSheet.flatten(composer.parent?.props.style);
  expect(barStyle).toMatchObject({ paddingBottom: 46, flexShrink: 0 });
});
