import { describe, it, expect, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";
import PoweredByAI from "~/components/Shared/PoweredByAI";

// Mock dependencies
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({
    primary: "#0000FF",
    primaryForeground: "#FFFFFF",
  }),
}));

jest.mock("lucide-uniwind", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SparkleIcon: (props: any) => React.createElement(View, { testID: "sparkle-icon", ...props }),
  };
});

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: (props: any) =>
      React.createElement(View, { testID: "linear-gradient", ...props }),
  };
});

describe("PoweredByAI", () => {
  it("should render correctly", () => {
    const { getByText, getByTestId } = render(<PoweredByAI />);

    expect(getByText("Powered by")).toBeTruthy();
    expect(getByText("AI")).toBeTruthy();
    expect(getByTestId("sparkle-icon")).toBeTruthy();
    expect(getByTestId("linear-gradient")).toBeTruthy();
  });

  it("should pass correct colors to LinearGradient and SparkleIcon", () => {
    const { getByTestId } = render(<PoweredByAI />);

    const gradient = getByTestId("linear-gradient");
    expect(gradient.props.colors).toEqual(["#0000FF", "#FF6F4B"]);

    const sparkle = getByTestId("sparkle-icon");
    expect(sparkle.props.color).toBe("#FFFFFF");
  });
});
